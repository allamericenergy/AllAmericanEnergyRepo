import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { permissionService } from "../application/auth/permissionService.js";

export const rbacRoutes = Router();

rbacRoutes.use(authenticate);

rbacRoutes.get("/permissions", authorize("Permissions.Read"), async (_req, res, next) => {
  try {
    await permissionService.seedCatalog();
    const data = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

rbacRoutes.get("/roles", authorize("Roles.Read"), async (req, res, next) => {
  try {
    const data = await prisma.authRole.findMany({
      where: req.user!.role === "superadmin" ? undefined : { orgId: req.user!.orgId },
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: { priority: "asc" }
    });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

rbacRoutes.post("/roles", authorize("Roles.Create"), async (req, res, next) => {
  try {
    const input = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      priority: z.coerce.number().int().default(100),
      permissionIds: z.array(z.string()).default([])
    }).parse(req.body);

    const role = await prisma.authRole.create({
      data: {
        orgId: req.user!.role === "superadmin" ? null : req.user!.orgId,
        name: input.name,
        description: input.description,
        priority: input.priority,
        rolePermissions: { create: input.permissionIds.map((permissionId) => ({ permissionId })) }
      },
      include: { rolePermissions: { include: { permission: true } } }
    });

    return res.status(201).json({ data: role });
  } catch (error) {
    return next(error);
  }
});

rbacRoutes.get("/audit-logs", authorize("Audit.Read"), async (req, res, next) => {
  try {
    const data = await prisma.auditLog.findMany({
      where: req.user!.role === "superadmin" ? undefined : { orgId: req.user!.orgId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

rbacRoutes.get("/login-history", authorize("Security.Read"), async (req, res, next) => {
  try {
    const data = await prisma.loginHistory.findMany({
      where: req.user!.role === "superadmin" ? undefined : { user: { orgId: req.user!.orgId } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

rbacRoutes.get("/sessions", authenticate, async (req, res, next) => {
  try {
    const data = await prisma.userSession.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 25
    });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});
