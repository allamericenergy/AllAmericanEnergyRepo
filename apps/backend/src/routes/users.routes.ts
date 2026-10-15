import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { prisma } from "../db/prisma.js";
import { permissionMatrix, type Role } from "../security/permissions.js";
import { permissionService } from "../application/auth/permissionService.js";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["admin", "member", "user"]),
  orgId: z.string().optional()
});

const nullableProfileText = (maxLength: number) => z.union([
  z.string().trim().max(maxLength),
  z.null()
]).optional().transform((value) => value === "" ? null : value);

const profilePhoto = z.union([
  z.string()
    .max(500_000, "Profile photo is too large")
    .refine(
      (value) => /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
      "Profile photo must be a JPEG, PNG, or WebP image"
    ),
  z.null()
]).optional();

const updateMyAccountSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100).optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(100).optional(),
  phone: nullableProfileText(50),
  company: nullableProfileText(200),
  department: nullableProfileText(200),
  designation: nullableProfileText(200),
  profilePhotoUrl: profilePhoto
}).strict().refine((input) => Object.keys(input).length > 0, "Provide at least one account field to update");

export const usersRoutes = Router();

usersRoutes.use(authenticate);

usersRoutes.get("/me", async (req, res, next) => {
  try {
    const role = req.user!.role as Role;
    const [permissions, account] = await Promise.all([
      permissionService.permissionsForUser(req.user!.id, role),
      prisma.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          company: true,
          department: true,
          designation: true,
          profilePhotoUrl: true,
          role: true,
          status: true,
          orgId: true,
          mustChangePassword: true,
          lastLogin: true,
          createdAt: true,
          organization: { select: { name: true } }
        }
      })
    ]);
    const { organization, ...profile } = account;
    return res.json({
      user: { ...profile, organizationName: organization?.name ?? null },
      permissions: permissions.length > 0 ? permissions : permissionMatrix[role]
    });
  } catch (error) {
    return next(error);
  }
});

usersRoutes.patch("/me", async (req, res, next) => {
  try {
    const input = updateMyAccountSchema.parse(req.body);
    const account = await prisma.user.update({
      where: { id: req.user!.id },
      data: { ...input, updatedBy: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        company: true,
        department: true,
        designation: true,
        profilePhotoUrl: true,
        role: true,
        status: true,
        orgId: true,
        mustChangePassword: true,
        lastLogin: true,
        createdAt: true,
        organization: { select: { name: true } }
      }
    });
    const { organization, ...profile } = account;
    return res.json({ user: { ...profile, organizationName: organization?.name ?? null } });
  } catch (error) {
    return next(error);
  }
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
