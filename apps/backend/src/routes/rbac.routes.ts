import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { permissionService } from "../application/auth/permissionService.js";
import { permissionMatrix } from "../security/permissions.js";

export const rbacRoutes = Router();

rbacRoutes.use(authenticate);

function routeId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

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

rbacRoutes.get("/admin-requests", authorize("Users.Manage"), async (_req, res, next) => {
  try {
    const data = await prisma.user.findMany({
      where: { role: "admin", status: { in: ["pending_approval", "rejected"] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        department: true,
        designation: true,
        profilePhotoUrl: true,
        documents: true,
        status: true,
        rejectionReason: true,
        rejectionMessage: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

rbacRoutes.post("/admin-requests/:id/approve", authorize("Users.Manage"), async (req, res, next) => {
  try {
    if (req.user!.role !== "superadmin") return res.status(403).json({ error: "Only Super Admin can approve Admin requests" });
    const input = z.object({ notes: z.string().optional() }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: routeId(req.params.id) },
      data: {
        status: "active",
        emailVerified: true,
        approvedBy: req.user!.id,
        approvedAt: new Date(),
        approvalNotes: input.notes,
        employeeCode: `ADM-${Date.now().toString().slice(-6)}`
      }
    });

    const role = await prisma.authRole.findFirst({ where: { orgId: user.orgId, name: "admin" } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id, assignedBy: req.user!.id }
      });
    }

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "Approval",
        title: "Congratulations!",
        message: "Your Admin account has been approved. You can now log in using your credentials.",
        actionUrl: "/login"
      }
    });
    await prisma.registrationMessage.create({ data: { userId: user.id, senderId: req.user!.id, senderRole: req.user!.role, message: "Your registration has been approved. Welcome to the platform." } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, orgId: user.orgId, action: "AdminRegistration.Approved", module: "Users", objectType: "User", objectId: user.id, newValue: JSON.stringify({ status: "active", notes: input.notes }) } });

    return res.json({ data: user, permissions: permissionMatrix.admin });
  } catch (error) {
    return next(error);
  }
});

rbacRoutes.post("/admin-requests/:id/reject", authorize("Users.Manage"), async (req, res, next) => {
  try {
    if (req.user!.role !== "superadmin") return res.status(403).json({ error: "Only Super Admin can reject Admin requests" });
    const input = z.object({ reason: z.string().min(1), message: z.string().optional() }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: routeId(req.params.id) },
      data: { status: "rejected", rejectionReason: input.reason, rejectionMessage: input.message, updatedBy: req.user!.id }
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "Rejection",
        title: "Your registration request has been rejected.",
        message: `Reason: ${input.reason}${input.message ? `\n${input.message}` : ""}`,
        actionUrl: "/register"
      }
    });
    await prisma.registrationMessage.create({ data: { userId: user.id, senderId: req.user!.id, senderRole: req.user!.role, message: input.message ?? input.reason } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, orgId: user.orgId, action: "AdminRegistration.Rejected", module: "Users", objectType: "User", objectId: user.id, newValue: JSON.stringify(input) } });
    return res.json({ data: user });
  } catch (error) {
    return next(error);
  }
});

rbacRoutes.post("/admin-requests/:id/message", authorize("Users.Manage"), async (req, res, next) => {
  try {
    const input = z.object({ message: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: routeId(req.params.id) } });
    const data = await prisma.registrationMessage.create({ data: { userId: user.id, senderId: req.user!.id, senderRole: req.user!.role, message: input.message } });
    await prisma.notification.create({ data: { userId: user.id, type: "Messages", title: "Message from Super Admin", message: input.message } });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
});

rbacRoutes.get("/notifications", async (req, res, next) => {
  try {
    const data = await prisma.notification.findMany({ where: { userId: req.user!.id, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 100 });
    const unreadCount = data.filter((item) => !item.readAt).length;
    return res.json({ data, unreadCount });
  } catch (error) {
    return next(error);
  }
});

rbacRoutes.post("/notifications/:id/read", async (req, res, next) => {
  try {
    const data = await prisma.notification.update({ where: { id: req.params.id }, data: { readAt: new Date() } });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});
