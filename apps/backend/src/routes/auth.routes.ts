import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { env } from "../config/env.js";
import { demoCredentials, demoRefreshToken, demoUser } from "../demo/demoData.js";
import { authService } from "../application/auth/authService.js";
import { signAccessToken } from "../security/auth.js";

const roleSchema = z.enum(["superadmin", "admin", "member", "user"]);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().default(false)
});

const refreshSchema = z.object({
  userId: z.string().min(1),
  refreshToken: z.string().min(32)
});

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3).optional(),
  phone: z.string().optional(),
  password: z.string().min(12),
  role: roleSchema.default("user"),
  orgId: z.string().optional()
});

const passwordResetRequestSchema = z.object({
  email: z.string().email()
});

const passwordResetSchema = z.object({
  email: z.string().email(),
  token: z.string().min(16),
  newPassword: z.string().min(12)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12)
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(16)
});

export const authRoutes = Router();

function requestContext(req: { ip?: string; header(name: string): string | undefined }) {
  return {
    ip: req.ip,
    userAgent: req.header("user-agent")
  };
}

authRoutes.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    if (env.DEMO_MODE) {
      if (input.email !== demoCredentials.email || input.password !== demoCredentials.password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      return res.json({ accessToken: signAccessToken(demoUser), refreshToken: demoRefreshToken(), user: demoUser });
    }

    return res.json(await authService.login(input, requestContext(req)));
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    if (input.role !== "user") {
      return res.status(403).json({ error: "Public registration is only enabled for User accounts" });
    }
    const result = await authService.register({ ...input, role: "user" }, requestContext(req));
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/admin/register", authenticate, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register({ ...input, createdBy: req.user }, requestContext(req));
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/refresh", async (req, res, next) => {
  try {
    const input = refreshSchema.parse(req.body);
    if (env.DEMO_MODE && input.userId === demoUser.id) {
      return res.json({ accessToken: signAccessToken(demoUser) });
    }
    return res.json(await authService.refresh(input.userId, input.refreshToken, requestContext(req)));
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/logout", authenticate, async (req, res, next) => {
  try {
    if (!env.DEMO_MODE) await authService.logout(req.user!.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/request-password-reset", async (req, res, next) => {
  try {
    const input = passwordResetRequestSchema.parse(req.body);
    const result = env.DEMO_MODE ? { accepted: true } : await authService.requestPasswordReset(input.email, requestContext(req));
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/reset-password", async (req, res, next) => {
  try {
    const input = passwordResetSchema.parse(req.body);
    if (!env.DEMO_MODE) await authService.resetPassword(input.email, input.token, input.newPassword, requestContext(req));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/change-password", authenticate, async (req, res, next) => {
  try {
    const input = changePasswordSchema.parse(req.body);
    if (!env.DEMO_MODE) await authService.changePassword(req.user!.id, input.currentPassword, input.newPassword, requestContext(req));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/verify-email", async (req, res, next) => {
  try {
    const input = verifyEmailSchema.parse(req.body);
    if (!env.DEMO_MODE) await authService.verifyEmail(input.email, input.token, requestContext(req));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
