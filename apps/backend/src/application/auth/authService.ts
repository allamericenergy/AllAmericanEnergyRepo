import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma.js";
import {
  createRefreshToken,
  signAccessToken,
  validateRefreshToken,
  verifyPassword,
  type AuthPrincipal
} from "../../security/auth.js";
import { validatePasswordPolicy, wasPasswordReused } from "../../security/passwordPolicy.js";
import type { Role } from "../../security/permissions.js";

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 30;
const RESET_TOKEN_MINUTES = 30;
const EMAIL_TOKEN_HOURS = 24;

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  phone?: string;
  company?: string;
  department?: string;
  designation?: string;
  profilePhotoUrl?: string;
  documents?: string;
  password: string;
  role: Role;
  orgId?: string;
  createdBy?: AuthPrincipal;
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function toPrincipal(user: { id: string; email: string; role: string; orgId: string | null }): AuthPrincipal {
  return { id: user.id, email: user.email, role: user.role as Role, orgId: user.orgId };
}

function hashToken(token: string) {
  return bcrypt.hash(token, 12);
}

export class AuthService {
  async login(input: LoginInput, context: RequestContext) {
    const email = input.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await this.recordLogin(null, email, false, "invalid_user", context);
      throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
    }

    if (user.lockoutEnd && user.lockoutEnd > new Date()) {
      await this.recordLogin(user.id, email, false, "locked", context);
      throw Object.assign(new Error("Account is temporarily locked"), { statusCode: 423 });
    }

    if (user.status !== "active") {
      await this.recordLogin(user.id, email, false, "inactive", context);
      throw Object.assign(new Error(user.status === "pending_approval" ? "Account is pending Super Admin approval" : "Account is not active"), { statusCode: 403 });
    }

    if (!user.emailVerified) {
      await this.recordLogin(user.id, email, false, "email_unverified", context);
      throw Object.assign(new Error("Email verification required"), { statusCode: 403 });
    }

