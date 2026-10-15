import express from "express";
import request from "supertest";
import { beforeEach, expect, it, vi } from "vitest";
import { reportsRoutes } from "./reports.routes.js";

const mocks = vi.hoisted(() => ({ query: vi.fn(), backfill: vi.fn(), role: "superadmin" }));
vi.mock("../db/prisma.js", () => ({ prisma: { $queryRaw: mocks.query } }));
vi.mock("../services/sharepointFolders.js", () => ({ addAccountReportsFolders: mocks.backfill }));
vi.mock("../middleware/authenticate.js", () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: "test", email: "test@example.com", role: mocks.role as "superadmin", orgId: null };
    next();
  }
}));
const app = express().use(express.json()).use("/reports", reportsRoutes);
beforeEach(() => { vi.clearAllMocks(); mocks.role = "superadmin"; });

it("backfills non-deleted companies and returns the outcome", async () => {
  const companies = [{ id: 1, companyName: "Example", companyFolderId: "folder" }];
  const outcome = { created: 1, existing: 0, skipped: 0, failed: [] };
  mocks.query.mockResolvedValue(companies);
  mocks.backfill.mockResolvedValue(outcome);
  const response = await request(app).post("/reports/organizations/account-reports-folders");
  expect(response.status).toBe(200);
  expect(response.body).toEqual(outcome);
  expect(mocks.backfill).toHaveBeenCalledWith(companies);
  expect(mocks.query.mock.calls[0][0].join("")).toContain("WHERE [isDeleted] = 0");
});

it("rejects users without organization administration permission", async () => {
  mocks.role = "member";
  expect((await request(app).post("/reports/organizations/account-reports-folders")).status).toBe(403);
  expect(mocks.query).not.toHaveBeenCalled();
  expect(mocks.backfill).not.toHaveBeenCalled();
});
