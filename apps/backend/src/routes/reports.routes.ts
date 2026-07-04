import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { scopedOrgId } from "../middleware/tenant.js";
import { prisma } from "../db/prisma.js";

export const reportsRoutes = Router();

reportsRoutes.use(authenticate);

reportsRoutes.get("/pipeline", authorize("report:read"), async (req, res, next) => {
  try {
    const orgId = scopedOrgId(req);
    const deals = await prisma.deal.groupBy({
      by: ["stage"],
      where: { orgId: orgId ?? undefined },
      _count: { id: true },
      _sum: { amount: true }
    });

    return res.json({ data: deals });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/activity", authorize("report:read"), async (req, res, next) => {
  try {
    const orgId = scopedOrgId(req);
    const data = await prisma.auditLog.findMany({
      where: { orgId: orgId ?? undefined },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});
