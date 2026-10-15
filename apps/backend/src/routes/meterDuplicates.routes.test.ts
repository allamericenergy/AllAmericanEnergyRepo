import express from "express";
import request from "supertest";
import { beforeEach, expect, it, vi } from "vitest";
import { prisma } from "../db/prisma.js";
import { meterDuplicatesRoutes } from "./meterDuplicates.routes.js";

vi.mock("../db/prisma.js", () => ({ prisma: { $queryRaw: vi.fn() } }));
const app = express().use((req, _res, next) => {
  if (!req.header("x-anonymous")) req.user = { id: "test", email: "test@example.com", role: "superadmin", orgId: null };
  next();
}).use("/check", meterDuplicatesRoutes).use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ error: "Invalid request" });
});
beforeEach(() => vi.resetAllMocks());

it.each([
  ["accountNumber", "[Account Number]"],
  ["serviceRefPod", "[Service Ref/POD]"]
])("checks %s with a parameterized value and returns only existence", async (field, column) => {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 42 }]);
  const response = await request(app).get("/check").query({ field, value: "  O'Brien-123  " });
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ exists: true });
  const query = vi.mocked(prisma.$queryRaw).mock.calls[0][0] as { sql: string; values: unknown[] };
  expect(query.sql).toContain(column);
  expect(query.sql).not.toContain("O'Brien");
  expect(query.values).toEqual(["O'Brien-123"]);
});
it("returns false when the database has no match", async () => {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
  expect((await request(app).get("/check").query({ field: "accountNumber", value: "001234" })).body).toEqual({ exists: false });
});
it.each([
  { field: "unknown", value: "123" },
  { field: "accountNumber", value: " " },
  { field: "accountNumber", value: "1".repeat(501) }
])("rejects invalid check input %#", async (query) => {
  expect((await request(app).get("/check").query(query)).status).toBe(400);
  expect(prisma.$queryRaw).not.toHaveBeenCalled();
});
it("requires authentication", async () => {
  expect((await request(app).get("/check").set("x-anonymous", "true").query({ field: "accountNumber", value: "123" })).status).toBe(401);
  expect(prisma.$queryRaw).not.toHaveBeenCalled();
});
