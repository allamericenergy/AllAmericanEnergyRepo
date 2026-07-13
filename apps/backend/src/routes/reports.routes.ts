import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { scopedOrgId } from "../middleware/tenant.js";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { demoAuditLogs, demoDeals } from "../demo/demoData.js";
import { createCompanySharePointFolders, ensureContractsFolder, getSharePointFileContent, listCompanySharePointDocuments, uploadSharePointFile } from "../services/sharepointFolders.js";

export const reportsRoutes = Router();

reportsRoutes.use(authenticate);

reportsRoutes.get("/pipeline", authorize("report:read"), async (req, res, next) => {
  try {
    if (env.DEMO_MODE) {
      const stages = new Map<string, { stage: string; _count: { id: number }; _sum: { amount: number } }>();
      for (const deal of demoDeals) {
        const current = stages.get(deal.stage) ?? { stage: deal.stage, _count: { id: 0 }, _sum: { amount: 0 } };
        current._count.id += 1;
        current._sum.amount += deal.amount;
        stages.set(deal.stage, current);
      }
      return res.json({ data: [...stages.values()] });
    }

    const orgId = scopedOrgId(req);
    const deals = await prisma.deal.groupBy({
      by: ["stage"],
      where: { orgId: orgId ?? undefined },
      _count: { id: true },
      _sum: { amount: true }
    });

    return res.json({ data: deals });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/activity", authorize("report:read"), async (req, res, next) => {
  try {
    if (env.DEMO_MODE) {
      return res.json({ data: demoAuditLogs });
    }

    const orgId = scopedOrgId(req);
    const data = await prisma.auditLog.findMany({
      where: { orgId: orgId ?? undefined },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/organizations", authorize("org:administer"), async (_req, res, next) => {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            users: true,
            companies: true,
            contacts: true,
            deals: true,
            tasks: true
          }
        }
      }
    });

    return res.json({
      total: organizations.length,
      data: organizations.map(({ _count, ...organization }) => ({
        ...organization,
        usersCount: _count.users,
        companiesCount: _count.companies,
        contactsCount: _count.contacts,
        dealsCount: _count.deals,
        tasksCount: _count.tasks
      }))
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/tbl-companies", authorize("report:read"), async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take ?? 100), 500);
    const countRows = await prisma.$queryRawUnsafe<Array<{ total: bigint | number }>>("SELECT COUNT(*) AS total FROM dbo.tblCompany");
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT TOP (${take})
        [id] AS id,
        [organizationId] AS organizationId,
        [Customer ID] AS customerId,
        [Company Name] AS companyName,
        [Legal Entity Name] AS legalEntityName,
        [Mailing Address] AS mailingAddress,
        [city] AS city,
        [state] AS state,
        [country] AS country,
        [postalCode] AS postalCode,
        [email] AS email,
        [Phone Number] AS phoneNumber,
        [Tax ID] AS taxId,
        [URL] AS url,
        [CompanyFolderID] AS companyFolderId,
        [ContractFolderID] AS contractFolderId,
        [UtilityBillsFolderID] AS utilityBillsFolderId,
        [isActive] AS isActive,
        [createdAt] AS createdAt,
        [updatedAt] AS updatedAt
      FROM dbo.tblCompany
      ORDER BY [updatedAt] DESC
    `);

    return res.json({
      total: Number(countRows[0]?.total ?? 0),
      data: rows
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/tbl-companies/:id/documents", authorize("report:read"), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const company = await findTblCompanyById(id);
    if (!company) return res.status(404).json({ error: "Company not found" });

    const documents = await listCompanySharePointDocuments({
      companyFolderId: typeof company.companyFolderId === "string" ? company.companyFolderId : null,
      contractFolderId: typeof company.contractFolderId === "string" ? company.contractFolderId : null,
      utilityBillsFolderId: typeof company.utilityBillsFolderId === "string" ? company.utilityBillsFolderId : null
    });

    return res.json(documents);
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/sharepoint-files/:itemId/content", authorize("report:read"), async (req, res, next) => {
  try {
    const itemId = z.string().trim().min(1).parse(req.params.itemId);
    const file = await getSharePointFileContent(itemId);

    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", "inline");
    return res.send(file.buffer);
  } catch (error) {
    return next(error);
  }
});

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const optionalText = z.preprocess(emptyStringToUndefined, z.string().trim().optional());
const optionalNumber = z.preprocess(emptyStringToUndefined, z.coerce.number().optional());
const optionalPositiveInt = z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().optional());
const optionalDate = z.preprocess(emptyStringToUndefined, z.coerce.date().optional());

function requireMemberManager(role: string | undefined) {
  if (role !== "superadmin" && role !== "admin") {
    throw Object.assign(new Error("Only Superadmin and Admin can manage members."), { statusCode: 403 });
  }
}

const memberCreateSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: optionalText,
  companyId: optionalPositiveInt,
  company: optionalText,
  department: optionalText,
  designation: optionalText,
  password: z.string().min(12)
});

async function findTblContractById(id: number) {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT TOP (1)
      c.[id] AS id,
      c.[ContractID] AS contractId,
      cmc.[companyId] AS companyId,
      co.[Company Name] AS companyName,
      c.[Broker] AS brokerId,
      b.[Broker] AS broker,
      c.[Supplier] AS supplierId,
      s.[supplier] AS supplier,
      c.[Rate-kWh/therms] AS rate,
      c.[Fee-kWh/Dth] AS fee,
      c.[Start Date] AS startDate,
      c.[End Date] AS endDate,
      c.[Months] AS months,
      c.[cFile] AS cFile,
      c.[isActive] AS isActive,
      c.[createdAt] AS createdAt,
      c.[updatedAt] AS updatedAt,
      c.[OnDate] AS onDate
    FROM dbo.tbl_Contract c
    OUTER APPLY (
      SELECT TOP (1) link.[CompanyID] AS companyId
      FROM dbo.tbl_CompanyMeterContract link
      WHERE link.[ContractID] = c.[id]
    ) cmc
    LEFT JOIN dbo.tblCompany co ON cmc.[companyId] = co.[id]
    LEFT JOIN dbo.tbl_Broker b ON c.[Broker] = b.[id]
    LEFT JOIN dbo.tbl_Supplier s ON c.[Supplier] = s.[id]
    WHERE c.[id] = ${id}
  `;

  return rows[0];
}

reportsRoutes.get("/members", authorize("report:read"), async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take ?? 100), 500);
    const companyId = req.query.companyId ? z.coerce.number().int().positive().parse(req.query.companyId) : null;
    const companyFilter = companyId ? String(companyId) : undefined;
    const where = {
      role: { in: ["user", "member"] },
      ...(companyFilter ? { company: companyFilter } : {})
    };
    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          company: true,
          department: true,
          designation: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    return res.json({
      total,
      data: rows.map((row) => ({
        ...row,
        companyId: row.company,
        roleName: row.role === "member" ? "Member" : "User",
        isActive: row.status === "active"
      }))
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/members", authorize("company:create"), async (req, res, next) => {
  try {
    requireMemberManager(req.user?.role);
    const input = memberCreateSchema.parse(req.body);
    await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        company: input.companyId ? String(input.companyId) : input.company ?? null,
        department: input.department ?? null,
        designation: input.designation ?? null,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: "member",
        status: "active",
        emailVerified: true,
        orgId: req.user?.orgId ?? null,
        createdBy: req.user?.id
      }
    });

    return res.status(201).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

async function findTblCompanyById(id: number) {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT TOP (1)
      [id] AS id,
      [organizationId] AS organizationId,
      [Customer ID] AS customerId,
      [Company Name] AS companyName,
      [Legal Entity Name] AS legalEntityName,
      [Mailing Address] AS mailingAddress,
      [city] AS city,
      [state] AS state,
      [country] AS country,
      [postalCode] AS postalCode,
      [email] AS email,
      [Phone Number] AS phoneNumber,
      [Tax ID] AS taxId,
      [URL] AS url,
      [CompanyFolderID] AS companyFolderId,
      [ContractFolderID] AS contractFolderId,
      [UtilityBillsFolderID] AS utilityBillsFolderId,
      [isActive] AS isActive,
      [createdAt] AS createdAt,
      [updatedAt] AS updatedAt
    FROM dbo.tblCompany
    WHERE [id] = ${id}
  `;

  return rows[0];
}

async function resolveContractFolderId(company: Record<string, unknown> | null | undefined) {
  const existingContractFolderId = typeof company?.contractFolderId === "string" && company.contractFolderId.trim()
    ? company.contractFolderId
    : null;
  if (existingContractFolderId) return existingContractFolderId;

  const companyFolderId = typeof company?.companyFolderId === "string" && company.companyFolderId.trim()
    ? company.companyFolderId
    : null;
  if (!companyFolderId) return null;

  const contractFolderId = await ensureContractsFolder(companyFolderId);
  await prisma.$executeRaw`
    UPDATE dbo.tblCompany
    SET [ContractFolderID] = ${contractFolderId}
    WHERE [id] = ${Number(company?.id)}
  `;

  return contractFolderId;
}

async function upsertCompanyContractRelation(companyId: number | undefined, contractId: number, meterIds: number[] = []) {
  if (!companyId) return;

  if (meterIds.length) {
    await prisma.$executeRaw`
      DELETE FROM dbo.tbl_CompanyMeterContract
      WHERE [CompanyID] = ${companyId}
        AND [ContractID] = ${contractId}
    `;

    for (const meterId of meterIds) {
      await prisma.$executeRaw`
        INSERT INTO dbo.tbl_CompanyMeterContract ([MeterID], [CompanyID], [ContractID])
        VALUES (${meterId}, ${companyId}, ${contractId})
      `;
    }
    return;
  }

  const existingRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT TOP (1) [CompanyID] AS companyId
    FROM dbo.tbl_CompanyMeterContract
    WHERE [ContractID] = ${contractId}
  `;

  if (existingRows.length) {
    await prisma.$executeRaw`
      UPDATE dbo.tbl_CompanyMeterContract
      SET [CompanyID] = ${companyId}
      WHERE [ContractID] = ${contractId}
    `;
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO dbo.tbl_CompanyMeterContract ([CompanyID], [ContractID])
    VALUES (${companyId}, ${contractId})
  `;
}

async function findTblMeterById(id: number) {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT TOP (1)
      m.[id] AS id,
      m.[Account Number] AS accountNumber,
      m.[Service Ref/POD] AS serviceRefPod,
      m.[Name Key] AS nameKey,
      m.[Meter] AS meter,
      m.[Service Address] AS serviceAddress,
      m.[City] AS city,
      m.[State] AS state,
      m.[Zip] AS zip,
      m.[Tax Exempt] AS taxExempt,
      m.[Cycle/Read Day] AS cycleReadDay,
      m.[Rate] AS rate,
      m.[Demand] AS demand,
      m.[Ann. Usage-Dth/kWh] AS annualUsage,
      m.[Load Profile] AS loadProfile,
      m.[iEnergyBill] AS iEnergyBill,
      m.[EnergyDashboard] AS energyDashboard,
      m.[OnSiteGeneration] AS onSiteGeneration,
      m.[CompanyID] AS companyId,
      co.[Company Name] AS companyName,
      m.[StatusId] AS statusId,
      st.[Status] AS status,
      m.[TypeId] AS typeId,
      t.[Type] AS type,
      m.[ProductId] AS productId,
      p.[Product] AS product,
      m.[UtilityId] AS utilityId,
      u.[Utility] AS utility,
      m.[IsActive] AS isActive,
      m.[CreatedAt] AS createdAt,
      m.[UpdatedAt] AS updatedAt
    FROM dbo.tbl_MeterList m
    LEFT JOIN dbo.tblCompany co ON m.[CompanyID] = co.[id]
    LEFT JOIN dbo.tbl_Type t ON m.[TypeId] = t.[id]
    LEFT JOIN dbo.tbl_Product p ON m.[ProductId] = p.[id]
    LEFT JOIN dbo.tbl_Utility u ON m.[UtilityId] = u.[id]
    LEFT JOIN dbo.tbl_Status st ON m.[StatusId] = st.[id]
    WHERE m.[id] = ${id}
  `;

  return rows[0];
}

reportsRoutes.get("/contract-lookups", authorize("report:read"), async (_req, res, next) => {
  try {
    const [brokers, suppliers] = await Promise.all([
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT [id] AS id, [Broker] AS name
        FROM dbo.tbl_Broker
        ORDER BY [Broker]
      `,
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT [id] AS id, [supplier] AS name
        FROM dbo.tbl_Supplier
        ORDER BY [supplier]
      `
    ]);

    return res.json({ brokers, suppliers });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/contracts", authorize("report:read"), async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take ?? 100), 500);
    const companyId = req.query.companyId ? z.coerce.number().int().positive().parse(req.query.companyId) : null;
    const whereClause = companyId ? `WHERE cmc.[companyId] = ${companyId}` : "";
    const contractCompanyApply = `
      OUTER APPLY (
        SELECT TOP (1) link.[CompanyID] AS companyId
        FROM dbo.tbl_CompanyMeterContract link
        WHERE link.[ContractID] = c.[id]
      ) cmc
    `;
    const countRows = await prisma.$queryRawUnsafe<Array<{ total: bigint | number }>>(`
      SELECT COUNT(*) AS total
      FROM dbo.tbl_Contract c
      ${contractCompanyApply}
      ${whereClause}
    `);
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT TOP (${take})
        c.[id] AS id,
        c.[ContractID] AS contractId,
        cmc.[companyId] AS companyId,
        co.[Company Name] AS companyName,
        c.[Broker] AS brokerId,
        b.[Broker] AS broker,
        c.[Supplier] AS supplierId,
        s.[supplier] AS supplier,
        c.[Rate-kWh/therms] AS rate,
        c.[Fee-kWh/Dth] AS fee,
        c.[Start Date] AS startDate,
        c.[End Date] AS endDate,
        c.[Months] AS months,
        c.[cFile] AS cFile,
        c.[isActive] AS isActive,
        c.[createdAt] AS createdAt,
        c.[updatedAt] AS updatedAt,
        c.[OnDate] AS onDate
      FROM dbo.tbl_Contract c
      ${contractCompanyApply}
      LEFT JOIN dbo.tblCompany co ON cmc.[companyId] = co.[id]
      LEFT JOIN dbo.tbl_Broker b ON c.[Broker] = b.[id]
      LEFT JOIN dbo.tbl_Supplier s ON c.[Supplier] = s.[id]
      ${whereClause}
      ORDER BY c.[updatedAt] DESC
    `);

    return res.json({
      total: Number(countRows[0]?.total ?? 0),
      data: rows
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/meters", authorize("report:read"), async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take ?? 100), 500);
    const companyId = req.query.companyId ? z.coerce.number().int().positive().parse(req.query.companyId) : null;
    const state = req.query.state ? z.string().trim().min(1).parse(req.query.state) : null;
    const utilityId = req.query.utilityId ? z.coerce.number().int().positive().parse(req.query.utilityId) : null;
    const productId = req.query.productId ? z.coerce.number().int().positive().parse(req.query.productId) : null;
    const filters = [
      companyId ? `m.[CompanyID] = ${companyId}` : null,
      state ? `m.[State] = '${state.replace(/'/g, "''")}'` : null,
      utilityId ? `m.[UtilityId] = ${utilityId}` : null,
      productId ? `m.[ProductId] = ${productId}` : null
    ].filter(Boolean);
    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const countRows = await prisma.$queryRawUnsafe<Array<{ total: bigint | number }>>(
      `SELECT COUNT(*) AS total FROM dbo.tbl_MeterList m ${whereClause}`
    );
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT TOP (${take})
        m.[id] AS id,
        m.[Account Number] AS accountNumber,
        m.[Service Ref/POD] AS serviceRefPod,
        m.[Name Key] AS nameKey,
        m.[Meter] AS meter,
        m.[Service Address] AS serviceAddress,
        m.[City] AS city,
        m.[State] AS state,
        m.[Zip] AS zip,
        m.[Tax Exempt] AS taxExempt,
        m.[Cycle/Read Day] AS cycleReadDay,
        m.[Rate] AS rate,
        m.[Demand] AS demand,
        m.[Ann. Usage-Dth/kWh] AS annualUsage,
        m.[Load Profile] AS loadProfile,
        m.[iEnergyBill] AS iEnergyBill,
        m.[EnergyDashboard] AS energyDashboard,
        m.[OnSiteGeneration] AS onSiteGeneration,
        m.[CompanyID] AS companyId,
        co.[Company Name] AS companyName,
        m.[StatusId] AS statusId,
        st.[Status] AS status,
        m.[TypeId] AS typeId,
        t.[Type] AS type,
        m.[ProductId] AS productId,
        p.[Product] AS product,
        m.[UtilityId] AS utilityId,
        u.[Utility] AS utility,
        m.[IsActive] AS isActive,
        m.[CreatedAt] AS createdAt,
        m.[UpdatedAt] AS updatedAt
      FROM dbo.tbl_MeterList m
      LEFT JOIN dbo.tblCompany co ON m.[CompanyID] = co.[id]
      LEFT JOIN dbo.tbl_Type t ON m.[TypeId] = t.[id]
      LEFT JOIN dbo.tbl_Product p ON m.[ProductId] = p.[id]
      LEFT JOIN dbo.tbl_Utility u ON m.[UtilityId] = u.[id]
      LEFT JOIN dbo.tbl_Status st ON m.[StatusId] = st.[id]
      ${whereClause}
      ORDER BY m.[UpdatedAt] DESC
    `);

    return res.json({
      total: Number(countRows[0]?.total ?? 0),
      data: rows
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/meter-lookups", authorize("report:read"), async (_req, res, next) => {
  try {
    const [iEnergyBills, energyDashboards, onSiteGenerations, types, products, utilities, statuses] = await Promise.all([
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Type] AS name FROM dbo.tbl_iEnergyBill ORDER BY [Type]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Type] AS name FROM dbo.tbl_EnergyDashboard ORDER BY [Type]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Type] AS name FROM dbo.tbl_OnSiteGeneration ORDER BY [Type]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Type] AS name FROM dbo.tbl_Type ORDER BY [Type]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Product] AS name FROM dbo.tbl_Product ORDER BY [Product]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Utility] AS name FROM dbo.tbl_Utility ORDER BY [Utility]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Status] AS name FROM dbo.tbl_Status ORDER BY [Status]`
    ]);

    return res.json({ iEnergyBills, energyDashboards, onSiteGenerations, types, products, utilities, statuses });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/meter-state-product-utilities", authorize("report:read"), async (req, res, next) => {
  try {
    const state = z.string().trim().min(1).parse(req.query.state);
    const productId = req.query.productId ? z.coerce.number().int().positive().parse(req.query.productId) : null;
    const utilityId = req.query.utilityId ? z.coerce.number().int().positive().parse(req.query.utilityId) : null;

    const products = utilityId
      ? await prisma.$queryRaw<Array<Record<string, unknown>>>`
          SELECT DISTINCT
            p.[id] AS id,
            p.[Product] AS name
          FROM dbo.UtilityStateProduct usp
          INNER JOIN dbo.USStates s ON usp.[StateId] = s.[StateId]
          INNER JOIN dbo.tbl_Product p ON usp.[ProductId] = p.[id]
          WHERE usp.[UtilityId] = ${utilityId}
            AND (
              s.[StateCode] = ${state}
              OR s.[StateName] = ${state}
              OR CONVERT(varchar(20), s.[StateId]) = ${state}
            )
          ORDER BY p.[Product]
        `
      : await prisma.$queryRaw<Array<Record<string, unknown>>>`
          SELECT DISTINCT
            p.[id] AS id,
            p.[Product] AS name
          FROM dbo.UtilityStateProduct usp
          INNER JOIN dbo.USStates s ON usp.[StateId] = s.[StateId]
          INNER JOIN dbo.tbl_Product p ON usp.[ProductId] = p.[id]
          WHERE s.[StateCode] = ${state}
             OR s.[StateName] = ${state}
             OR CONVERT(varchar(20), s.[StateId]) = ${state}
          ORDER BY p.[Product]
        `;

    const utilities = productId
      ? await prisma.$queryRaw<Array<Record<string, unknown>>>`
          SELECT DISTINCT
            u.[id] AS id,
            u.[Utility] AS name
          FROM dbo.UtilityStateProduct usp
          INNER JOIN dbo.USStates s ON usp.[StateId] = s.[StateId]
          INNER JOIN dbo.tbl_Utility u ON usp.[UtilityId] = u.[id]
          WHERE usp.[ProductId] = ${productId}
            AND (
              s.[StateCode] = ${state}
              OR s.[StateName] = ${state}
              OR CONVERT(varchar(20), s.[StateId]) = ${state}
            )
          ORDER BY u.[Utility]
        `
      : await prisma.$queryRaw<Array<Record<string, unknown>>>`
          SELECT DISTINCT
            u.[id] AS id,
            u.[Utility] AS name
          FROM dbo.UtilityStateProduct usp
          INNER JOIN dbo.USStates s ON usp.[StateId] = s.[StateId]
          INNER JOIN dbo.tbl_Utility u ON usp.[UtilityId] = u.[id]
          WHERE s.[StateCode] = ${state}
             OR s.[StateName] = ${state}
             OR CONVERT(varchar(20), s.[StateId]) = ${state}
          ORDER BY u.[Utility]
        `;

    return res.json({ products, utilities });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/us-states", authorize("report:read"), async (_req, res, next) => {
  try {
    const states = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        [StateId] AS id,
        [StateName] AS name,
        [StateCode] AS code
      FROM dbo.USStates
      ORDER BY [StateName]
    `;

    return res.json({ data: states });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/us-cities", authorize("report:read"), async (req, res, next) => {
  try {
    const state = z.string().trim().min(1).parse(req.query.state);
    const cities = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT DISTINCT
        c.[CityId] AS id,
        c.[CityName] AS name
      FROM dbo.USCities c
      INNER JOIN dbo.USStates s ON c.[StateId] = s.[StateId]
      WHERE s.[StateCode] = ${state}
         OR s.[StateName] = ${state}
         OR CONVERT(varchar(20), s.[StateId]) = ${state}
      ORDER BY c.[CityName]
    `;

    return res.json({ data: cities });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/zip-codes", authorize("report:read"), async (req, res, next) => {
  try {
    const state = z.string().trim().min(1).parse(req.query.state);
    const city = z.string().trim().min(1).parse(req.query.city);
    const zipCodes = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT DISTINCT
        z.[ZipId] AS id,
        z.[ZipCode] AS code
      FROM dbo.ZipCodes z
      INNER JOIN dbo.USCities c ON z.[CityId] = c.[CityId]
      INNER JOIN dbo.USStates s ON c.[StateId] = s.[StateId]
      WHERE c.[CityName] = ${city}
        AND (
          s.[StateCode] = ${state}
          OR s.[StateName] = ${state}
          OR CONVERT(varchar(20), s.[StateId]) = ${state}
        )
      ORDER BY z.[ZipCode]
    `;

    return res.json({ data: zipCodes });
  } catch (error) {
    return next(error);
  }
});

const tblMeterCreateSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  accountNumber: optionalText,
  serviceRefPod: optionalText,
  nameKey: optionalText,
  meter: optionalText,
  serviceAddress: optionalText,
  city: optionalText,
  state: optionalText,
  zip: optionalText,
  taxExempt: optionalText,
  cycleReadDay: optionalText,
  rate: optionalText,
  demand: optionalText,
  annualUsage: optionalText,
  loadProfile: optionalText,
  iEnergyBillId: optionalPositiveInt,
  energyDashboardId: optionalPositiveInt,
  onSiteGenerationId: optionalPositiveInt,
  typeId: optionalPositiveInt,
  productId: optionalPositiveInt,
  utilityId: optionalPositiveInt,
  statusId: optionalPositiveInt,
  isActive: z.boolean().default(true)
});

const tblMeterUpdateSchema = tblMeterCreateSchema.partial();

reportsRoutes.post("/meters", authorize("company:create"), async (req, res, next) => {
  try {
    const input = tblMeterCreateSchema.parse(req.body);
    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO dbo.tbl_MeterList (
        [Account Number],
        [Service Ref/POD],
        [Name Key],
        [Meter],
        [Service Address],
        [City],
        [State],
        [Zip],
        [Tax Exempt],
        [Cycle/Read Day],
        [Rate],
        [Demand],
        [Ann. Usage-Dth/kWh],
        [Load Profile],
        [iEnergyBill],
        [EnergyDashboard],
        [OnSiteGeneration],
        [CompanyID],
        [StatusId],
        [TypeId],
        [ProductId],
        [UtilityId],
        [IsActive],
        [CreatedAt],
        [UpdatedAt]
      )
      VALUES (
        ${input.accountNumber ?? null},
        ${input.serviceRefPod ?? null},
        ${input.nameKey ?? null},
        ${input.meter ?? null},
        ${input.serviceAddress ?? null},
        ${input.city ?? null},
        ${input.state ?? null},
        ${input.zip ?? null},
        ${input.taxExempt ?? null},
        ${input.cycleReadDay ?? null},
        ${input.rate ?? null},
        ${input.demand ?? null},
        ${input.annualUsage ?? null},
        ${input.loadProfile ?? null},
        ${input.iEnergyBillId ?? null},
        ${input.energyDashboardId ?? null},
        ${input.onSiteGenerationId ?? null},
        ${input.companyId},
        ${input.statusId ?? null},
        ${input.typeId ?? null},
        ${input.productId ?? null},
        ${input.utilityId ?? null},
        ${input.isActive},
        ${now},
        ${now}
      )
    `;

    return res.status(201).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.patch("/meters/:id", authorize("company:update"), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const current = await findTblMeterById(id);
    if (!current) return res.status(404).json({ error: "Meter not found" });

    const input = tblMeterUpdateSchema.parse(req.body);
    await prisma.$executeRaw`
      UPDATE dbo.tbl_MeterList
      SET
        [Account Number] = ${input.accountNumber ?? current.accountNumber ?? null},
        [Service Ref/POD] = ${input.serviceRefPod ?? current.serviceRefPod ?? null},
        [Name Key] = ${input.nameKey ?? current.nameKey ?? null},
        [Meter] = ${input.meter ?? current.meter ?? null},
        [Service Address] = ${input.serviceAddress ?? current.serviceAddress ?? null},
        [City] = ${input.city ?? current.city ?? null},
        [State] = ${input.state ?? current.state ?? null},
        [Zip] = ${input.zip ?? current.zip ?? null},
        [Tax Exempt] = ${input.taxExempt ?? current.taxExempt ?? null},
        [Cycle/Read Day] = ${input.cycleReadDay ?? current.cycleReadDay ?? null},
        [Rate] = ${input.rate ?? current.rate ?? null},
        [Demand] = ${input.demand ?? current.demand ?? null},
        [Ann. Usage-Dth/kWh] = ${input.annualUsage ?? current.annualUsage ?? null},
        [Load Profile] = ${input.loadProfile ?? current.loadProfile ?? null},
        [iEnergyBill] = ${input.iEnergyBillId ?? current.iEnergyBill ?? null},
        [EnergyDashboard] = ${input.energyDashboardId ?? current.energyDashboard ?? null},
        [OnSiteGeneration] = ${input.onSiteGenerationId ?? current.onSiteGeneration ?? null},
        [CompanyID] = ${input.companyId ?? current.companyId ?? null},
        [StatusId] = ${input.statusId ?? current.statusId ?? null},
        [TypeId] = ${input.typeId ?? current.typeId ?? null},
        [ProductId] = ${input.productId ?? current.productId ?? null},
        [UtilityId] = ${input.utilityId ?? current.utilityId ?? null},
        [IsActive] = ${input.isActive ?? current.isActive},
        [UpdatedAt] = ${new Date()}
      WHERE [id] = ${id}
    `;

    return res.json({ data: await findTblMeterById(id) });
  } catch (error) {
    return next(error);
  }
});

const tblContractCreateSchema = z.object({
  companyId: optionalPositiveInt,
  brokerId: optionalPositiveInt,
  supplierId: optionalPositiveInt,
  meterIds: z.array(z.coerce.number().int().positive()).default([]),
  rate: optionalNumber,
  fee: optionalNumber,
  startDate: optionalDate,
  endDate: optionalDate,
  cFile: optionalText,
  contractFile: z.object({
    name: z.string().trim().min(1),
    contentType: z.string().trim().optional(),
    contentBase64: z.string().trim().min(1)
  }).optional(),
  isActive: z.boolean().default(true),
  onDate: optionalDate
});

const tblContractUpdateSchema = tblContractCreateSchema.partial();

reportsRoutes.post("/contracts", authorize("company:create"), async (req, res, next) => {
  try {
    const input = tblContractCreateSchema.parse(req.body);
    const company = input.companyId ? await findTblCompanyById(input.companyId) : null;
    const contractFolderId = await resolveContractFolderId(company);
    if (input.contractFile && !contractFolderId) {
      return res.status(400).json({ error: "Company ContractFolderID or CompanyFolderID is required to upload contract files." });
    }

    const uploadedFile = input.contractFile && contractFolderId
      ? await uploadSharePointFile(contractFolderId, input.contractFile)
      : null;
    const now = new Date();
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO dbo.tbl_Contract (
        [Broker],
        [Supplier],
        [Rate-kWh/therms],
        [Fee-kWh/Dth],
        [Start Date],
        [End Date],
        [cFile],
        [isActive],
        [createdAt],
        [updatedAt],
        [OnDate]
      )
      OUTPUT INSERTED.[id] AS id
      VALUES (
        ${input.brokerId ?? null},
        ${input.supplierId ?? null},
        ${input.rate ?? null},
        ${input.fee ?? null},
        ${input.startDate ?? null},
        ${input.endDate ?? null},
        ${uploadedFile?.name ?? input.cFile ?? null},
        ${input.isActive},
        ${now},
        ${now},
        ${input.onDate ?? null}
      )
    `;

    const contractId = Number(rows[0]?.id);
    await upsertCompanyContractRelation(input.companyId, contractId, input.meterIds);
    return res.status(201).json({ data: await findTblContractById(contractId) });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.patch("/contracts/:id", authorize("company:update"), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const current = await findTblContractById(id);
    if (!current) return res.status(404).json({ error: "Contract not found" });

    const input = tblContractUpdateSchema.parse(req.body);
    const companyId = input.companyId ?? Number(current.companyId ?? 0);
    const company = companyId ? await findTblCompanyById(companyId) : null;
    const contractFolderId = await resolveContractFolderId(company);
    if (input.contractFile && !contractFolderId) {
      return res.status(400).json({ error: "Company ContractFolderID or CompanyFolderID is required to upload contract files." });
    }

    const uploadedFile = input.contractFile && contractFolderId
      ? await uploadSharePointFile(contractFolderId, input.contractFile)
      : null;

    await prisma.$executeRaw`
      UPDATE dbo.tbl_Contract
      SET
        [Broker] = ${input.brokerId ?? current.brokerId ?? null},
        [Supplier] = ${input.supplierId ?? current.supplierId ?? null},
        [Rate-kWh/therms] = ${input.rate ?? current.rate ?? null},
        [Fee-kWh/Dth] = ${input.fee ?? current.fee ?? null},
        [Start Date] = ${input.startDate ?? current.startDate ?? null},
        [End Date] = ${input.endDate ?? current.endDate ?? null},
        [cFile] = ${uploadedFile?.name ?? input.cFile ?? current.cFile ?? null},
        [isActive] = ${input.isActive ?? current.isActive},
        [updatedAt] = ${new Date()},
        [OnDate] = ${input.onDate ?? current.onDate ?? null}
      WHERE [id] = ${id}
    `;

    await upsertCompanyContractRelation(input.companyId, id, input.meterIds);
    return res.json({ data: await findTblContractById(id) });
  } catch (error) {
    return next(error);
  }
});

const tblCompanyCreateSchema = z.object({
  organizationId: z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().default(1)),
  companyName: z.string().trim().min(1, "Company name is required"),
  legalEntityName: optionalText,
  mailingAddress: optionalText,
  city: optionalText,
  state: optionalText,
  country: optionalText,
  postalCode: optionalText,
  email: z.preprocess(emptyStringToUndefined, z.string().trim().email("Enter a valid email address").optional()),
  phoneNumber: optionalText,
  taxId: optionalText,
  url: optionalText,
  isActive: z.boolean().default(true)
});

const tblCompanyUpdateSchema = z.object({
  organizationId: z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().optional()),
  companyName: z.string().trim().min(1, "Company name is required").optional(),
  legalEntityName: z.string().trim().optional(),
  mailingAddress: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  email: z.preprocess(emptyStringToUndefined, z.string().trim().email("Enter a valid email address").optional()),
  phoneNumber: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  url: z.string().trim().optional(),
  isActive: z.boolean().optional()
});

reportsRoutes.post("/tbl-companies", authorize("company:create"), async (req, res, next) => {
  try {
    const input = tblCompanyCreateSchema.parse(req.body);
    const sharePointFolder = await createCompanySharePointFolders(input.companyName);

    await prisma.$executeRaw`
      INSERT INTO dbo.tblCompany (
        [organizationId],
        [Company Name],
        [Legal Entity Name],
        [Mailing Address],
        [city],
        [state],
        [country],
        [postalCode],
        [email],
        [Phone Number],
        [Tax ID],
        [URL],
        [CompanyFolderID],
        [ContractFolderID],
        [UtilityBillsFolderID],
        [isActive],
        [createdAt],
        [updatedAt]
      )
      VALUES (
        ${input.organizationId},
        ${input.companyName},
        ${input.legalEntityName ?? null},
        ${input.mailingAddress ?? null},
        ${input.city ?? null},
        ${input.state ?? null},
        ${input.country ?? null},
        ${input.postalCode ?? null},
        ${input.email || null},
        ${input.phoneNumber ?? null},
        ${input.taxId ?? null},
        ${input.url || null},
        ${sharePointFolder.companyFolderId ?? null},
        ${sharePointFolder.contractFolderId ?? null},
        ${sharePointFolder.utilityBillsFolderId ?? null},
        ${input.isActive},
        ${new Date()},
        ${new Date()}
      )
    `;

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT TOP (1)
        [id] AS id,
        [organizationId] AS organizationId,
        [Customer ID] AS customerId,
        [Company Name] AS companyName,
        [Legal Entity Name] AS legalEntityName,
        [Mailing Address] AS mailingAddress,
        [city] AS city,
        [state] AS state,
        [country] AS country,
        [postalCode] AS postalCode,
        [email] AS email,
        [Phone Number] AS phoneNumber,
        [Tax ID] AS taxId,
        [URL] AS url,
        [CompanyFolderID] AS companyFolderId,
        [ContractFolderID] AS contractFolderId,
        [UtilityBillsFolderID] AS utilityBillsFolderId,
        [isActive] AS isActive,
        [createdAt] AS createdAt,
        [updatedAt] AS updatedAt
      FROM dbo.tblCompany
      ORDER BY [id] DESC
    `);

    return res.status(201).json({ data: rows[0], sharePointFolder });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.patch("/tbl-companies/:id", authorize("company:update"), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const current = await findTblCompanyById(id);
    if (!current) return res.status(404).json({ error: "Company not found" });

    const input = tblCompanyUpdateSchema.parse(req.body);
    await prisma.$executeRaw`
      UPDATE dbo.tblCompany
      SET
        [organizationId] = ${input.organizationId ?? current.organizationId},
        [Company Name] = ${input.companyName ?? current.companyName},
        [Legal Entity Name] = ${input.legalEntityName ?? current.legalEntityName ?? null},
        [Mailing Address] = ${input.mailingAddress ?? current.mailingAddress ?? null},
        [city] = ${input.city ?? current.city ?? null},
        [state] = ${input.state ?? current.state ?? null},
        [country] = ${input.country ?? current.country ?? null},
        [postalCode] = ${input.postalCode ?? current.postalCode ?? null},
        [email] = ${input.email || current.email || null},
        [Phone Number] = ${input.phoneNumber ?? current.phoneNumber ?? null},
        [Tax ID] = ${input.taxId ?? current.taxId ?? null},
        [URL] = ${input.url ?? current.url ?? null},
        [isActive] = ${input.isActive ?? current.isActive},
        [updatedAt] = ${new Date()}
      WHERE [id] = ${id}
    `;

    return res.json({ data: await findTblCompanyById(id) });
  } catch (error) {
    return next(error);
  }
});
