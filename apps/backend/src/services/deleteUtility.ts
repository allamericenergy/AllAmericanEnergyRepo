import { prisma } from "../db/prisma.js";

export async function deleteUtility(id: number): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const utility = await tx.$queryRaw<Array<{ id: number }>>`
      SELECT [id] FROM dbo.tbl_Utility WITH (UPDLOCK, HOLDLOCK) WHERE [id] = ${id}
    `;
    if (!utility.length) return 0;

    await tx.$executeRaw`DELETE FROM dbo.UtilityStateProduct WHERE [UtilityId] = ${id}`;
    await tx.$executeRaw`DELETE FROM dbo.tblMasterAccountNumber WHERE [UtilityId] = ${id}`;
    await tx.$executeRaw`UPDATE dbo.tbl_Rate SET [UtilityId] = NULL WHERE [UtilityId] = ${id}`;
    await tx.$executeRaw`UPDATE dbo.tbl_MeterList SET [UtilityId] = NULL WHERE [UtilityId] = ${id}`;
    return tx.$executeRaw`DELETE FROM dbo.tbl_Utility WHERE [id] = ${id}`;
  });
}
