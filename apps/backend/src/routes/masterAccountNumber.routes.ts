import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { authorize } from "../middleware/authorize.js";

export const masterAccountNumberRoutes = Router();
masterAccountNumberRoutes.use(authorize("org:administer"));

const settingSchema = z.object({
  utilityId: z.number().int().positive(),
  accountNumber: z.boolean(),
  serviceRefPodId: z.boolean(),
  masterAccountNumber: z.enum(["Account Number", "Service Ref/POD ID", "BOTH"])
});

masterAccountNumberRoutes.get("/", async (_req, res, next) => {
  try {
    const data = await prisma.$queryRaw`
      SELECT m.[id], m.[UtilityId] AS utilityId, u.[Utility] AS utilityName,
        m.[AccountNumber] AS accountNumber, m.[ServiceRefPodId] AS serviceRefPodId,
        m.[MasterAccountNumber] AS masterAccountNumber
      FROM dbo.tblMasterAccountNumber m
      INNER JOIN dbo.tbl_Utility u ON u.[id] = m.[UtilityId]
      ORDER BY u.[Utility], m.[id]
    `;
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

masterAccountNumberRoutes.put("/", async (req, res, next) => {
  try {
    const input = settingSchema.parse(req.body);
    const utilities = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT [id] FROM dbo.tbl_Utility WHERE [id] = ${input.utilityId}
    `;
    if (!utilities.length) return res.status(404).json({ error: "Utility not found." });
    await prisma.$executeRaw`
      MERGE dbo.tblMasterAccountNumber WITH (HOLDLOCK) AS target
      USING (SELECT ${input.utilityId} AS UtilityId) AS source
      ON target.[UtilityId] = source.UtilityId
      WHEN MATCHED THEN UPDATE SET
        [AccountNumber] = ${input.accountNumber}, [ServiceRefPodId] = ${input.serviceRefPodId},
        [MasterAccountNumber] = ${input.masterAccountNumber}
      WHEN NOT MATCHED THEN INSERT ([UtilityId], [AccountNumber], [ServiceRefPodId], [MasterAccountNumber])
        VALUES (${input.utilityId}, ${input.accountNumber}, ${input.serviceRefPodId}, ${input.masterAccountNumber});
    `;
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});
