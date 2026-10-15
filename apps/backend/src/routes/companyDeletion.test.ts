import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../db/prisma.js";
import { reportsRoutes } from "./reports.routes.js";

const tx = vi.hoisted(() => ({ $queryRaw: vi.fn(), $executeRaw: vi.fn() }));
vi.mock("../db/prisma.js", () => ({ prisma: {
  $transaction: vi.fn((callback) => callback(tx)),
  $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  $queryRaw: vi.fn().mockResolvedValue([])
} }));
vi.mock("../middleware/authenticate.js", () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: "test", email: "test@example.com", role: (req.header("x-role") ?? "superadmin") as "superadmin", orgId: null };
    next();
  }
}));
const app = express().use(express.json()).use("/reports", reportsRoutes).use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ error: String(error) });
});

beforeEach(() => { vi.clearAllMocks(); tx.$queryRaw.mockReset(); tx.$executeRaw.mockResolvedValue(1); });

describe("company soft deletion", () => {
  it.each(["admin", "member", "user"])("rejects single and bulk deletion by %s", async (role) => {
    expect((await request(app).delete("/reports/tbl-companies/42").set("x-role", role)).status).toBe(403);
    expect((await request(app).delete("/reports/tbl-companies/bulk").set("x-role", role).send({ ids: [42, 43] })).status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("sets the deletion flag without physically deleting a company", async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 42 }]).mockResolvedValueOnce([]);
    const result = await request(app).delete("/reports/tbl-companies/42");
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ deleted: 1 });
    const query = tx.$executeRaw.mock.calls[0][0];
    expect(query.sql).toContain("SET [isDeleted] = 1");
    expect(query.sql).not.toContain("DELETE FROM");
    expect(query.values).toContain(42);
  });
  it("deduplicates a bulk selection and updates it in one transaction", async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 42 }, { id: 43 }]).mockResolvedValueOnce([]);
    tx.$executeRaw.mockResolvedValueOnce(2);
    const result = await request(app).delete("/reports/tbl-companies/bulk").send({ ids: [42, 43, 42] });
    expect(result.body).toEqual({ deleted: 2 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.calls[0][0].values.filter((value: unknown) => typeof value === "number")).toEqual([42, 43]);
  });
  it("rejects the whole selection when a company is missing or deleted", async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 42 }]);
    expect((await request(app).delete("/reports/tbl-companies/bulk").send({ ids: [42, 43] })).status).toBe(404);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("requires undeleted children to be selected too", async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 42 }]).mockResolvedValueOnce([{ id: 43 }]);
    expect((await request(app).delete("/reports/tbl-companies/42")).status).toBe(409);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it.each([[], [0], [-1], ["invalid"], Array.from({ length: 501 }, (_, i) => i + 1)])("rejects invalid selections %#", async (...args) => {
    const ids = args;
    expect((await request(app).delete("/reports/tbl-companies/bulk").send({ ids })).status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("excludes deleted companies from both the list and its count", async () => {
    expect((await request(app).get("/reports/tbl-companies")).status).toBe(200);
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    vi.mocked(prisma.$queryRawUnsafe).mock.calls.forEach(([sql]) => expect(sql).toContain("company.[isDeleted] = 0"));
  });
});
