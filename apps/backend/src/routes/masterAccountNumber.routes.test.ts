import express from "express";
import request from "supertest";
import { beforeEach, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { prisma } from "../db/prisma.js";
import { masterAccountNumberRoutes } from "./masterAccountNumber.routes.js";

vi.mock("../db/prisma.js", () => ({ prisma: { $queryRaw: vi.fn(), $executeRaw: vi.fn() } }));
const app = express();
app.use(express.json(), (req, _res, next) => {
  req.user = { id: "test", email: "test@example.com", role: req.header("x-role") === "member" ? "member" : "superadmin", orgId: null };
  next();
});
app.use("/settings", masterAccountNumberRoutes);
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
});
beforeEach(() => vi.resetAllMocks());

it("lists saved utility settings", async () => {
  const data = [{ id: 1, utilityId: 3, utilityName: "Utility", accountNumber: false, serviceRefPodId: true, masterAccountNumber: "BOTH" }];
  vi.mocked(prisma.$queryRaw).mockResolvedValue(data);
  const response = await request(app).get("/settings");
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual(data);
});

it.each([true, false])("saves boolean choices including %s", async (choice) => {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 3 }]);
  vi.mocked(prisma.$executeRaw).mockResolvedValue(1);
  const response = await request(app).put("/settings").send({ utilityId: 3, accountNumber: choice, serviceRefPodId: !choice, masterAccountNumber: "BOTH" });
  expect(response.status).toBe(200);
  expect(vi.mocked(prisma.$executeRaw).mock.calls[0].slice(1)).toEqual([3, choice, !choice, "BOTH", 3, choice, !choice, "BOTH"]);
});

it("rejects unknown utilities", async () => {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
  expect((await request(app).put("/settings").send({ utilityId: 999, accountNumber: true, serviceRefPodId: false, masterAccountNumber: "Account Number" })).status).toBe(404);
  expect(prisma.$executeRaw).not.toHaveBeenCalled();
});

it.each(["Account Number", "Service Ref/POD ID", "BOTH"])("persists MasterAccountNumber choice %s for inserts and updates", async (masterAccountNumber) => {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 3 }]);
  vi.mocked(prisma.$executeRaw).mockResolvedValue(1);
  const response = await request(app).put("/settings").send({ utilityId: 3, accountNumber: true, serviceRefPodId: false, masterAccountNumber });
  expect(response.status).toBe(200);
  expect(vi.mocked(prisma.$executeRaw).mock.calls[0].slice(1)).toEqual([3, true, false, masterAccountNumber, 3, true, false, masterAccountNumber]);
});

it.each([undefined, "invalid", "", true])("rejects invalid MasterAccountNumber choice %s", async (masterAccountNumber) => {
  const response = await request(app).put("/settings").send({ utilityId: 3, accountNumber: true, serviceRefPodId: false, masterAccountNumber });
  expect(response.status).toBe(400);
  expect(prisma.$executeRaw).not.toHaveBeenCalled();
});

it.each([{ utilityId: 0, accountNumber: true, serviceRefPodId: false }, { utilityId: 1, accountNumber: "NO", serviceRefPodId: true }])("rejects invalid input", async (body) => {
  expect((await request(app).put("/settings").send(body)).status).toBe(400);
  expect(prisma.$executeRaw).not.toHaveBeenCalled();
});

it("blocks members from reading and writing organization settings", async () => {
  expect((await request(app).get("/settings").set("x-role", "member")).status).toBe(403);
  expect((await request(app).put("/settings").set("x-role", "member").send({ utilityId: 3, accountNumber: true, serviceRefPodId: false })).status).toBe(403);
  expect(prisma.$queryRaw).not.toHaveBeenCalled();
  expect(prisma.$executeRaw).not.toHaveBeenCalled();
});

