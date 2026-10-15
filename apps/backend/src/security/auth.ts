import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import type { Role } from "./permissions.js";

export interface AuthPrincipal {
  id: string;
  email: string;
  role: Role;
  orgId: string | null;
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signAccessToken(user: AuthPrincipal) {
  return jwt.sign(user, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"] });
}

export async function createRefreshToken(userId: string, rememberMe = false, context?: { ip?: string; userAgent?: string }) {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = await bcrypt.hash(token, 12);
  const ttlDays = rememberMe ? env.REFRESH_TOKEN_TTL_DAYS : Math.min(env.REFRESH_TOKEN_TTL_DAYS, 7);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, rememberMe, ip: context?.ip, userAgent: context?.userAgent, expiresAt }
  });

  return token;
}

export async function validateRefreshToken(userId: string, token: string) {
  const tokens = await prisma.refreshToken.findMany({
    where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  for (const stored of tokens) {
    if (await bcrypt.compare(token, stored.tokenHash)) {
      return stored;
    }
  }

  return null;
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPrincipal;
}
