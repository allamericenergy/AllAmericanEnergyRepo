import express from "express";
import request from "supertest";
import { beforeEach, expect, it, vi } from "vitest";
import { prisma } from "../db/prisma.js";
import { reportsRoutes } from "./reports.routes.js";
const tx = vi.hoisted(() => ({ $queryRaw: vi.fn(), $executeRaw: vi.fn() }));
vi.mock("../db/prisma.js", () => ({ prisma: {
        $transaction: vi.fn((callback) => callback(tx))
    } }));
vi.mock("../middleware/authenticate.js", () => ({
    authenticate: (req, _res, next) => {
        req.user = { id: "test", email: "test@example.com", role: "superadmin", orgId: null };
        next();
    }
}));
const app = express().use(express.json()).use("/reports", reportsRoutes).use((error, _req, res, _next) => {
    res.status(400).json({ error: String(error) });
});
beforeEach(() => {
    vi.clearAllMocks();
    tx.$queryRaw.mockReset();
    tx.$executeRaw.mockReset().mockResolvedValue(1);
});
it("deletes only the city's ZIP codes before deleting the city in one transaction", async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 42 }]);
    const result = await request(app).delete("/reports/location-cities/42");
    expect(result.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.calls.map(([sql, id]) => [sql.join("?"), id])).toEqual([
        ["DELETE FROM dbo.ZipCodes WHERE [CityId] = ?", 42],
        ["DELETE FROM dbo.USCities WHERE [CityId] = ?", 42]
    ]);
});
it("does not delete ZIP codes when the city is missing", async () => {
    tx.$queryRaw.mockResolvedValueOnce([]);
    expect((await request(app).delete("/reports/location-cities/42")).status).toBe(404);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
});
it("stops city deletion if deleting ZIP codes fails", async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 42 }]);
    tx.$executeRaw.mockRejectedValueOnce(new Error("ZIP deletion failed"));
    expect((await request(app).delete("/reports/location-cities/42")).status).toBe(400);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
});
