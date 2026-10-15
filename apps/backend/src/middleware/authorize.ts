import type { NextFunction, Request, Response } from "express";
import { can, type LegacyAction, type PermissionKey } from "../security/permissions.js";

export function authorize(action: PermissionKey | LegacyAction) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!can(req.user.role, action)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };
}
