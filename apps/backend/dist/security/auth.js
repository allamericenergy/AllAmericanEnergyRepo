import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
export async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}
export function signAccessToken(user) {
    return jwt.sign(user, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL });
}
export async function createRefreshToken(userId, rememberMe = false, context) {
    const token = crypto.randomBytes(48).toString("hex");
    const tokenHash = await bcrypt.hash(token, 12);
    const ttlDays = rememberMe ? env.REFRESH_TOKEN_TTL_DAYS : Math.min(env.REFRESH_TOKEN_TTL_DAYS, 7);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
        data: { userId, tokenHash, rememberMe, ip: context?.ip, userAgent: context?.userAgent, expiresAt }
    });
    return token;
}
export async function validateRefreshToken(userId, token) {
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
export function verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
}
