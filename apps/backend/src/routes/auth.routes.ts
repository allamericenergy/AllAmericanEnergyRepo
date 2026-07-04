import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import {
  createRefreshToken,
  signAccessToken,
  validateRefreshToken,
  verifyPassword
} from "../security/auth.js";
import { authenticate } from "../middleware/authenticate.js";
import { env } from "../config/env.js";
import { demoCredentials, demoRefreshToken, demoUser } from "../demo/demoData.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  userId: z.string().min(1),
  refreshToken: z.string().min(32)
});

export const authRoutes = Router();

authRoutes.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    if (env.DEMO_MODE) {
      if (input.email !== demoCredentials.email || input.password !== demoCredentials.password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      return res.json({
        accessToken: signAccessToken(demoUser),
        refreshToken: demoRefreshToken(),
        user: demoUser
      });
    }

    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user || user.status !== "active" || !(await verifyPassword(input.password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const principal = { id: user.id, email: user.email, role: user.role, orgId: user.orgId };
    const accessToken = signAccessToken(principal);
    const refreshToken = await createRefreshToken(user.id);

    return res.json({ accessToken, refreshToken, user: principal });
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

    const refreshToken = await validateRefreshToken(input.userId, input.refreshToken);

    if (!refreshToken) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });
    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, orgId: user.orgId });
    return res.json({ accessToken });
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/logout", authenticate, async (req, res, next) => {
  try {
    if (env.DEMO_MODE) {
      return res.status(204).send();
    }

    await prisma.refreshToken.updateMany({ where: { userId: req.user!.id }, data: { revoked: true } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/request-password-reset", (_req, res) => {
  return res.status(202).json({ message: "If the account exists, a reset email will be sent." });
});

authRoutes.post("/reset-password", (_req, res) => {
  return res.status(202).json({ message: "Password reset endpoint scaffolded. Wire email token verification before production." });
});