    if (!(await verifyPassword(input.password, user.passwordHash))) {
      const attempts = user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockoutEnd: attempts >= MAX_FAILED_LOGINS ? addMinutes(LOCKOUT_MINUTES) : null
        }
      });
      await this.recordLogin(user.id, email, false, "invalid_password", context);
      throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
    }

    const principal = toPrincipal(user);
    const accessToken = signAccessToken(principal);
    const refreshToken = await createRefreshToken(user.id, input.rememberMe, context);
    const storedRefreshToken = await validateRefreshToken(user.id, refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockoutEnd: null, lastLogin: new Date() }
    });

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenId: storedRefreshToken?.id,
        ip: context.ip,
        userAgent: context.userAgent,
        expiresAt: storedRefreshToken?.expiresAt ?? addMinutes(15)
      }
    });

    await this.recordLogin(user.id, email, true, null, context);
    await this.audit(user.id, user.orgId, "Auth.Login", "Security", undefined, undefined, context);

    return { accessToken, refreshToken, user: principal };
  }

  async refresh(userId: string, refreshToken: string, context: RequestContext) {
    const storedRefreshToken = await validateRefreshToken(userId, refreshToken);
    if (!storedRefreshToken) throw Object.assign(new Error("Invalid refresh token"), { statusCode: 401 });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.userSession.updateMany({
      where: { refreshTokenId: storedRefreshToken.id, revokedAt: null },
      data: { lastSeenAt: new Date(), ip: context.ip, userAgent: context.userAgent }
    });

    return { accessToken: signAccessToken(toPrincipal(user)) };
  }

  async logout(userId: string) {
    await prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true, revokedAt: new Date() } });
    await prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async register(input: RegisterInput, context: RequestContext) {
    this.assertRegistrationAllowed(input.role, input.createdBy?.role);
    const policy = validatePasswordPolicy(input.password);
    if (!policy.valid) throw Object.assign(new Error(policy.errors.join(" ")), { statusCode: 400 });

    const email = input.email.toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        username: input.username,
        phone: input.phone,
        company: input.company,
        department: input.department,
        designation: input.designation,
        profilePhotoUrl: input.profilePhotoUrl,
        documents: input.documents,
        passwordHash,
        role: input.role,
        status: input.role === "admin" ? "pending_approval" : input.role === "user" ? "active" : "invited",
        emailVerified: input.role === "admin" ? true : false,
        orgId: input.orgId ?? input.createdBy?.orgId,
        createdBy: input.createdBy?.id
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, orgId: true, company: true, department: true, designation: true, phone: true, createdAt: true }
    });

    await prisma.passwordHistory.create({ data: { userId: user.id, passwordHash } });
    const verificationToken = user.role === "admin" ? null : await this.createEmailVerification(user.id);
    if (user.role === "admin") await this.notifySuperadminsForAdminRequest(user.id);
    await this.audit(input.createdBy?.id, user.orgId, "Auth.Register", "Users", undefined, JSON.stringify(user), context);
    return { user, verificationToken, pendingApproval: user.status === "pending_approval" };
  }

  async requestPasswordReset(email: string, context: RequestContext) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { accepted: true };
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: await hashToken(token), expiresAt: addMinutes(RESET_TOKEN_MINUTES) }
    });
    await this.audit(user.id, user.orgId, "Auth.PasswordResetRequested", "Security", undefined, undefined, context);
    return { accepted: true, resetToken: token };
  }

  async resetPassword(email: string, token: string, newPassword: string, context: RequestContext) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    const resetTokens = await prisma.passwordResetToken.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    const matched = await this.findMatchingToken(resetTokens, token);
    if (!matched) throw Object.assign(new Error("Invalid reset token"), { statusCode: 400 });
    await this.updatePassword(user.id, newPassword, context);
    await prisma.passwordResetToken.update({ where: { id: matched.id }, data: { usedAt: new Date() } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, context: RequestContext) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw Object.assign(new Error("Current password is invalid"), { statusCode: 400 });
    }
    await this.updatePassword(user.id, newPassword, context);
  }

  async verifyEmail(email: string, token: string, context: RequestContext) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    const tokens = await prisma.emailVerification.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 5
    });
    const matched = await this.findMatchingToken(tokens, token);
    if (!matched) throw Object.assign(new Error("Invalid verification token"), { statusCode: 400 });
    await prisma.emailVerification.update({ where: { id: matched.id }, data: { usedAt: new Date() } });
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, status: "active" } });
    await this.audit(user.id, user.orgId, "Auth.EmailVerified", "Security", undefined, undefined, context);
  }

  private async updatePassword(userId: string, newPassword: string, context: RequestContext) {
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) throw Object.assign(new Error(policy.errors.join(" ")), { statusCode: 400 });
    const history = await prisma.passwordHistory.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 });
    if (await wasPasswordReused(newPassword, history.map((item: { passwordHash: string }) => item.passwordHash))) {
      throw Object.assign(new Error("Cannot reuse one of the last 5 passwords"), { statusCode: 400 });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash, updatedAt: new Date() } });
    await prisma.passwordHistory.create({ data: { userId, passwordHash } });
    await this.audit(userId, undefined, "Auth.PasswordChanged", "Security", undefined, undefined, context);
  }

  private async createEmailVerification(userId: string) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerification.create({
      data: { userId, tokenHash: await hashToken(token), expiresAt: addHours(EMAIL_TOKEN_HOURS) }
    });
    return token;
  }

  private assertRegistrationAllowed(role: Role, actorRole?: Role) {
    if (role === "superadmin" && actorRole !== "superadmin") {
      throw Object.assign(new Error("Only a Super Administrator can create another Super Administrator"), { statusCode: 403 });
    }
    if (role === "admin" && actorRole && actorRole !== "superadmin") throw Object.assign(new Error("Only a Super Administrator can create an Administrator"), { statusCode: 403 });
    if (role === "member" && actorRole !== "superadmin" && actorRole !== "admin") {
      throw Object.assign(new Error("Only an Administrator or Super Administrator can create a Member"), { statusCode: 403 });
    }
  }

  private async notifySuperadminsForAdminRequest(userId: string) {
    const applicant = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const superadmins = await prisma.user.findMany({ where: { role: "superadmin", status: "active" } });
    const message = [
      "New Admin Registration Request",
      `Name: ${applicant.firstName} ${applicant.lastName}`,
      `Company: ${applicant.company ?? "Not provided"}`,
      `Email: ${applicant.email}`,
      `Department: ${applicant.department ?? "Not provided"}`,
      "Requested Role: Admin",
      "Waiting for your approval."
    ].join("\n");

    await prisma.notification.createMany({
      data: superadmins.map((superadmin: { id: string }) => ({
        userId: superadmin.id,
        type: "Registration",
        title: "New Admin Registration Request",
        message,
        actionUrl: `/admin?requestId=${applicant.id}`
      }))
    });
  }

  private async findMatchingToken<T extends { id: string; tokenHash: string }>(tokens: T[], token: string) {
    for (const storedToken of tokens) {
      if (await bcrypt.compare(token, storedToken.tokenHash)) return storedToken;
    }
    return null;
  }

  private async recordLogin(userId: string | null, email: string, success: boolean, reason: string | null, context: RequestContext) {
    await prisma.loginHistory.create({
      data: { userId, email, success, reason, ip: context.ip, userAgent: context.userAgent }
    });
  }

  private async audit(userId: string | undefined, orgId: string | null | undefined, action: string, module: string, oldValue: string | undefined, newValue: string | undefined, context: RequestContext) {
    await prisma.auditLog.create({
      data: {
        userId,
        orgId: orgId ?? undefined,
        action,
        module,
        objectType: module,
        oldValue,
        newValue,
        ip: context.ip,
        userAgent: context.userAgent
      }
    });
  }
}

export const authService = new AuthService();
