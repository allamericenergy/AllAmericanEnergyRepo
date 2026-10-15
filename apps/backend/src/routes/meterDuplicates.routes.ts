import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { authorize } from "../middleware/authorize.js";

export const meterDuplicatesRoutes = Router();
meterDuplicatesRoutes.get("/", authorize("company:create"), async (req, res, next) => {
  try {
    const { field, value } = z.object({
      field: z.enum(["accountNumber", "serviceRefPod"]),
      value: z.string().trim().min(1).max(500)
    }).parse(req.query);
    const column = field === "accountNumber" ? Prisma.sql`[Account Number]` : Prisma.sql`[Service Ref/POD]`;
    // Only return existence, without exposing another company's meter details.
    const matches = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT TOP (1) [id] FROM dbo.tbl_MeterList
      WHERE LTRIM(RTRIM(${column})) = ${value}
    `);
    return res.json({ exists: matches.length > 0 });
  } catch (error) { return next(error); }
});
