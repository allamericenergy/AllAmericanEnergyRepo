import { beforeEach, expect, it, vi } from "vitest";
import { prisma } from "../db/prisma.js";
import { deleteUtility } from "./deleteUtility.js";
vi.mock("../db/prisma.js", () => ({ prisma: { $transaction: vi.fn() } }));
const tx = { $queryRaw: vi.fn(), $executeRaw: vi.fn() };
beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx));
    tx.$queryRaw.mockResolvedValue([{ id: 7 }]);
    tx.$executeRaw.mockResolvedValue(1);
});
it("removes dependent settings and detaches business records before deleting the utility", async () => {
    expect(await deleteUtility(7)).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const queries = tx.$executeRaw.mock.calls.map(([parts]) => parts.join("?"));
    expect(queries).toEqual([
        "DELETE FROM dbo.UtilityStateProduct WHERE [UtilityId] = ?",
        "DELETE FROM dbo.tblMasterAccountNumber WHERE [UtilityId] = ?",
        "UPDATE dbo.tbl_Rate SET [UtilityId] = NULL WHERE [UtilityId] = ?",
        "UPDATE dbo.tbl_MeterList SET [UtilityId] = NULL WHERE [UtilityId] = ?",
        "DELETE FROM dbo.tbl_Utility WHERE [id] = ?"
    ]);
    tx.$executeRaw.mock.calls.forEach((call) => expect(call.slice(1)).toEqual([7]));
});
it("leaves dependencies untouched when the utility does not exist", async () => {
    tx.$queryRaw.mockResolvedValue([]);
    expect(await deleteUtility(7)).toBe(0);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
});
it("propagates failure to the transaction rather than continuing deletion", async () => {
    tx.$executeRaw.mockRejectedValueOnce(new Error("Database failure"));
    await expect(deleteUtility(7)).rejects.toThrow("Database failure");
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
});
