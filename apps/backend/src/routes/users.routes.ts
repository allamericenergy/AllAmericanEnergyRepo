import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { prisma } from "../db/prisma.js";
import { permissionMatrix } from "../security/permissions.js";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["admin", "member", "user"]),
  orgId: z.string().optional()
});

export const usersRoutes = Router();

usersRoutes.use(authenticate);

usersRoutes.get("/me", (req, res) => {
  return res.json({
    user: req.user,
    permissions: permissionMatrix[req.user!.role]
  });
});

usersRoutes.get("/", authorize("user:administer"), async (req, res, next) => {
  try {
    const orgId = req.user!.role === "superadmin" ? (req.query.orgId as string | undefined) : req.user!.orgId;
    const users = await prisma.user.findMany({
      where: orgId ? { orgId } : undefined,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, orgId: true }
    });
    return res.json({ data: users });
  } catch (error) {
    return next(error);
  }
});

usersRoutes.post("/", authorize("user:administer"), async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body);
    const orgId = req.user!.role === "superadmin" ? input.orgId : req.user!.orgId;

    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 12),
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        status: "active",
        orgId
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, orgId: true }
    });

    return res.status(201).json({ data: user });
  } catch (error) {
    return next(error);
  }
});
