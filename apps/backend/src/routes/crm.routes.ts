import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { scopedOrgId } from "../middleware/tenant.js";
import { prisma } from "../db/prisma.js";

export const crmRoutes = Router();

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

crmRoutes.use(authenticate);

function pagination(query: unknown) {
  const { page, pageSize } = pageSchema.parse(query);
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

crmRoutes.get("/companies", authorize("company:read"), async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = pagination(req.query);
    const orgId = scopedOrgId(req);
    const [data, total] = await Promise.all([
      prisma.company.findMany({ where: { orgId: orgId ?? undefined }, skip, take, orderBy: { createdAt: "desc" } }),
      prisma.company.count({ where: { orgId: orgId ?? undefined } })
    ]);
    return res.json({ data, page, pageSize, total });
  } catch (error) {
    return next(error);
  }
});

crmRoutes.post("/companies", authorize("company:create"), async (req, res, next) => {
  try {
    const input = z.object({ name: z.string().min(1), industry: z.string().optional(), phone: z.string().optional(), website: z.string().optional() }).parse(req.body);
    const orgId = scopedOrgId(req);
    if (!orgId) return res.status(400).json({ error: "orgId is required" });
    const data = await prisma.company.create({ data: { ...input, orgId } });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
});

crmRoutes.get("/contacts", authorize("contact:read"), async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = pagination(req.query);
    const orgId = scopedOrgId(req);
    const [data, total] = await Promise.all([
      prisma.contact.findMany({ where: { orgId: orgId ?? undefined }, skip, take, orderBy: { createdAt: "desc" } }),
      prisma.contact.count({ where: { orgId: orgId ?? undefined } })
    ]);
    return res.json({ data, page, pageSize, total });
  } catch (error) {
    return next(error);
  }
});

crmRoutes.post("/contacts", authorize("contact:create"), async (req, res, next) => {
  try {
    const input = z.object({
      companyId: z.string().optional(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.string().optional()
    }).parse(req.body);
    const orgId = scopedOrgId(req);
    if (!orgId) return res.status(400).json({ error: "orgId is required" });
    const data = await prisma.contact.create({ data: { ...input, orgId } });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
});

crmRoutes.get("/deals", authorize("deal:read"), async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = pagination(req.query);
    const orgId = scopedOrgId(req);
    const [data, total] = await Promise.all([
      prisma.deal.findMany({ where: { orgId: orgId ?? undefined }, skip, take, orderBy: { createdAt: "desc" } }),
      prisma.deal.count({ where: { orgId: orgId ?? undefined } })
    ]);
    return res.json({ data, page, pageSize, total });
  } catch (error) {
    return next(error);
  }
});

crmRoutes.post("/deals", authorize("deal:create"), async (req, res, next) => {
  try {
    const input = z.object({
      companyId: z.string().optional(),
      contactId: z.string().optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      amount: z.coerce.number().default(0),
      stage: z.enum(["prospecting", "qualification", "proposal", "negotiation", "won", "lost"]).default("prospecting"),
      probability: z.coerce.number().int().min(0).max(100).default(10),
      closeDate: z.coerce.date().optional()
    }).parse(req.body);
    const orgId = scopedOrgId(req);
    if (!orgId) return res.status(400).json({ error: "orgId is required" });
    const data = await prisma.deal.create({ data: { ...input, orgId, ownerId: req.user!.id } });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
});

crmRoutes.get("/tasks", authorize("task:read"), async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = pagination(req.query);
    const orgId = scopedOrgId(req);
    const [data, total] = await Promise.all([
      prisma.task.findMany({ where: { orgId: orgId ?? undefined }, skip, take, orderBy: { createdAt: "desc" } }),
      prisma.task.count({ where: { orgId: orgId ?? undefined } })
    ]);
    return res.json({ data, page, pageSize, total });
  } catch (error) {
    return next(error);
  }
});

crmRoutes.post("/tasks", authorize("task:create"), async (req, res, next) => {
  try {
    const input = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.coerce.date().optional(),
      assigneeId: z.string().optional(),
      relatedType: z.string().optional(),
      relatedId: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium")
    }).parse(req.body);
    const orgId = scopedOrgId(req);
    if (!orgId) return res.status(400).json({ error: "orgId is required" });
    const data = await prisma.task.create({ data: { ...input, orgId } });
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
});
