import express from "express";
import request from "supertest";
import { beforeEach, expect, it, vi } from "vitest";
import { prisma } from "../db/prisma.js";
import { reportsRoutes } from "./reports.routes.js";
vi.mock("../db/prisma.js", () => ({ prisma: { $queryRaw: vi.fn(), note: { findFirst: vi.fn() } } }));
vi.mock("../middleware/authenticate.js", () => ({
    authenticate: (req, _res, next) => {
        req.user = { id: "test", email: "test@example.com", role: "superadmin", orgId: null };
        next();
    }
}));
const app = express().use(express.json()).use("/reports", reportsRoutes);
app.use((error, _req, res, _next) => {
    res.status(error.statusCode ?? 500).json({ error: error.message });
});
beforeEach(() => vi.resetAllMocks());
it.each([
    [true, false, "", "POD", "Account Number"],
    [false, true, "ACCOUNT", "   ", "Service Ref/POD"],
    [true, true, "ACCOUNT", "", "Service Ref/POD"],
    [true, true, "", "POD", "Account Number"]
])("rejects missing required identifiers (%s, %s)", async (accountNumberRequired, serviceRefRequired, accountNumber, serviceRefPod, label) => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ name: "Utility", accountNumberSize: 0, serviceRefSize: 0, accountNumberRequired, serviceRefRequired }]);
    const response = await request(app).post("/reports/meters").send({ companyId: 1, utilityId: 2, accountNumber, serviceRefPod });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain(`${label} is required`);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
});
it.each([false, null])("allows blank identifiers when requirements are %s", async (required) => {
    vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce([{ name: "Utility", accountNumberSize: null, serviceRefSize: null, accountNumberRequired: required, serviceRefRequired: required }])
        .mockResolvedValueOnce([{ id: 5 }]).mockResolvedValue([{ id: 5 }]);
    const response = await request(app).post("/reports/meters").send({ companyId: 1, utilityId: 2 });
    expect(response.status).toBe(201);
});
