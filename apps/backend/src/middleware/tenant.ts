import type { Request } from "express";

export function scopedOrgId(req: Request) {
  if (!req.user) {
    throw new Error("Authentication required");
  }

  if (req.user.role === "superadmin") {
    return typeof req.query.orgId === "string" ? req.query.orgId : req.user.orgId;
  }

  return req.user.orgId;
}
