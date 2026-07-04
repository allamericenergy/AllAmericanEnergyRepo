import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type AuthPrincipal } from "../security/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPrincipal;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
