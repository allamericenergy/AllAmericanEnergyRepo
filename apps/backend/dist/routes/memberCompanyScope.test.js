import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encryptMemberPassword } from "../security/memberPassword.js";
import { emailService } from "../services/emailService.js";
import { prisma } from "../db/prisma.js";
import { reportsRoutes } from "./reports.routes.js";
import { companyMemberAssignments, memberCompanyScope } from "../services/memberCompanyScope.js";
vi.mock("../db/prisma.js", () => ({ prisma: {
        user: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), count: vi.fn(), findMany: vi.fn() },
        note: { findFirst: vi.fn(), findMany: vi.fn() },
        $queryRaw: vi.fn(),
        $queryRawUnsafe: vi.fn()
    } }));
vi.mock("../services/emailService.js", () => ({ emailService: { verifyConfiguration: vi.fn(), sendMemberWelcome: vi.fn() } }));
vi.mock("../middleware/authenticate.js", () => ({
    authenticate: (req, _res, next) => {
        req.user = { id: "member-a", email: "member@example.com", role: req.header("x-test-role") === "superadmin" ? "superadmin" : req.header("x-test-role") === "admin" ? "admin" : "member", orgId: null };
        next();
    }
}));
const app = express().use(express.json()).use("/reports", reportsRoutes);
const member = { id: "member-a", email: "member@example.com", role: "member", orgId: null };
beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ company: "42" });
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);
    vi.mocked(prisma.$queryRaw).mockImplementation((query) => {
        const result = Array.isArray(query) && query.join("").includes("INFORMATION_SCHEMA.COLUMNS")
            ? [
                { name: "id", dataType: "int", primaryKey: true, identity: true },
                { name: "Name", dataType: "nvarchar" }
            ] : [{ id: 42, parentCompanyId: null }];
        return Promise.resolve(result);
    });
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([]);
});
describe("member company visibility", () => {
    it("filters related meters by contract link while retaining member company scope", async () => {
        const response = await request(app).get("/reports/meters?contractId=123");
        expect(response.status).toBe(200);
        const queries = vi.mocked(prisma.$queryRawUnsafe).mock.calls.map(([sql]) => sql);
        expect(queries).toHaveLength(2);
        queries.forEach((sql) => {
            expect(sql).toContain("m.[CompanyID] IN (42)");
            expect(sql).toContain("link.[ContractID] = 123");
            expect(sql).toContain("link.[MeterID] = m.[id]");
            expect(sql).toContain("link.[CompanyID] = m.[CompanyID]");
        });
    });
    it("filters both the company count and company list using the authenticated member", async () => {
        const response = await request(app).get("/reports/tbl-companies?companyId=99");
        expect(response.status).toBe(200);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "member-a" }, select: { company: true } });
        const queries = vi.mocked(prisma.$queryRawUnsafe).mock.calls.map(([sql]) => sql);
        expect(queries).toHaveLength(2);
        queries.forEach((sql) => expect(sql).toContain("WHERE company.[id] IN (42)"));
    });
    it.each(["meters", "contracts"])("intersects requested company with member scope for %s", async (route) => {
        const response = await request(app).get(`/reports/${route}?companyId=99`);
        expect(response.status).toBe(200);
        const queries = vi.mocked(prisma.$queryRawUnsafe).mock.calls.map(([sql]) => sql);
        expect(queries.length).toBeGreaterThanOrEqual(2);
        const column = route === "meters" ? "m.[CompanyID]" : "cmc.[companyId]";
        queries.slice(0, 2).forEach((sql) => {
            expect(sql).toContain(`${column} IN (42)`);
            expect(sql).toContain(`${column} = 99`);
        });
    });
    it("returns no company scope for unassigned members", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ company: null });
        expect(await memberCompanyScope(member)).toEqual([]);
        const response = await request(app).get("/reports/tbl-companies");
        expect(response.body).toEqual({ total: 0, data: [] });
        vi.mocked(prisma.$queryRawUnsafe).mock.calls.forEach(([sql]) => expect(sql).toContain("WHERE 1 = 0"));
    });
    it("resolves legacy company names through a parameterized lookup", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ company: "O'Brien Energy" });
        vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 42 }]);
        expect(await memberCompanyScope(member)).toEqual([42]);
        const query = vi.mocked(prisma.$queryRaw).mock.calls[0][0];
        expect(query.values).toEqual(["O'Brien Energy"]);
    });
    it("keeps administrator company access unrestricted", async () => {
        const response = await request(app).get("/reports/tbl-companies").set("x-test-role", "admin");
        expect(response.status).toBe(200);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
        vi.mocked(prisma.$queryRawUnsafe).mock.calls.forEach(([sql]) => expect(sql).toContain("WHERE 1 = 1"));
    });
    it.each(["10", "42", "44"])("includes the entire parent-child family when assigned to %s", async (company) => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ company });
        vi.mocked(prisma.$queryRaw).mockResolvedValue([
            { id: 10, parentCompanyId: null },
            { id: 42, parentCompanyId: 10 },
            { id: 43, parentCompanyId: 10 },
            { id: 44, parentCompanyId: 42 },
            { id: 99, parentCompanyId: null },
            { id: 100, parentCompanyId: 99 }
        ]);
        expect(await memberCompanyScope(member)).toEqual([10, 42, 43, 44]);
        const response = await request(app).get("/reports/tbl-companies");
        expect(response.status).toBe(200);
        vi.mocked(prisma.$queryRawUnsafe).mock.calls.forEach(([sql]) => {
            expect(sql).toContain("WHERE company.[id] IN (10,42,43,44)");
        });
    });
    it("handles cycles and missing parents without exposing unrelated companies", async () => {
        vi.mocked(prisma.$queryRaw).mockResolvedValue([
            { id: 42, parentCompanyId: 43 },
            { id: 43, parentCompanyId: 42 },
            { id: 44, parentCompanyId: 43 },
            { id: 99, parentCompanyId: 999 }
        ]);
        expect(await memberCompanyScope(member)).toEqual([42, 43, 44]);
    });
    it("returns no companies when the assigned company no longer exists", async () => {
        vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 99, parentCompanyId: null }]);
        expect(await memberCompanyScope(member)).toEqual([]);
    });
    it.each(["documents", "activities"])("rejects unrelated company %s", async (resource) => {
        const response = await request(app).get(`/reports/tbl-companies/99/${resource}`);
        expect(response.status).toBe(404);
        expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });
    it("scopes member lists inside company details", async () => {
        const response = await request(app).get("/reports/members?companyId=99");
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ total: 0, data: [] });
        expect(prisma.user.count).not.toHaveBeenCalled();
        expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
    it.each(["admin", "member"])("includes ancestor members in child lists for %s viewers", async (role) => {
        vi.mocked(prisma.$queryRaw).mockResolvedValue([
            { id: 10, parentCompanyId: null, companyName: "Parent" },
            { id: 42, parentCompanyId: 10, companyName: "Child" },
            { id: 44, parentCompanyId: 42, companyName: "Grandchild" },
            { id: 43, parentCompanyId: 10, companyName: "Sibling" },
            { id: 99, parentCompanyId: null, companyName: "Unrelated" }
        ]);
        const response = await request(app).get("/reports/members?companyId=44").set("x-test-role", role);
        expect(response.status).toBe(200);
        const where = {
            role: { in: ["user", "member"] },
            status: { not: "deleted" },
            company: { in: ["44", "Grandchild", "42", "Child", "10", "Parent"] }
        };
        expect(prisma.user.count).toHaveBeenCalledWith({ where });
        expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    });
    it("handles cycles and missing parents when resolving inherited members", async () => {
        vi.mocked(prisma.$queryRaw).mockResolvedValue([
            { id: 42, parentCompanyId: 43, companyName: null },
            { id: 43, parentCompanyId: 42, companyName: null },
            { id: 99, parentCompanyId: 999, companyName: null }
        ]);
        expect(await companyMemberAssignments(42)).toEqual(["42", "43"]);
        expect(await companyMemberAssignments(99)).toEqual(["99"]);
        expect(await companyMemberAssignments(123)).toEqual([]);
    });
});
describe("member credentials", () => {
    it.each(["superadmin", "admin", "member"])("restricts temporary passwords for %s", async (role) => {
        vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "new-member", company: null, role: "member", status: "active", mustChangePassword: true, temporaryPasswordEncrypted: encryptMemberPassword("TemporaryPass123!") }]);
        const response = await request(app).get("/reports/members").set("x-test-role", role);
        expect(response.status).toBe(200);
        expect(response.body.data[0]).not.toHaveProperty("temporaryPasswordEncrypted");
        if (role === "superadmin")
            expect(response.body.data[0].password).toBe("TemporaryPass123!");
        else
            expect(response.body.data[0]).not.toHaveProperty("password");
    });
    it("does not reveal an obsolete temporary password", async () => {
        vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "new-member", company: null, role: "member", status: "active", mustChangePassword: false, temporaryPasswordEncrypted: encryptMemberPassword("TemporaryPass123!") }]);
        const response = await request(app).get("/reports/members").set("x-test-role", "superadmin");
        expect(response.body.data[0].password).toBeNull();
    });
    it("creates members without SMTP configuration or sending email", async () => {
        vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.user.create).mockResolvedValue({ id: "new-member" });
        vi.mocked(prisma.note.findFirst).mockResolvedValue(null);
        const response = await request(app).post("/reports/members").set("x-test-role", "superadmin").send({ firstName: "New", lastName: "Member", email: "new@example.com", password: "TemporaryPass123!", notes: "" });
        expect(response.status).toBe(201);
        expect(response.body.emailSent).toBe(false);
        expect(emailService.verifyConfiguration).not.toHaveBeenCalled();
        expect(emailService.sendMemberWelcome).not.toHaveBeenCalled();
        const data = vi.mocked(prisma.user.create).mock.calls[0][0].data;
        expect(data.temporaryPasswordEncrypted).not.toContain("TemporaryPass123!");
    });
});
it("paginates meters in stable order while retaining company scope", async () => {
    const response = await request(app).get("/reports/meters?take=500&skip=500");
    expect(response.status).toBe(200);
    const queries = vi.mocked(prisma.$queryRawUnsafe).mock.calls.map(([sql]) => sql);
    expect(queries[1]).toContain("m.[CompanyID] IN (42)");
    expect(queries[1]).toContain("ORDER BY m.[UpdatedAt] DESC, m.[id] DESC");
    expect(queries[1]).toContain("OFFSET 500 ROWS FETCH NEXT 500 ROWS ONLY");
});
