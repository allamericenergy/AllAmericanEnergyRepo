import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
export async function deleteCompanies(ids) {
    return prisma.$transaction(async (tx) => {
        const companies = await tx.$queryRaw(Prisma.sql `
      SELECT [id] FROM dbo.tblCompany WITH (UPDLOCK, HOLDLOCK)
      WHERE [id] IN (${Prisma.join(ids)}) AND [isDeleted] = 0
    `);
        if (companies.length !== ids.length)
            return { error: "One or more companies were not found or were already deleted.", status: 404 };
        const children = await tx.$queryRaw(Prisma.sql `
      SELECT [id] FROM dbo.tblCompany WITH (UPDLOCK, HOLDLOCK)
      WHERE [ParentCompanyID] IN (${Prisma.join(ids)})
        AND [id] NOT IN (${Prisma.join(ids)}) AND [isDeleted] = 0
    `);
        if (children.length)
            return { error: "Select all subcompanies too, or delete them first.", status: 409 };
        const deleted = await tx.$executeRaw(Prisma.sql `
      UPDATE dbo.tblCompany SET [isDeleted] = 1, [updatedAt] = ${new Date()}
      WHERE [id] IN (${Prisma.join(ids)}) AND [isDeleted] = 0
    `);
        return { deleted };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
