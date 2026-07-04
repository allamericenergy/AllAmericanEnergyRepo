import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { scopedOrgId } from "../middleware/tenant.js";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { demoAuditLogs, demoDeals } from "../demo/demoData.js";

export const reportsRoutes = Router();

reportsRoutes.use(authenticate);

reportsRoutes.get("/pipeline", authorize("report:read"), async (req, res, next) => {
  try {
    if (env.DEMO_MODE) {
      const stages = new Map<string, { stage: string; _count: { id: number }; _sum: { amount: number } }>();
      for (const deal of demoDeals) {
        const current = stages.get(deal.stage) ?? { stage: deal.stage, _count: { id: 0 }, _sum: { amount: 0 } };
        current._count.id += 1;
        current._sum.amount += deal.amount;
        stages.set(deal.stage, current);
      }
      return res.json({ data: [...stages.values()] });
    }

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
    if (env.DEMO_MODE) {
      return res.json({ data: demoAuditLogs });
    }

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
