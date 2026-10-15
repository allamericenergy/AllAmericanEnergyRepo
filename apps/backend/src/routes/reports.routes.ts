<<<<<<< HEAD
import { masterAccountNumberRoutes } from "./masterAccountNumber.routes.js";
import { meterDuplicatesRoutes } from "./meterDuplicates.routes.js";
import { deleteUtility } from "../services/deleteUtility.js";
import { deleteCompanies } from "../services/deleteCompanies.js";
import { encryptMemberPassword, decryptMemberPassword } from "../security/memberPassword.js";
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
=======
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { scopedOrgId } from "../middleware/tenant.js";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { demoAuditLogs, demoDeals } from "../demo/demoData.js";
<<<<<<< HEAD
import { addAccountReportsFolders, createCompanySharePointFolders, ensureContractsFolder, getSharePointFileContent, listCompanySharePointDocuments, uploadSharePointFile } from "../services/sharepointFolders.js";
import { emailService } from "../services/emailService.js";
import { contractUploadFileName } from "../services/contractFileName.js";
import { companyMemberAssignments, memberCompanyFilter, memberCompanyScope } from "../services/memberCompanyScope.js";

export const reportsRoutes = Router();

const TAGGABLE_TEAM_ROLES = ["superadmin", "admin", "member", "user"];

reportsRoutes.use(authenticate);
reportsRoutes.use("/meters/check-duplicate", meterDuplicatesRoutes);
reportsRoutes.use("/master-account-numbers", masterAccountNumberRoutes);

reportsRoutes.get("/pipeline", authorize("report:read"), async (req, res, next) => {
  try {
    if (req.user?.role === "member") return res.json({ data: [] });
=======
import { createCompanySharePointFolders, ensureContractsFolder, getSharePointFileContent, listCompanySharePointDocuments, uploadSharePointFile } from "../services/sharepointFolders.js";

export const reportsRoutes = Router();

reportsRoutes.use(authenticate);

reportsRoutes.get("/pipeline", authorize("report:read"), async (req, res, next) => {
  try {
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
      data: organizations.map((entry: {
        _count: { users: number; companies: number; contacts: number; deals: number; tasks: number };
        [key: string]: unknown;
      }) => {
        const { _count, ...organization } = entry;
        return {
          ...organization,
          usersCount: _count.users,
          companiesCount: _count.companies,
          contactsCount: _count.contacts,
          dealsCount: _count.deals,
          tasksCount: _count.tasks
        };
      })
    });
  } catch (error) {
    return next(error);
  }
});

<<<<<<< HEAD
reportsRoutes.post("/organizations/account-reports-folders", authorize("org:administer"), async (_req, res, next) => {
  try {
    const companies = await prisma.$queryRaw<Array<{ id: number; companyName: string; companyFolderId: string | null }>>`
      SELECT [ID] AS id, [Company Name] AS companyName, [CompanyFolderID] AS companyFolderId
      FROM dbo.tblCompany WHERE [isDeleted] = 0 ORDER BY [ID]
    `;
    return res.json(await addAccountReportsFolders(companies));
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/team-members", async (req, res, next) => {
  try {
    const orgId = req.user?.role === "superadmin" ? undefined : req.user?.orgId ?? undefined;
    const users = await prisma.user.findMany({
      where: {
        ...(orgId ? { orgId } : {}),
        id: { not: req.user!.id },
        role: { in: TAGGABLE_TEAM_ROLES },
        status: "active"
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, email: true, role: true, designation: true, orgId: true }
    });
    return res.json({ data: users });
  } catch (error) {
    return next(error);
  }
});

async function attachActivityConversation<T extends { id: string }>(activities: T[]) {
  const activityIds = activities.map((activity) => activity.id);
  if (!activityIds.length) return activities.map((activity) => ({ ...activity, createdBy: null, replies: [] }));
  const [creatorEvents, replies] = await Promise.all([
    prisma.auditLog.findMany({
      where: { objectType: "companyActivity", objectId: { in: activityIds }, action: "tagged" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }
    }),
    prisma.note.findMany({
      where: { relatedType: "companyActivityReply", relatedId: { in: activityIds } },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }
    })
  ]);
  const creators = new Map<string, (typeof creatorEvents)[number]["user"]>();
  for (const event of creatorEvents) {
    if (event.objectId && !creators.has(event.objectId)) creators.set(event.objectId, event.user);
  }
  const repliesByActivity = new Map<string, typeof replies>();
  for (const reply of replies) {
    const current = repliesByActivity.get(reply.relatedId) ?? [];
    current.push(reply);
    repliesByActivity.set(reply.relatedId, current);
  }
  return activities.map((activity) => ({
    ...activity,
    createdBy: creators.get(activity.id) ?? null,
    replies: repliesByActivity.get(activity.id) ?? []
  }));
}

reportsRoutes.get("/my-company-activities", async (req, res, next) => {
  try {
    const activities = await prisma.task.findMany({
      where: { assigneeId: req.user!.id, relatedType: "tblCompanyActivity" },
      orderBy: { createdAt: "desc" },
      include: { assignee: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }
    });
    const companyIds = Array.from(new Set(activities.map((activity) => Number(activity.relatedId)).filter((id) => Number.isInteger(id) && id > 0)));
    const companies = companyIds.length ? await prisma.$queryRaw<Array<{ id: number; companyName: string | null }>>(Prisma.sql`
      SELECT [id], [Company Name] AS [companyName]
      FROM dbo.tblCompany
      WHERE [id] IN (${Prisma.join(companyIds)})
    `) : [];
    const companyNames = new Map(companies.map((company) => [String(company.id), company.companyName]));
    const data = (await attachActivityConversation(activities))
      .filter((activity) => activity.createdBy?.id !== req.user!.id)
      .map((activity) => ({
        ...activity,
        companyId: activity.relatedId,
        companyName: companyNames.get(String(activity.relatedId)) ?? `Company ${activity.relatedId}`
      }));
    const todos = data.filter((activity) => activity.status !== "note");
    const notes = data.filter((activity) => activity.status === "note");
    return res.json({ data, counts: { todos: todos.length, notes: notes.length, total: data.length } });
  } catch (error) {
    return next(error);
  }
});

function notificationCompanyId(actionUrl: string | null) {
  if (!actionUrl) return null;
  const queryMatch = actionUrl.match(/[?&]companyId=(\d+)/);
  if (queryMatch?.[1]) return queryMatch[1];
  const companyPathMatch = actionUrl.match(/\/companies\/(\d+)\/activities/);
  return companyPathMatch?.[1] ?? null;
}

reportsRoutes.get("/activity-unread-counts", async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user!.id,
        type: { in: ["company_activity", "company_activity_reply"] },
        readAt: null,
        archivedAt: null,
        deletedAt: null
      },
      select: { actionUrl: true }
    });
    const byCompany: Record<string, number> = {};
    for (const notification of notifications) {
      const companyId = notificationCompanyId(notification.actionUrl);
      if (companyId) byCompany[companyId] = (byCompany[companyId] ?? 0) + 1;
    }
    return res.json({ total: notifications.length, byCompany });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/activity-notifications/read", async (req, res, next) => {
  try {
    const input = z.object({ companyId: z.coerce.number().int().positive().optional() }).parse(req.body ?? {});
    const baseWhere = {
      userId: req.user!.id,
      type: { in: ["company_activity", "company_activity_reply"] },
      readAt: null,
      archivedAt: null,
      deletedAt: null
    };
    const where = input.companyId
      ? {
          ...baseWhere,
          OR: [
            { actionUrl: { contains: `companyId=${input.companyId}` } },
            { actionUrl: { contains: `/companies/${input.companyId}/activities` } }
          ]
        }
      : baseWhere;
    const result = await prisma.notification.updateMany({ where, data: { readAt: new Date() } });
    return res.json({ updated: result.count });
  } catch (error) {
    return next(error);
  }
});

interface LegacyColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  identity: boolean;
  computed: boolean;
  hasDefault: boolean;
  primaryKey: boolean;
  editable: boolean;
}

function sqlIdentifier(name: string) {
  const bracket = String.fromCharCode(93);
  return Prisma.raw("[" + name.replaceAll(bracket, bracket + bracket) + "]");
}

async function legacyTableColumns(tableName: string): Promise<LegacyColumnMetadata[]> {
  const qualifiedTableName = `dbo.${tableName}`;
  const columns = await prisma.$queryRaw<Array<{
    name: string;
    dataType: string;
    nullable: boolean | number;
    identity: boolean | number;
    computed: boolean | number;
    hasDefault: boolean | number;
    primaryKey: boolean | number;
  }>>`
    SELECT
      c.[COLUMN_NAME] AS [name],
      c.[DATA_TYPE] AS [dataType],
      CAST(CASE WHEN c.[IS_NULLABLE] = 'YES' THEN 1 ELSE 0 END AS bit) AS [nullable],
      CAST(COLUMNPROPERTY(OBJECT_ID(${qualifiedTableName}), c.[COLUMN_NAME], 'IsIdentity') AS bit) AS [identity],
      CAST(COLUMNPROPERTY(OBJECT_ID(${qualifiedTableName}), c.[COLUMN_NAME], 'IsComputed') AS bit) AS [computed],
      CAST(CASE WHEN c.[COLUMN_DEFAULT] IS NOT NULL THEN 1 ELSE 0 END AS bit) AS [hasDefault],
      CAST(CASE WHEN EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
          ON tc.[CONSTRAINT_NAME] = ku.[CONSTRAINT_NAME]
          AND tc.[TABLE_SCHEMA] = ku.[TABLE_SCHEMA]
        WHERE tc.[TABLE_SCHEMA] = 'dbo'
          AND tc.[TABLE_NAME] = ${tableName}
          AND tc.[CONSTRAINT_TYPE] = 'PRIMARY KEY'
          AND ku.[COLUMN_NAME] = c.[COLUMN_NAME]
      ) THEN 1 ELSE 0 END AS bit) AS [primaryKey]
    FROM INFORMATION_SCHEMA.COLUMNS c
    WHERE c.[TABLE_SCHEMA] = 'dbo' AND c.[TABLE_NAME] = ${tableName}
    ORDER BY c.[ORDINAL_POSITION]
  `;

  if (!columns.length) {
    throw Object.assign(new Error(`dbo.${tableName} was not found`), { statusCode: 404 });
  }

  return columns.map((column) => ({
    ...column,
    nullable: Boolean(column.nullable),
    identity: Boolean(column.identity),
    computed: Boolean(column.computed),
    hasDefault: Boolean(column.hasDefault),
    primaryKey: Boolean(column.primaryKey),
    editable: !column.identity && !column.computed && column.dataType !== "timestamp" && !/^(createdAt|updatedAt)$/i.test(column.name)
  }));
}

function legacyValue(column: LegacyColumnMetadata, value: unknown) {
  if (value === "" || value === undefined) return column.nullable ? null : undefined;
  if (value === null) return column.nullable ? null : undefined;
  if (["tinyint", "smallint", "int", "bigint", "decimal", "numeric", "float", "real", "money", "smallmoney"].includes(column.dataType)) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw Object.assign(new Error(`${column.name} must be a number`), { statusCode: 400 });
    return number;
  }
  if (column.dataType === "bit") {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === 1 || value === "1") return true;
    if (value === "false" || value === 0 || value === "0") return false;
    throw Object.assign(new Error(`${column.name} must be true or false`), { statusCode: 400 });
  }
  if (["date", "datetime", "datetime2", "smalldatetime", "datetimeoffset"].includes(column.dataType)) {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw Object.assign(new Error(`${column.name} must be a valid date`), { statusCode: 400 });
    return date;
  }
  return String(value);
}

function writableLegacyValues(
  columns: LegacyColumnMetadata[],
  body: unknown,
  creating: boolean,
  singularName: string,
  requiredOnCreate: string[] = []
) {
  const input = z.record(z.unknown()).parse(body);
  const values = columns
    .filter((column) => column.editable && Object.prototype.hasOwnProperty.call(input, column.name))
    .map((column) => ({ column, value: legacyValue(column, input[column.name]) }))
    .filter((entry) => entry.value !== undefined);

  if (creating) {
    const requiredNames = new Set(requiredOnCreate.map((name) => name.toLowerCase()));
    const missing = columns.find((column) =>
      column.editable
      && ((!column.nullable && !column.hasDefault) || requiredNames.has(column.name.toLowerCase()))
      && !values.some((entry) => entry.column.name === column.name && entry.value !== null)
    );
    if (missing) throw Object.assign(new Error(`${missing.name} is required`), { statusCode: 400 });
  }
  if (!values.length) throw Object.assign(new Error(`No ${singularName.toLowerCase()} values were supplied`), { statusCode: 400 });
  return values;
}

function registerLegacyOrganizationRoutes(
  path: string,
  tableName: string,
  singularName: string,
  checkDuplicateOnCreate = false,
  requiredOnCreate: string[] = []
) {
  const table = Prisma.sql`${sqlIdentifier("dbo")}.${sqlIdentifier(tableName)}`;

  reportsRoutes.get(path, authorize("org:administer"), async (req, res, next) => {
    try {
      const take = Math.min(Math.max(Number(req.query.take ?? 500) || 500, 1), 500);
      const columns = await legacyTableColumns(tableName);
      const primaryKey = columns.find((column) => column.primaryKey) ?? columns.find((column) => column.name.toLowerCase() === "id");
      const [countRows, rows] = await Promise.all([
        prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`SELECT COUNT(*) AS total FROM ${table}`),
        prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT TOP (${take}) * FROM ${table}
          ${primaryKey ? Prisma.sql`ORDER BY ${sqlIdentifier(primaryKey.name)} DESC` : Prisma.empty}
        `)
      ]);
      return res.json({
        total: Number(countRows[0]?.total ?? 0),
        primaryKey: primaryKey?.name ?? null,
        columns,
        data: rows
      });
    } catch (error) {
      return next(error);
    }
  });

  reportsRoutes.post(path, authorize("org:administer"), async (req, res, next) => {
    try {
      const columns = await legacyTableColumns(tableName);
      const missingSchemaColumn = requiredOnCreate.find((requiredName) =>
        !columns.some((column) => column.name.toLowerCase() === requiredName.toLowerCase())
      );
      if (missingSchemaColumn) {
        throw Object.assign(new Error(`${tableName}.${missingSchemaColumn} is not configured`), { statusCode: 500 });
      }
      const values = writableLegacyValues(columns, req.body, true, singularName, requiredOnCreate);
      if (checkDuplicateOnCreate) {
        const duplicateConditions = values.map(({ column, value }) => value === null
          ? Prisma.sql`${sqlIdentifier(column.name)} IS NULL`
          : Prisma.sql`${sqlIdentifier(column.name)} = ${value}`);
        const existing = await prisma.$queryRaw<Array<{ exists: number }>>(Prisma.sql`
          SELECT TOP (1) 1 AS [exists]
          FROM ${table}
          WHERE ${Prisma.join(duplicateConditions, " AND ")}
        `);
        if (existing.length) {
          return res.status(409).json({ error: `${singularName} already exists` });
        }
      }
      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        INSERT INTO ${table} (${Prisma.join(values.map(({ column }) => sqlIdentifier(column.name)))})
        OUTPUT INSERTED.*
        VALUES (${Prisma.join(values.map(({ value }) => value))})
      `);
      return res.status(201).json({ data: rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  reportsRoutes.patch(`${path}/:id`, authorize("org:administer"), async (req, res, next) => {
    try {
      const columns = await legacyTableColumns(tableName);
      const primaryKey = columns.find((column) => column.primaryKey) ?? columns.find((column) => column.name.toLowerCase() === "id");
      if (!primaryKey) return res.status(409).json({ error: `${tableName} needs a primary key to edit records` });
      const id = legacyValue(primaryKey, req.params.id);
      const values = writableLegacyValues(columns, req.body, false, singularName);
      const assignments = values.map(({ column, value }) => Prisma.sql`${sqlIdentifier(column.name)} = ${value}`);
      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        UPDATE ${table}
        SET ${Prisma.join(assignments)}
        OUTPUT INSERTED.*
        WHERE ${sqlIdentifier(primaryKey.name)} = ${id}
      `);
      if (!rows[0]) return res.status(404).json({ error: `${singularName} not found` });
      return res.json({ data: rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  reportsRoutes.delete(`${path}/:id`, authorize("org:administer"), async (req, res, next) => {
    try {
      const columns = await legacyTableColumns(tableName);
      const primaryKey = columns.find((column) => column.primaryKey) ?? columns.find((column) => column.name.toLowerCase() === "id");
      if (!primaryKey) return res.status(409).json({ error: `${tableName} needs a primary key to delete records` });
      const id = legacyValue(primaryKey, req.params.id);
      const deleted = tableName === "tbl_Utility"
        ? await deleteUtility(z.coerce.number().int().positive().parse(req.params.id))
        : await prisma.$executeRaw(Prisma.sql`
        DELETE FROM ${table} WHERE ${sqlIdentifier(primaryKey.name)} = ${id}
      `);
      if (!deleted) return res.status(404).json({ error: `${singularName} not found` });
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });
}

registerLegacyOrganizationRoutes("/rates", "tbl_Rate", "Rate", false, ["UtilityId"]);
registerLegacyOrganizationRoutes("/brokers", "tbl_Broker", "Broker");
registerLegacyOrganizationRoutes("/suppliers", "tbl_Supplier", "Supplier");
registerLegacyOrganizationRoutes("/onsite-generations", "tbl_OnSiteGeneration", "OnSiteGeneration", true);
registerLegacyOrganizationRoutes("/pass-throughs", "tbl_PassThrough", "PassThrough", true);
registerLegacyOrganizationRoutes("/products", "tbl_Product", "Product", true);
registerLegacyOrganizationRoutes("/utilities", "tbl_Utility", "Utility", true);
registerLegacyOrganizationRoutes("/swings", "tbl_Swing", "Swing", true);
registerLegacyOrganizationRoutes("/types", "tbl_Type", "Type", true);

const utilityMeterValueSizeSchema = z.object({
  utilityId: z.coerce.number().int().positive("Utility is required"),
  size: z.coerce.number().int().min(0, "Size cannot be negative").max(1000, "Size cannot exceed 1,000")
});

reportsRoutes.get("/utility-meter-value-sizes", authorize("org:administer"), async (_req, res, next) => {
  try {
    const data = await prisma.$queryRaw<Array<{
      id: number;
      name: string | null;
      accountNumberSize: number | null;
      serviceRefSize: number | null;
    }>>`
      SELECT
        [id] AS id,
        [Utility] AS name,
        [AccountNumberSize] AS accountNumberSize,
        [ServiceRefSize] AS serviceRefSize
      FROM dbo.tbl_Utility
      ORDER BY [Utility]
    `;
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.put("/utility-meter-value-sizes/:field", authorize("org:administer"), async (req, res, next) => {
  try {
    const field = z.enum(["account-number", "service-ref"]).parse(req.params.field);
    const input = utilityMeterValueSizeSchema.parse(req.body);
    const rows = field === "account-number"
      ? await prisma.$queryRaw<Array<Record<string, unknown>>>`
          UPDATE dbo.tbl_Utility
          SET [AccountNumberSize] = ${input.size}
          OUTPUT
            INSERTED.[id] AS id,
            INSERTED.[Utility] AS name,
            INSERTED.[AccountNumberSize] AS accountNumberSize,
            INSERTED.[ServiceRefSize] AS serviceRefSize
          WHERE [id] = ${input.utilityId}
        `
      : await prisma.$queryRaw<Array<Record<string, unknown>>>`
          UPDATE dbo.tbl_Utility
          SET [ServiceRefSize] = ${input.size}
          OUTPUT
            INSERTED.[id] AS id,
            INSERTED.[Utility] AS name,
            INSERTED.[AccountNumberSize] AS accountNumberSize,
            INSERTED.[ServiceRefSize] AS serviceRefSize
          WHERE [id] = ${input.utilityId}
        `;
    if (!rows[0]) return res.status(404).json({ error: "Selected utility was not found" });
    return res.json({ data: rows[0] });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/rates/bulk", authorize("org:administer"), async (req, res, next) => {
  try {
    const input = z.object({
      utilityId: z.coerce.number().int().positive(),
      rows: z.array(z.record(z.unknown())).min(1).max(1000)
    }).parse(req.body);
    const columns = await legacyTableColumns("tbl_Rate");
    const editableColumns = columns.filter((column) => column.editable);
    const utilityColumn = editableColumns.find((column) => column.name.toLowerCase() === "utilityid");
    if (!utilityColumn) throw Object.assign(new Error("tbl_Rate.UtilityId is not configured"), { statusCode: 500 });
    const utilityRows = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT TOP (1) [id] FROM dbo.tbl_Utility WHERE [id] = ${input.utilityId}
    `;
    if (!utilityRows[0]) return res.status(400).json({ error: "Selected utility was not found" });
    const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const columnByHeader = new Map(editableColumns.map((column) => [normalizeHeader(column.name), column.name]));
    const mappedRows = input.rows.map((row, index) => {
      const mapped: Record<string, unknown> = {};
      for (const [header, value] of Object.entries(row)) {
        const columnName = columnByHeader.get(normalizeHeader(header));
        if (columnName) mapped[columnName] = value;
      }
      mapped[utilityColumn.name] = input.utilityId;
      try {
        return writableLegacyValues(columns, mapped, true, `Rate row ${index + 2}`, ["UtilityId"]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid rate data";
        throw Object.assign(new Error(`Row ${index + 2}: ${message}`), { statusCode: 400 });
      }
    });
    const table = Prisma.sql`${sqlIdentifier("dbo")}.${sqlIdentifier("tbl_Rate")}`;
    const imported = await prisma.$transaction(async (transaction) => {
      const records: Array<Record<string, unknown>> = [];
      for (const values of mappedRows) {
        const rows = await transaction.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          INSERT INTO ${table} (${Prisma.join(values.map(({ column }) => sqlIdentifier(column.name)))})
          OUTPUT INSERTED.*
          VALUES (${Prisma.join(values.map(({ value }) => value))})
        `);
        if (rows[0]) records.push(rows[0]);
      }
      return records;
    });
    return res.status(201).json({ imported: imported.length, data: imported });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/organization-notes", authorize("org:administer"), async (req, res, next) => {
  try {
    const take = Math.min(Math.max(Number(req.query.take ?? 500) || 500, 1), 500);
    const [total, notes] = await Promise.all([prisma.note.count(), prisma.note.findMany({
      orderBy: { updatedAt: "desc" },
      take,
      select: {
        id: true,
        content: true,
        relatedType: true,
        relatedId: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        org: { select: { id: true, name: true } }
      }
    })]);

    const companyIds = Array.from(new Set(notes
      .map((note) => note.companyId ?? (note.relatedType === "company" ? Number(note.relatedId) : 0))
      .filter((id) => Number.isInteger(id) && id > 0)));
    const companies = companyIds.length ? await prisma.$queryRaw<Array<{ id: number; name: string | null }>>(Prisma.sql`
      SELECT [id], [Company Name] AS [name]
      FROM dbo.tblCompany
      WHERE [id] IN (${Prisma.join(companyIds)})
    `) : [];
    const companyNames = new Map(companies.map((company) => [String(company.id), company.name ?? `Company ${company.id}`]));

    const memberIds = Array.from(new Set(notes.filter((note) => note.relatedType === "member").map((note) => note.relatedId)));
    const members = memberIds.length ? await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, firstName: true, lastName: true, email: true }
    }) : [];
    const memberNames = new Map(members.map((member) => [member.id, [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email]));

    return res.json({
      total,
      data: notes.map((note) => {
        const relatedName = note.relatedType === "company"
          ? companyNames.get(String(note.companyId ?? note.relatedId))
          : note.relatedType === "member"
            ? memberNames.get(note.relatedId)
            : undefined;
        return {
          id: note.id,
          content: sanitizeCompanyNoteContent(note.content),
          relatedType: note.relatedType,
          relatedId: note.relatedId,
          relatedName: relatedName ?? note.relatedId,
          companyId: note.companyId,
          authorId: note.user.id,
          authorName: [note.user.firstName, note.user.lastName].filter(Boolean).join(" ") || note.user.email,
          authorEmail: note.user.email,
          organizationId: note.org.id,
          organizationName: note.org.name,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        };
      })
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/tbl-companies", authorize("report:read"), async (req, res, next) => {
  try {
    // The Companies grid paginates locally, so load every company by default.
    const take = req.query.take === undefined
      ? undefined
      : Math.min(z.coerce.number().int().positive().parse(req.query.take), 500);
    const scope = await memberCompanyScope(req.user);
    const whereClause = `WHERE ${memberCompanyFilter("company.[id]", scope)} AND company.[isDeleted] = 0`;
    const countRows = await rawUnsafeRows<{ total: bigint | number }>(`SELECT COUNT(*) AS total FROM dbo.tblCompany company ${whereClause}`);
    const rows = await rawUnsafeRows<Record<string, unknown>>(`
      SELECT ${take === undefined ? "" : `TOP (${take})`}
        company.[id] AS id,
        company.[organizationId] AS organizationId,
        company.[ParentCompanyID] AS parentCompanyId,
        parent.[Company Name] AS parentCompanyName,
        CASE WHEN company.[ParentCompanyID] IS NULL THEN 'Company' ELSE 'Subcompany' END AS companyType,
        company.[Customer ID] AS customerId,
        company.[Company Name] AS companyName,
        company.[Legal Entity Name] AS legalEntityName,
        company.[Mailing Address] AS mailingAddress,
        company.[city] AS city,
        company.[state] AS state,
        company.[country] AS country,
        company.[postalCode] AS postalCode,
        company.[email] AS email,
        company.[Phone Number] AS phoneNumber,
        company.[Tax ID] AS taxId,
        company.[URL] AS url,
        company.[CompanyFolderID] AS companyFolderId,
        company.[ContractFolderID] AS contractFolderId,
        company.[UtilityBillsFolderID] AS utilityBillsFolderId,
        company.[isDeleted] AS isDeleted,
        company.[isActive] AS isActive,
        company.[createdAt] AS createdAt,
        company.[updatedAt] AS updatedAt
      FROM dbo.tblCompany company
      LEFT JOIN dbo.tblCompany parent ON parent.[id] = company.[ParentCompanyID]
      ${whereClause}
      ORDER BY COALESCE(company.[ParentCompanyID], company.[id]),
        CASE WHEN company.[ParentCompanyID] IS NULL THEN 0 ELSE 1 END,
        company.[Company Name]
    `);
    const companyIds = rows.map((row) => Number(row.id));
    const notesByCompany = new Map<string, string>();
    // Keep each lookup below SQL Server's parameter limit for large tables.
    for (let offset = 0; offset < companyIds.length; offset += 1000) {
      const notes = await prisma.$queryRaw<Array<{ companyId: number; content: string }>>(Prisma.sql`
      SELECT [companyId], [content]
      FROM dbo.aae_notes
      WHERE [companyId] IN (${Prisma.join(companyIds.slice(offset, offset + 1000))})
      ORDER BY [updatedAt] DESC
      `);
      for (const note of notes) {
        if (!notesByCompany.has(String(note.companyId))) notesByCompany.set(String(note.companyId), sanitizeCompanyNoteContent(note.content));
      }
    }

    return res.json({
      total: Number(countRows[0]?.total ?? 0),
      data: rows.map((row) => ({ ...row, notes: notesByCompany.get(String(row.id)) ?? "" }))
=======
reportsRoutes.get("/tbl-companies", authorize("report:read"), async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take ?? 100), 500);
    const countRows = await rawUnsafeRows<{ total: bigint | number }>("SELECT COUNT(*) AS total FROM dbo.tblCompany");
    const rows = await rawUnsafeRows<Record<string, unknown>>(`
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
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/tbl-companies/:id/documents", authorize("report:read"), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
<<<<<<< HEAD
    const scope = await memberCompanyScope(req.user);
    if (scope !== null && !scope.includes(id)) return res.status(404).json({ error: "Company not found" });
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
    const company = await findTblCompanyById(id);
    if (!company) return res.status(404).json({ error: "Company not found" });

    const documents = await listCompanySharePointDocuments({
      companyFolderId: typeof company.companyFolderId === "string" ? company.companyFolderId : null,
      contractFolderId: typeof company.contractFolderId === "string" ? company.contractFolderId : null,
      utilityBillsFolderId: typeof company.utilityBillsFolderId === "string" ? company.utilityBillsFolderId : null
    });

<<<<<<< HEAD
    return res.json({ ...documents, company: { id: company.id, companyName: company.companyName } });
=======
    return res.json(documents);
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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

<<<<<<< HEAD
const emptyStringToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const emptyParentCompanyToUndefined = (value: unknown) => {
  if (value === null || value === 0 || (typeof value === "string" && value.trim() === "")) return undefined;
  return value;
};

const optionalText = z.preprocess(emptyStringToUndefined, z.string().trim().optional());
=======
const optionalText = z.preprocess(emptyStringToUndefined, z.string().trim().optional());
const optionalNumber = z.preprocess(emptyStringToUndefined, z.coerce.number().optional());
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
const optionalPositiveInt = z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().optional());
const optionalDate = z.preprocess(emptyStringToUndefined, z.coerce.date().optional());

async function rawUnsafeRows<T>(query: string) {
  return await prisma.$queryRawUnsafe(query) as T[];
}

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
<<<<<<< HEAD
  memberType: z.enum(["admin", "member", "user"]).optional(),
  notes: z.string().max(10000).default(""),
  password: z.string().min(12)
});

reportsRoutes.get("/tbl-companies/:id/activities", authorize("company:read"), async (req, res, next) => {
  try {
    const companyId = z.coerce.number().int().positive().parse(req.params.id);
    const scope = await memberCompanyScope(req.user);
    if (scope !== null && !scope.includes(companyId)) return res.status(404).json({ error: "Company not found" });
    const company = await findTblCompanyById(companyId);
    if (!company) return res.status(404).json({ error: "Company not found" });
    const orgId = req.user?.role === "superadmin" ? undefined : req.user?.orgId ?? undefined;
    const activities = await prisma.task.findMany({
      where: {
        relatedType: "tblCompanyActivity",
        relatedId: String(companyId),
        ...(orgId ? { orgId } : {})
      },
      orderBy: { createdAt: "desc" },
      include: { assignee: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }
    });
    return res.json({ company: { id: company.id, companyName: company.companyName }, data: await attachActivityConversation(activities) });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/tbl-companies/:id/activities", async (req, res, next) => {
  try {
    const companyId = z.coerce.number().int().positive().parse(req.params.id);
    const input = z.object({
      type: z.enum(["note", "todo"]),
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().min(1).max(10000),
      assigneeId: z.string().trim().min(1),
      dueDate: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium")
    }).parse(req.body);
    const company = await findTblCompanyById(companyId);
    if (!company) return res.status(404).json({ error: "Company not found" });

    const assignee = await prisma.user.findFirst({
      where: {
        id: input.assigneeId,
        NOT: { id: req.user!.id },
        role: { in: TAGGABLE_TEAM_ROLES },
        status: "active",
        ...(req.user?.role !== "superadmin" && req.user?.orgId ? { orgId: req.user.orgId } : {})
      },
      select: { id: true, orgId: true }
    });
    if (!assignee) return res.status(400).json({ error: "Select an active team member from your organization." });
    const orgId = req.user?.orgId ?? assignee.orgId;
    if (!orgId) return res.status(400).json({ error: "An organization is required to create an activity." });

    const activity = await prisma.task.create({
      data: {
        orgId,
        title: input.title,
        description: input.description,
        dueDate: input.type === "todo" ? input.dueDate : undefined,
        status: input.type === "note" ? "note" : "open",
        priority: input.type === "note" ? "note" : input.priority,
        assigneeId: assignee.id,
        relatedType: "tblCompanyActivity",
        relatedId: String(companyId)
      },
      include: { assignee: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }
    });
    await prisma.auditLog.create({
      data: {
        orgId,
        userId: req.user!.id,
        action: "tagged",
        module: "CompanyActivity",
        objectType: "companyActivity",
        objectId: activity.id,
        newValue: JSON.stringify({ companyId, assigneeId: assignee.id, type: input.type })
      }
    });
    if (assignee.id !== req.user!.id) {
      const companyName = String(company.companyName ?? `Company ${companyId}`);
      await prisma.notification.create({
        data: {
          userId: assignee.id,
          type: "company_activity",
          title: `${input.type === "todo" ? "To-do" : "Note"}: ${input.title}`,
          message: `You were tagged in an activity for ${companyName}.`,
          actionUrl: `/activity?companyId=${companyId}`
        }
      });
    }
    return res.status(201).json({ data: activity });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/company-activities/:activityId/replies", async (req, res, next) => {
  try {
    const activityId = z.string().trim().min(1).parse(req.params.activityId);
    const input = z.object({ content: z.string().trim().min(1).max(5000) }).parse(req.body);
    const orgId = req.user?.role === "superadmin" ? undefined : req.user?.orgId ?? undefined;
    const activity = await prisma.task.findFirst({
      where: { id: activityId, relatedType: "tblCompanyActivity", ...(orgId ? { orgId } : {}) },
      select: { id: true, orgId: true, assigneeId: true, relatedId: true, title: true }
    });
    if (!activity) return res.status(404).json({ error: "Company activity not found" });
    const reply = await prisma.note.create({
      data: {
        orgId: activity.orgId,
        userId: req.user!.id,
        relatedType: "companyActivityReply",
        relatedId: activity.id,
        companyId: activity.relatedId ? Number(activity.relatedId) : null,
        content: sanitizeCompanyNoteContent(input.content)
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }
    });
    const creatorEvent = await prisma.auditLog.findFirst({
      where: { objectType: "companyActivity", objectId: activity.id, action: "tagged" },
      orderBy: { createdAt: "asc" },
      select: { userId: true }
    });
    const recipientId = req.user!.id === activity.assigneeId ? creatorEvent?.userId : activity.assigneeId;
    if (recipientId && recipientId !== req.user!.id) {
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { email: true, firstName: true }
      });
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: "company_activity_reply",
          title: `Reply: ${activity.title}`,
          message: input.content.trim().slice(0, 250),
          actionUrl: `/activity?companyId=${activity.relatedId}`
        }
      });
      if (recipient) {
        try {
          await emailService.sendActivityAlert({
            email: recipient.email,
            firstName: recipient.firstName,
            subject: `Activity reply: ${activity.title}`,
            heading: `A reply was added to ${activity.title}`,
            message: input.content.trim(),
            actionPath: `/activity?companyId=${activity.relatedId}`
          });
        } catch (emailError) {
          console.error("Unable to send activity reply email", emailError);
        }
      }
    }
    return res.status(201).json({ data: reply });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.patch("/company-activities/:activityId", async (req, res, next) => {
  try {
    const activityId = z.string().trim().min(1).parse(req.params.activityId);
    const input = z.object({ status: z.enum(["open", "completed"]) }).parse(req.body);
    const orgId = req.user?.role === "superadmin" ? undefined : req.user?.orgId ?? undefined;
    const existing = await prisma.task.findFirst({
      where: { id: activityId, relatedType: "tblCompanyActivity", status: { not: "note" }, ...(orgId ? { orgId } : {}) },
      select: { id: true }
    });
    if (!existing) return res.status(404).json({ error: "Company activity not found" });
    const activity = await prisma.task.update({ where: { id: activityId }, data: { status: input.status } });
    return res.json({ data: activity });
  } catch (error) {
    return next(error);
  }
});

const memberUpdateSchema = memberCreateSchema.extend({
  password: z.preprocess(emptyStringToUndefined, z.string().min(12).optional())
});

function manageableMemberWhere(id: string | undefined, user: { role: string; orgId: string | null } | undefined) {
  return {
    ...(id ? { id } : {}),
    role: { in: user?.role === "superadmin" ? ["admin", "user", "member"] : ["user", "member"] },
    status: { not: "deleted" },
    ...(user?.role !== "superadmin" && user?.orgId ? { orgId: user.orgId } : {})
  };
}

async function softDeleteMembers(
  ids: string[],
  user: { id: string; role: string; orgId: string | null } | undefined
) {
  const members = await prisma.user.findMany({
    where: { ...manageableMemberWhere(undefined, user), id: { in: ids } },
    select: { id: true }
  });
  if (!members.length) return 0;

  const memberIds = members.map((member) => member.id);
  const now = new Date();
  await prisma.$transaction([
    prisma.refreshToken.updateMany({
      where: { userId: { in: memberIds }, revoked: false },
      data: { revoked: true, revokedAt: now }
    }),
    prisma.userSession.updateMany({
      where: { userId: { in: memberIds }, revokedAt: null },
      data: { revokedAt: now }
    }),
    ...members.map((member) => prisma.user.update({
      where: { id: member.id },
      data: {
        email: `deleted+${member.id}@allamericanenergy.invalid`,
        username: null,
        status: "deleted",
        emailVerified: false,
        mustChangePassword: false,
        updatedBy: user?.id
      }
    }))
  ]);

  return members.length;
}

async function saveMemberNote(memberId: string, content: string, user: { id: string; orgId: string | null } | undefined) {
  const sanitizedContent = sanitizeCompanyNoteContent(content);
  const existing = await prisma.note.findFirst({
    where: { relatedType: "member", relatedId: memberId },
    orderBy: { updatedAt: "desc" },
    select: { id: true }
  });
  if (existing) {
    await prisma.note.update({ where: { id: existing.id }, data: { content: sanitizedContent } });
    return;
  }
  if (!sanitizedContent.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, "").trim()) return;
  if (!user?.orgId) throw Object.assign(new Error("An organization is required to save member notes"), { statusCode: 400 });
  await prisma.note.create({
    data: { orgId: user.orgId, userId: user.id, relatedType: "member", relatedId: memberId, content: sanitizedContent }
  });
}

async function uniqueMemberLoginEmail(firstName: string, lastName: string) {
  const name = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, "").replace(/^\.+|\.+$/g, "") || "member";
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const candidate = `${name}${suffix || ""}@allamericanenergy.com`;
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: candidate }, { username: candidate }] },
      select: { id: true }
    });
    if (!exists) return candidate;
  }
  return `${name}.${Date.now()}@allamericanenergy.com`;
}

async function findTblContractById(id: number): Promise<Record<string, unknown> | undefined> {
=======
  password: z.string().min(12)
});

async function findTblContractById(id: number) {
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
      c.[Swing] AS swingId,
      c.[PassThrough] AS passThroughId,
      c.[BillType] AS billTypeId,
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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

<<<<<<< HEAD
  const contract = rows[0];
  if (!contract) return undefined;
  const [note, swings, passThroughs, billTypes] = await Promise.all([
    prisma.note.findFirst({
      where: { relatedType: "contract", relatedId: String(id) },
      orderBy: { updatedAt: "desc" },
      select: { content: true }
    }),
    legacyLookupRows("tbl_Swing", ["Swing", "Type", "Name"]),
    legacyLookupRows("tbl_PassThrough", ["PassThrough", "Pass Through", "Type", "Name"]),
    legacyLookupRows("tbl_BillType", ["BillType", "Bill Type", "Type", "Name"])
  ]);
  const lookupName = (items: Array<Record<string, unknown>>, value: unknown) => items.find((item) => String(item.id) === String(value))?.name ?? null;
  return {
    ...contract,
    swing: lookupName(swings, contract.swingId),
    passThrough: lookupName(passThroughs, contract.passThroughId),
    billType: lookupName(billTypes, contract.billTypeId),
    notes: note ? sanitizeCompanyNoteContent(note.content) : ""
  };
=======
  return rows[0];
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
}

reportsRoutes.get("/members", authorize("report:read"), async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take ?? 100), 500);
    const companyId = req.query.companyId ? z.coerce.number().int().positive().parse(req.query.companyId) : null;
<<<<<<< HEAD
    const scope = await memberCompanyScope(req.user);
    if (companyId && scope !== null && !scope.includes(companyId)) {
      return res.json({ total: 0, data: [] });
    }
    const companyFilter = companyId ? await companyMemberAssignments(companyId) : null;
    const where = {
      role: { in: req.user?.role === "superadmin" ? ["admin", "user", "member"] : ["user", "member"] },
      status: { not: "deleted" },
      ...(companyFilter !== null ? { company: { in: companyFilter } } : {}),
      ...(scope !== null && !companyId ? { AND: [{ company: { in: scope.map(String) } }] } : {})
=======
    const companyFilter = companyId ? String(companyId) : undefined;
    const where = {
      role: { in: ["user", "member"] },
      ...(companyFilter ? { company: companyFilter } : {})
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
          username: true,
          temporaryPasswordEncrypted: req.user?.role === "superadmin",
          mustChangePassword: true,
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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

<<<<<<< HEAD
    const companyIds = [...new Set(rows
      .map((row) => row.company?.trim() ?? "")
      .filter((value) => /^\d+$/.test(value))
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0 && value <= 2147483647))];
    const companies = companyIds.length ? await prisma.$queryRaw<Array<{ id: number; companyName: string | null }>>(Prisma.sql`
      SELECT [id], [Company Name] AS [companyName]
      FROM dbo.tblCompany
      WHERE [id] IN (${Prisma.join(companyIds)})
    `) : [];
    const companyNames = new Map(companies.map((company) => [company.id, company.companyName]));

    const notes = rows.length ? await prisma.note.findMany({
      where: { relatedType: "member", relatedId: { in: rows.map((row) => row.id) } },
      orderBy: { updatedAt: "desc" },
      select: { relatedId: true, content: true }
    }) : [];
    const notesByMember = new Map<string, string>();
    for (const note of notes) {
      if (!notesByMember.has(note.relatedId)) notesByMember.set(note.relatedId, sanitizeCompanyNoteContent(note.content));
    }

    return res.json({
      total,
      data: rows.map((row: { company: string | null; role: string; status: string; [key: string]: unknown }) => ({
        ...Object.fromEntries(Object.entries(row).filter(([key]) => key !== "temporaryPasswordEncrypted")),
        ...(req.user?.role === "superadmin" ? { password: row.mustChangePassword ? decryptMemberPassword(row.temporaryPasswordEncrypted as string | null) : null } : {}),
        companyId: row.company,
        companyName: /^\d+$/.test(row.company?.trim() ?? "")
          ? companyNames.get(Number(row.company)) ?? null
          : row.company,
        loginEmail: row.username,
        roleName: row.role === "admin" ? "Admin" : row.role === "member" ? "Member" : "User",
        isActive: row.status === "active",
        notes: notesByMember.get(String(row.id)) ?? ""
=======
    return res.json({
      total,
      data: rows.map((row: { company: string | null; role: string; status: string; [key: string]: unknown }) => ({
        ...row,
        companyId: row.company,
        roleName: row.role === "member" ? "Member" : "User",
        isActive: row.status === "active"
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
    if (input.memberType === "admin" && req.user?.role !== "superadmin") {
      return res.status(403).json({ error: "Only Superadmin can create an Admin account." });
    }
    const deliveryEmail = input.email.toLowerCase();
    const existingDeliveryEmail = await prisma.user.findFirst({
      where: { OR: [{ email: deliveryEmail }, { username: deliveryEmail }] },
      select: { id: true }
    });
    if (existingDeliveryEmail) return res.status(409).json({ error: "A member with this email already exists" });
    const loginEmail = await uniqueMemberLoginEmail(input.firstName, input.lastName);
    const member = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: deliveryEmail,
        username: loginEmail,
=======
    await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
        phone: input.phone ?? null,
        company: input.companyId ? String(input.companyId) : input.company ?? null,
        department: input.department ?? null,
        designation: input.designation ?? null,
        passwordHash: await bcrypt.hash(input.password, 12),
<<<<<<< HEAD
        temporaryPasswordEncrypted: encryptMemberPassword(input.password),
        role: input.memberType ?? "member",
        status: "active",
        emailVerified: true,
        mustChangePassword: true,
        orgId: req.user?.orgId ?? null,
        createdBy: req.user?.id
      },
      select: { id: true }
    });
    await saveMemberNote(member.id, input.notes, req.user);

    return res.status(201).json({ ok: true, loginEmail, emailSent: false });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.patch("/members/bulk-status", authorize("company:update"), async (req, res, next) => {
  try {
    requireMemberManager(req.user?.role);
    const input = z.object({
      ids: z.array(z.string().trim().min(1)).min(1).max(500).transform((ids) => Array.from(new Set(ids))),
      isActive: z.boolean()
    }).parse(req.body);
    const result = await prisma.user.updateMany({
      where: { ...manageableMemberWhere(undefined, req.user), id: { in: input.ids } },
      data: { status: input.isActive ? "active" : "inactive", updatedBy: req.user?.id }
    });
    return res.json({ updated: result.count, isActive: input.isActive });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.delete("/members/bulk", authorize("company:delete"), async (req, res, next) => {
  try {
    requireMemberManager(req.user?.role);
    const input = z.object({
      ids: z.array(z.string().trim().min(1)).min(1).max(500).transform((ids) => Array.from(new Set(ids)))
    }).parse(req.body);
    const deleted = await softDeleteMembers(input.ids, req.user);
    return res.json({ deleted });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.patch("/members/:id", authorize("company:update"), async (req, res, next) => {
  try {
    requireMemberManager(req.user?.role);
    const id = z.string().trim().min(1).parse(req.params.id);
    const member = await prisma.user.findFirst({ where: manageableMemberWhere(id, req.user), select: { id: true } });
    if (!member) return res.status(404).json({ error: "Member not found" });
    const input = memberUpdateSchema.parse(req.body);
    const deliveryEmail = input.email.toLowerCase();
    const duplicateEmail = await prisma.user.findFirst({
      where: { id: { not: id }, OR: [{ email: deliveryEmail }, { username: deliveryEmail }] },
      select: { id: true }
    });
    if (duplicateEmail) return res.status(409).json({ error: "A member with this email already exists" });
    await prisma.user.update({
      where: { id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: deliveryEmail,
        phone: input.phone ?? null,
        company: input.companyId ? String(input.companyId) : input.company ?? null,
        department: input.department ?? null,
        designation: input.designation ?? null,
        ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 12), temporaryPasswordEncrypted: encryptMemberPassword(input.password), mustChangePassword: true } : {}),
        updatedBy: req.user?.id
      }
    });
    await saveMemberNote(id, input.notes, req.user);
    return res.json({ ok: true });
=======
        role: "member",
        status: "active",
        emailVerified: true,
        orgId: req.user?.orgId ?? null,
        createdBy: req.user?.id
      }
    });

    return res.status(201).json({ ok: true });
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
  } catch (error) {
    return next(error);
  }
});

<<<<<<< HEAD
reportsRoutes.delete("/members/:id", authorize("company:delete"), async (req, res, next) => {
  try {
    requireMemberManager(req.user?.role);
    const id = z.string().trim().min(1).parse(req.params.id);
    const deleted = await softDeleteMembers([id], req.user);
    if (!deleted) {
      const alreadyDeleted = await prisma.user.findFirst({
        where: { ...manageableMemberWhere(id, req.user), status: "deleted" },
        select: { id: true }
      });
      if (!alreadyDeleted) return res.status(404).json({ error: "Member not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

async function findTblCompanyById(id: number): Promise<Record<string, unknown> | undefined> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT TOP (1)
      company.[id] AS id,
      company.[organizationId] AS organizationId,
      company.[ParentCompanyID] AS parentCompanyId,
      parent.[Company Name] AS parentCompanyName,
      CASE WHEN company.[ParentCompanyID] IS NULL THEN 'Company' ELSE 'Subcompany' END AS companyType,
      company.[Customer ID] AS customerId,
      company.[Company Name] AS companyName,
      company.[Legal Entity Name] AS legalEntityName,
      company.[Mailing Address] AS mailingAddress,
      company.[city] AS city,
      company.[state] AS state,
      company.[country] AS country,
      company.[postalCode] AS postalCode,
      company.[email] AS email,
      company.[Phone Number] AS phoneNumber,
      company.[Tax ID] AS taxId,
      company.[URL] AS url,
      company.[CompanyFolderID] AS companyFolderId,
      company.[ContractFolderID] AS contractFolderId,
      company.[UtilityBillsFolderID] AS utilityBillsFolderId,
      company.[isActive] AS isActive,
      company.[createdAt] AS createdAt,
      company.[updatedAt] AS updatedAt
    FROM dbo.tblCompany company
    LEFT JOIN dbo.tblCompany parent ON parent.[id] = company.[ParentCompanyID]
    WHERE company.[id] = ${id} AND company.[isDeleted] = 0
  `;

  const company = rows[0];
  if (!company) return undefined;
  const notes = await prisma.$queryRaw<Array<{ content: string }>>`
    SELECT TOP (1) [content]
    FROM dbo.aae_notes
    WHERE [companyId] = ${id}
    ORDER BY [updatedAt] DESC
  `;
  const note = notes[0];
  return { ...(company as Record<string, unknown>), notes: note ? sanitizeCompanyNoteContent(note.content) : "" };
=======
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
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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

<<<<<<< HEAD
async function findTblMeterById(id: number): Promise<Record<string, unknown> | undefined> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT TOP (1)
      m.[id] AS id,
      m.[Utility Account Name] AS utilityAccountName,
=======
async function findTblMeterById(id: number) {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT TOP (1)
      m.[id] AS id,
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
      u.[AccountNumberSize] AS accountNumberSize,
      u.[ServiceRefSize] AS serviceRefSize,
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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

<<<<<<< HEAD
  const meter = rows[0];
  if (!meter) return undefined;
  const note = await prisma.note.findFirst({
    where: { relatedType: "meter", relatedId: String(id) },
    orderBy: { updatedAt: "desc" },
    select: { content: true }
  });
  return { ...meter, notes: note ? sanitizeCompanyNoteContent(note.content) : "" };
}

async function findTblProductNameById(id: number) {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT TOP (1) [Product] AS [name]
    FROM dbo.tbl_Product
    WHERE [id] = ${id}
  `;
  return rows[0]?.name;
}

async function legacyLookupRows(tableName: string, preferredNameColumns: string[]) {
  const columns = await legacyTableColumns(tableName);
  const idColumn = columns.find((column) => column.primaryKey) ?? columns.find((column) => column.name.toLowerCase() === "id");
  const nameColumn = preferredNameColumns
    .map((name) => columns.find((column) => column.name.toLowerCase() === name.toLowerCase()))
    .find(Boolean) ?? columns.find((column) => column.editable && column.name !== idColumn?.name);
  if (!idColumn || !nameColumn) throw Object.assign(new Error(`${tableName} needs ID and display columns`), { statusCode: 500 });
  const table = Prisma.sql`${sqlIdentifier("dbo")}.${sqlIdentifier(tableName)}`;
  return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT ${sqlIdentifier(idColumn.name)} AS [id], ${sqlIdentifier(nameColumn.name)} AS [name]
    FROM ${table}
    ORDER BY ${sqlIdentifier(nameColumn.name)}
  `);
}

async function legacyRateLookupRows() {
  const columns = await legacyTableColumns("tbl_Rate");
  const idColumn = columns.find((column) => column.primaryKey) ?? columns.find((column) => column.name.toLowerCase() === "id");
  const nameColumn = ["Rate", "Name"]
    .map((name) => columns.find((column) => column.name.toLowerCase() === name.toLowerCase()))
    .find(Boolean) ?? columns.find((column) => column.editable && column.name !== idColumn?.name);
  const utilityColumn = columns.find((column) => column.name.toLowerCase() === "utilityid");
  if (!idColumn || !nameColumn) throw Object.assign(new Error("tbl_Rate needs ID and display columns"), { statusCode: 500 });
  const table = Prisma.sql`${sqlIdentifier("dbo")}.${sqlIdentifier("tbl_Rate")}`;

  if (!utilityColumn) return legacyLookupRows("tbl_Rate", ["Rate", "Name"]);

  return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT
      ${sqlIdentifier(idColumn.name)} AS [id],
      ${sqlIdentifier(nameColumn.name)} AS [name],
      ${sqlIdentifier(utilityColumn.name)} AS [utilityId]
    FROM ${table}
    ORDER BY ${sqlIdentifier(utilityColumn.name)}, ${sqlIdentifier(nameColumn.name)}
  `);
=======
  return rows[0];
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
}

reportsRoutes.get("/contract-lookups", authorize("report:read"), async (_req, res, next) => {
  try {
<<<<<<< HEAD
    const [brokers, suppliers, swings, passThroughs, billTypes, products] = await Promise.all([
      legacyLookupRows("tbl_Broker", ["Broker", "Name"]),
      legacyLookupRows("tbl_Supplier", ["Supplier", "Name"]),
      legacyLookupRows("tbl_Swing", ["Swing", "Type", "Name"]),
      legacyLookupRows("tbl_PassThrough", ["PassThrough", "Pass Through", "Type", "Name"]),
      legacyLookupRows("tbl_BillType", ["BillType", "Bill Type", "Type", "Name"]),
      legacyLookupRows("tbl_Product", ["Product", "Name"])
    ]);

    return res.json({ brokers, suppliers, swings, passThroughs, billTypes, products });
=======
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
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/contracts", authorize("report:read"), async (req, res, next) => {
  try {
<<<<<<< HEAD
    const take = z.coerce.number().int().min(1).max(500).default(100).parse(req.query.take);
    const skip = z.coerce.number().int().min(0).default(0).parse(req.query.skip);
    const meterId = req.query.meterId ? z.coerce.number().int().positive().parse(req.query.meterId) : null;
    const companyId = req.query.companyId ? z.coerce.number().int().positive().parse(req.query.companyId) : null;
    const scope = await memberCompanyScope(req.user);
    const whereClause = `WHERE ${memberCompanyFilter("cmc.[companyId]", scope)}${companyId ? ` AND cmc.[companyId] = ${companyId}` : ""}${meterId ? " AND cmc.[companyId] IS NOT NULL" : ""}`;
=======
    const take = Math.min(Number(req.query.take ?? 100), 500);
    const companyId = req.query.companyId ? z.coerce.number().int().positive().parse(req.query.companyId) : null;
    const whereClause = companyId ? `WHERE cmc.[companyId] = ${companyId}` : "";
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
    const contractCompanyApply = `
      OUTER APPLY (
        SELECT TOP (1) link.[CompanyID] AS companyId
        FROM dbo.tbl_CompanyMeterContract link
        WHERE link.[ContractID] = c.[id]
<<<<<<< HEAD
          AND ${memberCompanyFilter("link.[CompanyID]", scope)}
          ${companyId ? `AND link.[CompanyID] = ${companyId}` : ""}
          ${meterId ? `AND link.[MeterID] = ${meterId}` : ""}
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
      ) cmc
    `;
    const countRows = await rawUnsafeRows<{ total: bigint | number }>(`
      SELECT COUNT(*) AS total
      FROM dbo.tbl_Contract c
      ${contractCompanyApply}
      ${whereClause}
    `);
    const rows = await rawUnsafeRows<Record<string, unknown>>(`
<<<<<<< HEAD
      SELECT
=======
      SELECT TOP (${take})
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
        c.[id] AS id,
        c.[ContractID] AS contractId,
        cmc.[companyId] AS companyId,
        co.[Company Name] AS companyName,
        c.[Broker] AS brokerId,
        b.[Broker] AS broker,
        c.[Supplier] AS supplierId,
        s.[supplier] AS supplier,
<<<<<<< HEAD
        c.[Swing] AS swingId,
        c.[PassThrough] AS passThroughId,
        c.[BillType] AS billTypeId,
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
      ORDER BY c.[updatedAt] DESC, c.[id] DESC
      OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
    `);

    const contractIds = rows.map((row) => String(row.id));
    const [notes, swings, passThroughs, billTypes] = await Promise.all([
      contractIds.length ? prisma.note.findMany({
        where: { relatedType: "contract", relatedId: { in: contractIds } },
        orderBy: { updatedAt: "desc" },
        select: { relatedId: true, content: true }
      }) : [],
      legacyLookupRows("tbl_Swing", ["Swing", "Type", "Name"]),
      legacyLookupRows("tbl_PassThrough", ["PassThrough", "Pass Through", "Type", "Name"]),
      legacyLookupRows("tbl_BillType", ["BillType", "Bill Type", "Type", "Name"])
    ]);
    const notesByContract = new Map<string, string>();
    for (const note of notes) {
      if (!notesByContract.has(note.relatedId)) notesByContract.set(note.relatedId, sanitizeCompanyNoteContent(note.content));
    }

    const swingNames = new Map(swings.map((item) => [String(item.id), item.name]));
    const passThroughNames = new Map(passThroughs.map((item) => [String(item.id), item.name]));
    const billTypeNames = new Map(billTypes.map((item) => [String(item.id), item.name]));

    return res.json({
      total: Number(countRows[0]?.total ?? 0),
      data: rows.map((row) => ({
        ...row,
        swing: swingNames.get(String(row.swingId)) ?? null,
        passThrough: passThroughNames.get(String(row.passThroughId)) ?? null,
        billType: billTypeNames.get(String(row.billTypeId)) ?? null,
        notes: notesByContract.get(String(row.id)) ?? ""
      }))
=======
      ORDER BY c.[updatedAt] DESC
    `);

    return res.json({
      total: Number(countRows[0]?.total ?? 0),
      data: rows
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/meters", authorize("report:read"), async (req, res, next) => {
  try {
<<<<<<< HEAD
    const scope = await memberCompanyScope(req.user);
    const take = z.coerce.number().int().min(1).max(500).default(100).parse(req.query.take);
    const skip = z.coerce.number().int().min(0).default(0).parse(req.query.skip);
    const contractId = req.query.contractId ? z.coerce.number().int().positive().parse(req.query.contractId) : null;
=======
    const take = Math.min(Number(req.query.take ?? 100), 500);
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
    const companyId = req.query.companyId ? z.coerce.number().int().positive().parse(req.query.companyId) : null;
    const state = req.query.state ? z.string().trim().min(1).parse(req.query.state) : null;
    const utilityId = req.query.utilityId ? z.coerce.number().int().positive().parse(req.query.utilityId) : null;
    const productId = req.query.productId ? z.coerce.number().int().positive().parse(req.query.productId) : null;
    const filters = [
<<<<<<< HEAD
      memberCompanyFilter("m.[CompanyID]", scope),
      companyId ? `m.[CompanyID] = ${companyId}` : null,
      state ? `m.[State] = '${state.replace(/'/g, "''")}'` : null,
      utilityId ? `m.[UtilityId] = ${utilityId}` : null,
      productId ? `m.[ProductId] = ${productId}` : null,
      contractId ? `EXISTS (SELECT 1 FROM dbo.tbl_CompanyMeterContract link WHERE link.[MeterID] = m.[id] AND link.[CompanyID] = m.[CompanyID] AND link.[ContractID] = ${contractId})` : null
=======
      companyId ? `m.[CompanyID] = ${companyId}` : null,
      state ? `m.[State] = '${state.replace(/'/g, "''")}'` : null,
      utilityId ? `m.[UtilityId] = ${utilityId}` : null,
      productId ? `m.[ProductId] = ${productId}` : null
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
    ].filter(Boolean);
    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const countRows = await rawUnsafeRows<{ total: bigint | number }>(
      `SELECT COUNT(*) AS total FROM dbo.tbl_MeterList m ${whereClause}`
    );
    const rows = await rawUnsafeRows<Record<string, unknown>>(`
<<<<<<< HEAD
      SELECT
        m.[id] AS id,
        m.[Utility Account Name] AS utilityAccountName,
=======
      SELECT TOP (${take})
        m.[id] AS id,
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
        man.[AccountNumber] AS masterAccountNumber,
        man.[MasterAccountNumber] AS masterAccountNumberType,
        man.[ServiceRefPodId] AS masterServiceRefPodId,
        u.[AccountNumberSize] AS accountNumberSize,
        u.[ServiceRefSize] AS serviceRefSize,
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
        m.[IsActive] AS isActive,
        m.[CreatedAt] AS createdAt,
        m.[UpdatedAt] AS updatedAt
      FROM dbo.tbl_MeterList m
      LEFT JOIN dbo.tblCompany co ON m.[CompanyID] = co.[id]
      LEFT JOIN dbo.tbl_Type t ON m.[TypeId] = t.[id]
      LEFT JOIN dbo.tbl_Product p ON m.[ProductId] = p.[id]
      LEFT JOIN dbo.tbl_Utility u ON m.[UtilityId] = u.[id]
<<<<<<< HEAD
      LEFT JOIN dbo.tblMasterAccountNumber man ON m.[UtilityId] = man.[UtilityId]
      LEFT JOIN dbo.tbl_Status st ON m.[StatusId] = st.[id]
      ${whereClause}
      ORDER BY m.[UpdatedAt] DESC, m.[id] DESC
      OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
    `);

    const meterIds = rows.map((row) => String(row.id));
    const notes = meterIds.length ? await prisma.note.findMany({
      where: { relatedType: "meter", relatedId: { in: meterIds } },
      orderBy: { updatedAt: "desc" },
      select: { relatedId: true, content: true }
    }) : [];
    const notesByMeter = new Map<string, string>();
    for (const note of notes) {
      if (!notesByMeter.has(note.relatedId)) notesByMeter.set(note.relatedId, sanitizeCompanyNoteContent(note.content));
    }

    return res.json({
      total: Number(countRows[0]?.total ?? 0),
      data: rows.map((row) => ({ ...row, notes: notesByMeter.get(String(row.id)) ?? "" }))
=======
      LEFT JOIN dbo.tbl_Status st ON m.[StatusId] = st.[id]
      ${whereClause}
      ORDER BY m.[UpdatedAt] DESC
    `);

    return res.json({
      total: Number(countRows[0]?.total ?? 0),
      data: rows
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/meter-lookups", authorize("report:read"), async (_req, res, next) => {
  try {
<<<<<<< HEAD
    const [iEnergyBills, energyDashboards, onSiteGenerations, types, products, utilities, statuses, taxExempts, rates] = await Promise.all([
=======
    const [iEnergyBills, energyDashboards, onSiteGenerations, types, products, utilities, statuses] = await Promise.all([
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Type] AS name FROM dbo.tbl_iEnergyBill ORDER BY [Type]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Type] AS name FROM dbo.tbl_EnergyDashboard ORDER BY [Type]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Type] AS name FROM dbo.tbl_OnSiteGeneration ORDER BY [Type]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Type] AS name FROM dbo.tbl_Type ORDER BY [Type]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Product] AS name FROM dbo.tbl_Product ORDER BY [Product]`,
<<<<<<< HEAD
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          u.[id] AS id,
          u.[Utility] AS name,
          u.[AccountNumberSize] AS accountNumberSize,
          u.[ServiceRefSize] AS serviceRefSize,
          m.[AccountNumber] AS accountNumberRequired,
          m.[ServiceRefPodId] AS serviceRefRequired
        FROM dbo.tbl_Utility u
        LEFT JOIN dbo.tblMasterAccountNumber m ON m.[UtilityId] = u.[id]
        ORDER BY u.[Utility]
      `,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Status] AS name FROM dbo.tbl_Status ORDER BY [Status]`,
      legacyLookupRows("tbl_TaxExempt", ["TaxExempt", "Tax Exempt", "Type", "Name"]),
      legacyRateLookupRows()
    ]);

    return res.json({ iEnergyBills, energyDashboards, onSiteGenerations, types, products, utilities, statuses, taxExempts, rates });
=======
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Utility] AS name FROM dbo.tbl_Utility ORDER BY [Utility]`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT [id] AS id, [Status] AS name FROM dbo.tbl_Status ORDER BY [Status]`
    ]);

    return res.json({ iEnergyBills, energyDashboards, onSiteGenerations, types, products, utilities, statuses });
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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

<<<<<<< HEAD
reportsRoutes.get("/zip-code-details", authorize("report:read"), async (req, res, next) => {
  try {
    const zip = z.string().trim().min(1).max(20).parse(req.query.zip);
    const zipPrefix = `${zip}%`;
    const matches = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT TOP (50)
        z.[ZipId] AS id,
        z.[ZipCode] AS code,
        c.[CityName] AS city,
        s.[StateCode] AS state,
        s.[StateName] AS stateName
      FROM dbo.ZipCodes z
      INNER JOIN dbo.USCities c ON z.[CityId] = c.[CityId]
      INNER JOIN dbo.USStates s ON c.[StateId] = s.[StateId]
      WHERE CONVERT(varchar(20), z.[ZipCode]) LIKE ${zipPrefix}
      ORDER BY z.[ZipCode], c.[CityName]
    `;

    return res.json({ data: matches });
  } catch (error) {
    return next(error);
  }
});

=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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

<<<<<<< HEAD
const locationStateSchema = z.object({
  name: z.string().trim().min(1, "State name is required").max(100),
  code: z.string().trim().length(2, "State code must be 2 characters").transform((value) => value.toUpperCase()),
  capital: z.string().trim().min(1, "Capital is required").max(100)
});

const locationCitySchema = z.object({
  stateId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "City name is required").max(150),
  isCapital: z.boolean().default(false)
});

const locationZipSchema = z.object({
  cityId: z.coerce.number().int().positive(),
  code: z.string().trim().min(1, "ZIP code is required").max(10),
  isActive: z.boolean().default(true)
});

const uploadedCitySchema = z.object({
  state: z.string().trim().min(1, "State is required"),
  city: z.string().trim().min(1, "City is required").max(150),
  isCapital: z.boolean().default(false)
});

const uploadedZipSchema = z.object({
  state: z.string().trim().min(1, "State is required"),
  city: z.string().trim().min(1, "City is required").max(150),
  zip: z.string().trim().min(1, "ZIP is required").max(10),
  isActive: z.boolean().default(true)
});

async function locationStateId(
  transaction: Prisma.TransactionClient,
  state: string
) {
  const rows = await transaction.$queryRaw<Array<{ id: number }>>`
    SELECT TOP (1) [StateId] AS id
    FROM dbo.USStates WITH (UPDLOCK, HOLDLOCK)
    WHERE [StateCode] = ${state}
       OR [StateName] = ${state}
       OR CONVERT(varchar(20), [StateId]) = ${state}
    ORDER BY [StateId]
  `;
  if (!rows[0]) throw Object.assign(new Error(`State "${state}" was not found`), { statusCode: 400 });
  return rows[0].id;
}

async function findOrCreateLocationCity(
  transaction: Prisma.TransactionClient,
  stateId: number,
  city: string,
  isCapital = false
) {
  let rows = await transaction.$queryRaw<Array<{ id: number; created: number }>>`
    SELECT TOP (1) [CityId] AS id, 0 AS created
    FROM dbo.USCities WITH (UPDLOCK, HOLDLOCK)
    WHERE [StateId] = ${stateId} AND LOWER([CityName]) = LOWER(${city})
    ORDER BY [CityId]
  `;
  if (!rows[0]) {
    rows = await transaction.$queryRaw<Array<{ id: number; created: number }>>`
      INSERT INTO dbo.USCities ([StateId], [CityName], [IsCapital], [OnDate])
      OUTPUT INSERTED.[CityId] AS id, 1 AS created
      VALUES (${stateId}, ${city}, ${isCapital}, ${new Date()})
    `;
  }
  if (!rows[0]) throw new Error("City was inserted but its ID was not returned");
  return rows[0];
}

reportsRoutes.get("/location-states", authorize("org:administer"), async (_req, res, next) => {
  try {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT [StateId] AS id, [StateName] AS name, [StateCode] AS code, [Capital] AS capital, [OnDate] AS onDate
      FROM dbo.USStates
      ORDER BY [StateName]
    `;
    return res.json({ total: rows.length, data: rows });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/location-states", authorize("org:administer"), async (req, res, next) => {
  try {
    const input = locationStateSchema.parse(req.body);
    const existing = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT TOP (1) [StateId] AS id FROM dbo.USStates
      WHERE [StateCode] = ${input.code} OR LOWER([StateName]) = LOWER(${input.name})
    `;
    if (existing[0]) return res.status(409).json({ error: "State already exists" });
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO dbo.USStates ([StateName], [StateCode], [Capital], [OnDate])
      OUTPUT INSERTED.[StateId] AS id, INSERTED.[StateName] AS name, INSERTED.[StateCode] AS code, INSERTED.[Capital] AS capital
      VALUES (${input.name}, ${input.code}, ${input.capital}, ${new Date()})
    `;
    return res.status(201).json({ data: rows[0] });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/location-states/bulk", authorize("org:administer"), async (req, res, next) => {
  try {
    const rows = z.object({ rows: z.array(locationStateSchema).min(1).max(500) }).parse(req.body).rows;
    const result = await prisma.$transaction(async (transaction) => {
      let imported = 0;
      let existing = 0;
      for (const row of rows) {
        const found = await transaction.$queryRaw<Array<{ id: number }>>`
          SELECT TOP (1) [StateId] AS id FROM dbo.USStates WITH (UPDLOCK, HOLDLOCK)
          WHERE [StateCode] = ${row.code} OR LOWER([StateName]) = LOWER(${row.name})
        `;
        if (found[0]) {
          existing += 1;
          continue;
        }
        await transaction.$executeRaw`
          INSERT INTO dbo.USStates ([StateName], [StateCode], [Capital], [OnDate])
          VALUES (${row.name}, ${row.code}, ${row.capital}, ${new Date()})
        `;
        imported += 1;
      }
      return { imported, existing };
    });
    return res.status(201).json({ total: rows.length, ...result });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/location-cities", authorize("org:administer"), async (req, res, next) => {
  try {
    const take = Math.min(Math.max(Number(req.query.take ?? 1000) || 1000, 1), 2000);
    const countRows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`SELECT COUNT(*) AS total FROM dbo.USCities`;
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT TOP (${take})
        c.[CityId] AS id, c.[CityName] AS name, c.[StateId] AS stateId,
        s.[StateCode] AS state, s.[StateName] AS stateName, c.[IsCapital] AS isCapital, c.[OnDate] AS onDate
      FROM dbo.USCities c
      INNER JOIN dbo.USStates s ON c.[StateId] = s.[StateId]
      ORDER BY s.[StateName], c.[CityName]
    `;
    return res.json({ total: Number(countRows[0]?.total ?? 0), data: rows });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/location-cities", authorize("org:administer"), async (req, res, next) => {
  try {
    const input = locationCitySchema.parse(req.body);
    const state = await prisma.$queryRaw<Array<{ id: number }>>`SELECT TOP (1) [StateId] AS id FROM dbo.USStates WHERE [StateId] = ${input.stateId}`;
    if (!state[0]) return res.status(400).json({ error: "Selected state was not found" });
    const existing = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT TOP (1) [CityId] AS id FROM dbo.USCities
      WHERE [StateId] = ${input.stateId} AND LOWER([CityName]) = LOWER(${input.name})
    `;
    if (existing[0]) return res.status(409).json({ error: "City already exists in this state" });
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO dbo.USCities ([StateId], [CityName], [IsCapital], [OnDate])
      OUTPUT INSERTED.[CityId] AS id, INSERTED.[CityName] AS name, INSERTED.[StateId] AS stateId, INSERTED.[IsCapital] AS isCapital
      VALUES (${input.stateId}, ${input.name}, ${input.isCapital}, ${new Date()})
    `;
    return res.status(201).json({ data: rows[0] });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.put("/location-cities/:id", authorize("org:administer"), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const input = locationCitySchema.parse(req.body);
    const result = await prisma.$transaction(async (transaction) => {
      const city = await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT [CityId] AS id FROM dbo.USCities WITH (UPDLOCK, HOLDLOCK) WHERE [CityId] = ${id}
      `;
      if (!city[0]) return { status: 404, body: { error: "City was not found" } };
      const state = await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT [StateId] AS id FROM dbo.USStates WHERE [StateId] = ${input.stateId}
      `;
      if (!state[0]) return { status: 400, body: { error: "Selected state was not found" } };
      const duplicate = await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT [CityId] AS id FROM dbo.USCities WITH (UPDLOCK, HOLDLOCK)
        WHERE [StateId] = ${input.stateId} AND LOWER([CityName]) = LOWER(${input.name}) AND [CityId] <> ${id}
      `;
      if (duplicate[0]) return { status: 409, body: { error: "City already exists in this state" } };
      await transaction.$executeRaw`
        UPDATE dbo.USCities SET [StateId] = ${input.stateId}, [CityName] = ${input.name}, [IsCapital] = ${input.isCapital}
        WHERE [CityId] = ${id}
      `;
      return { status: 200, body: { data: { id, ...input } } };
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.delete("/location-cities/:id", authorize("org:administer"), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await prisma.$transaction(async (transaction) => {
      const city = await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT [CityId] AS id FROM dbo.USCities WITH (UPDLOCK, HOLDLOCK) WHERE [CityId] = ${id}
      `;
      if (!city[0]) return { status: 404, body: { error: "City was not found" } };
      await transaction.$executeRaw`DELETE FROM dbo.ZipCodes WHERE [CityId] = ${id}`;
      await transaction.$executeRaw`DELETE FROM dbo.USCities WHERE [CityId] = ${id}`;
      return { status: 200, body: { data: { id } } };
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/location-cities/bulk", authorize("org:administer"), async (req, res, next) => {
  try {
    const rows = z.object({ rows: z.array(uploadedCitySchema).min(1).max(1000) }).parse(req.body).rows;
    const result = await prisma.$transaction(async (transaction) => {
      let imported = 0;
      let existing = 0;
      for (const row of rows) {
        const stateId = await locationStateId(transaction, row.state);
        const city = await findOrCreateLocationCity(transaction, stateId, row.city, row.isCapital);
        city.created ? imported += 1 : existing += 1;
      }
      return { imported, existing };
    });
    return res.status(201).json({ total: rows.length, ...result });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.get("/location-zip-codes", authorize("org:administer"), async (req, res, next) => {
  try {
    const take = Math.min(Math.max(Number(req.query.take ?? 1000) || 1000, 1), 2000);
    const countRows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`SELECT COUNT(*) AS total FROM dbo.ZipCodes`;
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT TOP (${take})
        z.[ZipId] AS id, z.[ZipCode] AS code, z.[CityId] AS cityId, c.[CityName] AS city,
        s.[StateId] AS stateId, s.[StateCode] AS state, s.[StateName] AS stateName,
        z.[IsActive] AS isActive, z.[OnDate] AS onDate
      FROM dbo.ZipCodes z
      INNER JOIN dbo.USCities c ON z.[CityId] = c.[CityId]
      INNER JOIN dbo.USStates s ON c.[StateId] = s.[StateId]
      ORDER BY z.[ZipCode], s.[StateCode], c.[CityName]
    `;
    return res.json({ total: Number(countRows[0]?.total ?? 0), data: rows });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/location-zip-codes", authorize("org:administer"), async (req, res, next) => {
  try {
    const input = locationZipSchema.parse(req.body);
    const city = await prisma.$queryRaw<Array<{ id: number }>>`SELECT TOP (1) [CityId] AS id FROM dbo.USCities WHERE [CityId] = ${input.cityId}`;
    if (!city[0]) return res.status(400).json({ error: "Selected city was not found" });
    const existing = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT TOP (1) [ZipId] AS id FROM dbo.ZipCodes WHERE [CityId] = ${input.cityId} AND [ZipCode] = ${input.code}
    `;
    if (existing[0]) return res.status(409).json({ error: "ZIP code already exists for this city" });
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO dbo.ZipCodes ([CityId], [ZipCode], [IsActive], [OnDate])
      OUTPUT INSERTED.[ZipId] AS id, INSERTED.[ZipCode] AS code, INSERTED.[CityId] AS cityId, INSERTED.[IsActive] AS isActive
      VALUES (${input.cityId}, ${input.code}, ${input.isActive}, ${new Date()})
    `;
    return res.status(201).json({ data: rows[0] });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/location-zip-codes/bulk", authorize("org:administer"), async (req, res, next) => {
  try {
    const rows = z.object({ rows: z.array(uploadedZipSchema).min(1).max(1000) }).parse(req.body).rows;
    const result = await prisma.$transaction(async (transaction) => {
      let imported = 0;
      let existing = 0;
      let citiesCreated = 0;
      for (const row of rows) {
        const stateId = await locationStateId(transaction, row.state);
        const city = await findOrCreateLocationCity(transaction, stateId, row.city);
        if (city.created) citiesCreated += 1;
        const found = await transaction.$queryRaw<Array<{ id: number }>>`
          SELECT TOP (1) [ZipId] AS id FROM dbo.ZipCodes WITH (UPDLOCK, HOLDLOCK)
          WHERE [CityId] = ${city.id} AND [ZipCode] = ${row.zip}
        `;
        if (found[0]) {
          existing += 1;
          continue;
        }
        await transaction.$executeRaw`
          INSERT INTO dbo.ZipCodes ([CityId], [ZipCode], [IsActive], [OnDate])
          VALUES (${city.id}, ${row.zip}, ${row.isActive}, ${new Date()})
        `;
        imported += 1;
      }
      return { imported, existing, citiesCreated };
    });
    return res.status(201).json({ total: rows.length, ...result });
  } catch (error) {
    return next(error);
  }
});

const optionalMeterLookupId = z.preprocess(
  (value) => value === 0 || value === "0" ? undefined : value,
  optionalPositiveInt
);

const tblMeterCreateSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  utilityAccountName: z.string().trim().optional(),
=======
const tblMeterCreateSchema = z.object({
  companyId: z.coerce.number().int().positive(),
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
  accountNumber: optionalText,
  serviceRefPod: optionalText,
  nameKey: optionalText,
  meter: optionalText,
  serviceAddress: optionalText,
<<<<<<< HEAD
  city: z.preprocess(emptyStringToUndefined, z.string().trim().max(150).optional()),
  state: z.preprocess(emptyStringToUndefined, z.string().trim().max(100).optional()),
  zip: z.preprocess(emptyStringToUndefined, z.string().trim().max(10).optional()),
  taxExempt: optionalMeterLookupId,
  cycleReadDay: optionalText,
  rate: optionalMeterLookupId,
  demand: optionalText,
  annualUsage: optionalText,
  loadProfile: optionalText,
  iEnergyBillId: optionalMeterLookupId,
  energyDashboardId: optionalMeterLookupId,
  onSiteGenerationId: optionalMeterLookupId,
  typeId: optionalMeterLookupId,
  productId: optionalMeterLookupId,
  utilityId: optionalMeterLookupId,
  statusId: optionalMeterLookupId,
  notes: z.string().max(10000).optional(),
=======
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
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
  isActive: z.boolean().default(true)
});

const tblMeterUpdateSchema = tblMeterCreateSchema.partial();

<<<<<<< HEAD
async function validateUtilityMeterValueSizes(input: {
  utilityId?: number | null;
  accountNumber?: string | null;
  serviceRefPod?: string | null;
}): Promise<{
  name: string | null;
  accountNumberSize: number | null;
  serviceRefSize: number | null;
  accountNumberRequired: boolean | null;
  serviceRefRequired: boolean | null;
} | null> {
  if (!input.utilityId) return null;
  const utilities = await prisma.$queryRaw<Array<{
    name: string | null;
    accountNumberSize: number | null;
    serviceRefSize: number | null;
  accountNumberRequired: boolean | null;
  serviceRefRequired: boolean | null;
  }>>`
    SELECT TOP (1)
      u.[Utility] AS name,
      u.[AccountNumberSize] AS accountNumberSize,
      u.[ServiceRefSize] AS serviceRefSize,
      m.[AccountNumber] AS accountNumberRequired,
      m.[ServiceRefPodId] AS serviceRefRequired
    FROM dbo.tbl_Utility u
    LEFT JOIN dbo.tblMasterAccountNumber m ON m.[UtilityId] = u.[id]
    WHERE u.[id] = ${input.utilityId}
  `;
  const utility = utilities[0];
  if (!utility) throw Object.assign(new Error("Selected utility was not found"), { statusCode: 400 });

  if (utility.accountNumberRequired && !input.accountNumber?.trim()) {
    throw Object.assign(new Error("Account Number is required for the selected utility"), { statusCode: 400 });
  }
  if (utility.serviceRefRequired && !input.serviceRefPod?.trim()) {
    throw Object.assign(new Error("Service Ref/POD is required for the selected utility"), { statusCode: 400 });
  }

  const accountNumber = input.accountNumber?.trim();
  const accountNumberDigitCount = accountNumber?.replace(/\D/g, "").length ?? 0;
  if (utility.accountNumberSize && accountNumber && accountNumberDigitCount !== utility.accountNumberSize) {
    throw Object.assign(new Error(
      `Account Number for ${utility.name ?? "the selected utility"} must contain exactly ${utility.accountNumberSize} numeric digits`
    ), { statusCode: 400 });
  }

  const serviceRef = input.serviceRefPod?.trim();
  const serviceRefDigitCount = serviceRef?.replace(/\D/g, "").length ?? 0;
  if (utility.serviceRefSize && serviceRef && serviceRefDigitCount !== utility.serviceRefSize) {
    throw Object.assign(new Error(
      `Service Ref/POD for ${utility.name ?? "the selected utility"} must contain exactly ${utility.serviceRefSize} numeric digits`
    ), { statusCode: 400 });
  }
  return utility;
}

const meterLocationSchema = z.object({
  zip: z.string().trim().min(1, "ZIP code is required").max(10),
  city: z.string().trim().min(1, "City is required").max(150),
  state: z.string().trim().min(1, "State is required").max(100)
});

type MeterLocation = {
  zip: string;
  city: string;
  state: string;
  stateId: number;
  cityId: number;
  zipId: number;
  createdCity: boolean;
  createdZip: boolean;
};

function locationError(message: string) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

async function ensureMeterLocation(input: {
  zip?: string | null;
  city?: string | null;
  state?: string | null;
}): Promise<MeterLocation | null> {
  const zip = input.zip?.trim();
  const city = input.city?.trim();
  const state = input.state?.trim();
  if (!zip) return null;

  // Existing ZIPs remain usable by older clients that only submit the ZIP.
  if (!city || !state) {
    const existing = await prisma.$queryRaw<Array<{
      zipId: number;
      cityId: number;
      stateId: number;
      zip: string;
      city: string;
      state: string;
    }>>`
      SELECT TOP (1)
        z.[ZipId] AS zipId,
        c.[CityId] AS cityId,
        s.[StateId] AS stateId,
        z.[ZipCode] AS zip,
        c.[CityName] AS city,
        s.[StateCode] AS state
      FROM dbo.ZipCodes z
      INNER JOIN dbo.USCities c ON z.[CityId] = c.[CityId]
      INNER JOIN dbo.USStates s ON c.[StateId] = s.[StateId]
      WHERE z.[ZipCode] = ${zip}
      ORDER BY z.[ZipId]
    `;
    if (!existing[0]) {
      throw locationError("This ZIP code is not available. Enter its city and state to add it.");
    }
    return { ...existing[0], createdCity: false, createdZip: false };
  }

  return prisma.$transaction(async (transaction) => {
    const states = await transaction.$queryRaw<Array<{
      stateId: number;
      state: string;
    }>>`
      SELECT TOP (1)
        [StateId] AS stateId,
        [StateCode] AS state
      FROM dbo.USStates WITH (UPDLOCK, HOLDLOCK)
      WHERE [StateCode] = ${state}
         OR [StateName] = ${state}
         OR CONVERT(varchar(20), [StateId]) = ${state}
      ORDER BY [StateId]
    `;
    const matchedState = states[0];
    if (!matchedState) {
      throw locationError("State was not found. Select a valid U.S. state.");
    }

    let createdCity = false;
    let cities = await transaction.$queryRaw<Array<{ cityId: number; city: string }>>`
      SELECT TOP (1)
        [CityId] AS cityId,
        [CityName] AS city
      FROM dbo.USCities WITH (UPDLOCK, HOLDLOCK)
      WHERE [StateId] = ${matchedState.stateId}
        AND LOWER([CityName]) = LOWER(${city})
      ORDER BY [CityId]
    `;
    if (!cities[0]) {
      cities = await transaction.$queryRaw<Array<{ cityId: number; city: string }>>`
        INSERT INTO dbo.USCities ([StateId], [CityName], [IsCapital], [OnDate])
        OUTPUT INSERTED.[CityId] AS cityId, INSERTED.[CityName] AS city
        VALUES (${matchedState.stateId}, ${city}, ${false}, ${new Date()})
      `;
      createdCity = true;
    }
    const matchedCity = cities[0];
    if (!matchedCity) throw new Error("City was inserted but its ID was not returned");

    let createdZip = false;
    let zipCodes = await transaction.$queryRaw<Array<{ zipId: number; zip: string }>>`
      SELECT TOP (1)
        [ZipId] AS zipId,
        [ZipCode] AS zip
      FROM dbo.ZipCodes WITH (UPDLOCK, HOLDLOCK)
      WHERE [CityId] = ${matchedCity.cityId}
        AND [ZipCode] = ${zip}
      ORDER BY [ZipId]
    `;
    if (!zipCodes[0]) {
      zipCodes = await transaction.$queryRaw<Array<{ zipId: number; zip: string }>>`
        INSERT INTO dbo.ZipCodes ([CityId], [ZipCode], [IsActive], [OnDate])
        OUTPUT INSERTED.[ZipId] AS zipId, INSERTED.[ZipCode] AS zip
        VALUES (${matchedCity.cityId}, ${zip}, ${true}, ${new Date()})
      `;
      createdZip = true;
    }
    const matchedZip = zipCodes[0];
    if (!matchedZip) throw new Error("ZIP code was inserted but its ID was not returned");

    return {
      ...matchedZip,
      ...matchedCity,
      stateId: matchedState.stateId,
      state: matchedState.state,
      createdCity,
      createdZip
    };
  });
}

reportsRoutes.post("/meter-locations", authorize("company:create"), async (req, res, next) => {
  try {
    const input = meterLocationSchema.parse(req.body);
    const location = await ensureMeterLocation(input);
    return res.status(location?.createdCity || location?.createdZip ? 201 : 200).json({ data: location });
  } catch (error) {
    return next(error);
  }
});

async function saveMeterNote(meterId: number, content: string | undefined, user: { id: string; orgId: string | null } | undefined) {
  if (content === undefined) return;
  const sanitizedContent = sanitizeCompanyNoteContent(content);
  const existing = await prisma.note.findFirst({
    where: { relatedType: "meter", relatedId: String(meterId) },
    orderBy: { updatedAt: "desc" },
    select: { id: true }
  });
  if (existing) {
    await prisma.note.update({ where: { id: existing.id }, data: { content: sanitizedContent } });
    return;
  }
  if (!sanitizedContent.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, "").trim()) return;
  if (!user?.orgId) throw Object.assign(new Error("An organization is required to save meter notes"), { statusCode: 400 });
  await prisma.note.create({
    data: { orgId: user.orgId, userId: user.id, relatedType: "meter", relatedId: String(meterId), content: sanitizedContent }
  });
}

async function createTblMeter(input: z.infer<typeof tblMeterCreateSchema>, user: { id: string; orgId: string | null } | undefined) {
  const utilityRules = await validateUtilityMeterValueSizes(input);
  const location = await ensureMeterLocation(input);
  const now = new Date();
  const rows = await prisma.$queryRaw<Array<{ id: number }>>`
      INSERT INTO dbo.tbl_MeterList (
        [Utility Account Name],
=======
reportsRoutes.post("/meters", authorize("company:create"), async (req, res, next) => {
  try {
    const input = tblMeterCreateSchema.parse(req.body);
    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO dbo.tbl_MeterList (
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
      OUTPUT INSERTED.[id] AS id
      VALUES (
        ${input.utilityAccountName || null},
        ${utilityRules?.accountNumberSize === 0 && !utilityRules.accountNumberRequired ? null : input.accountNumber ?? null},
        ${utilityRules?.serviceRefSize === 0 && !utilityRules.serviceRefRequired ? null : input.serviceRefPod ?? null},
        ${input.nameKey ?? null},
        ${input.meter ?? null},
        ${input.serviceAddress ?? null},
        ${location?.city ?? input.city ?? null},
        ${location?.state ?? input.state ?? null},
        ${location?.zip ?? input.zip ?? null},
=======
      VALUES (
        ${input.accountNumber ?? null},
        ${input.serviceRefPod ?? null},
        ${input.nameKey ?? null},
        ${input.meter ?? null},
        ${input.serviceAddress ?? null},
        ${input.city ?? null},
        ${input.state ?? null},
        ${input.zip ?? null},
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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

<<<<<<< HEAD
  const meterId = Number(rows[0]?.id);
  if (!meterId) throw new Error("Meter was inserted but its ID was not returned");
  await saveMeterNote(meterId, input.notes, user);
  return { data: await findTblMeterById(meterId) };
}

reportsRoutes.post("/meters", authorize("company:create"), async (req, res, next) => {
  try {
    const input = tblMeterCreateSchema.parse(req.body);
    return res.status(201).json(await createTblMeter(input, req.user));
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/meters/bulk", authorize("company:create"), async (req, res, next) => {
  try {
    const request = z.object({
      companyId: z.coerce.number().int().positive(),
      meters: z.array(z.unknown()).min(1).max(500)
    }).parse(req.body);
    const companyRows = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT TOP (1) [id] FROM dbo.tblCompany WHERE [id] = ${request.companyId} AND [isDeleted] = 0
    `;
    if (!companyRows[0]) return res.status(404).json({ error: "Company not found" });

    const imported: Array<{ row: number; id: string | number | undefined; meter: string }> = [];
    const errors: Array<{ row: number; meter: string; error: string }> = [];

    for (const [index, candidate] of request.meters.entries()) {
      const row = index + 2;
      const candidateObject = candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : {};
      const meterLabel = String(candidateObject.meter ?? candidateObject.accountNumber ?? "").trim();
      if (!String(candidateObject.meter ?? "").trim() && !String(candidateObject.accountNumber ?? "").trim()) {
        errors.push({ row, meter: meterLabel, error: "Account Number or Meter is required" });
        continue;
      }
      const parsed = tblMeterCreateSchema.safeParse({ ...candidateObject, companyId: request.companyId });
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        errors.push({ row, meter: meterLabel, error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid meter data" });
        continue;
      }

      try {
        const result = await createTblMeter(parsed.data, req.user);
        imported.push({
          row,
          id: result.data?.id == null ? undefined : String(result.data.id),
          meter: parsed.data.meter ?? parsed.data.accountNumber ?? ""
        });
      } catch (error) {
        errors.push({ row, meter: meterLabel, error: error instanceof Error ? error.message : "Unable to create meter" });
      }
    }

    return res.status(errors.length ? 207 : 201).json({
      total: request.meters.length,
      imported: imported.length,
      failed: errors.length,
      data: imported,
      errors
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.patch("/meters/bulk-status", authorize("company:update"), async (req, res, next) => {
  try {
    const input = z.object({
      ids: z.array(z.coerce.number().int().positive()).min(1).max(500)
        .transform((ids) => Array.from(new Set(ids))),
      isActive: z.boolean()
    }).parse(req.body);

    const updated = await prisma.$executeRaw(Prisma.sql`
      UPDATE dbo.tbl_MeterList
      SET [IsActive] = ${input.isActive}, [UpdatedAt] = ${new Date()}
      WHERE [id] IN (${Prisma.join(input.ids)})
    `);

    return res.json({ updated, isActive: input.isActive });
=======
    return res.status(201).json({ ok: true });
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
    const utilityRules = await validateUtilityMeterValueSizes({
      utilityId: input.utilityId ?? Number(current.utilityId || 0),
      accountNumber: input.accountNumber === undefined ? String(current.accountNumber ?? "") : input.accountNumber,
      serviceRefPod: input.serviceRefPod === undefined ? String(current.serviceRefPod ?? "") : input.serviceRefPod
    });
    const locationChanged = input.zip !== undefined || input.city !== undefined || input.state !== undefined;
    const location = locationChanged
      ? await ensureMeterLocation({
          zip: input.zip ?? String(current.zip ?? ""),
          city: input.city ?? String(current.city ?? ""),
          state: input.state ?? String(current.state ?? "")
        })
      : null;
    await prisma.$executeRaw`
      UPDATE dbo.tbl_MeterList
      SET
        [Utility Account Name] = ${input.utilityAccountName === undefined ? current.utilityAccountName ?? null : input.utilityAccountName || null},
        [Account Number] = ${utilityRules?.accountNumberSize === 0 && !utilityRules.accountNumberRequired ? null : input.accountNumber ?? current.accountNumber ?? null},
        [Service Ref/POD] = ${utilityRules?.serviceRefSize === 0 && !utilityRules.serviceRefRequired ? null : input.serviceRefPod ?? current.serviceRefPod ?? null},
        [Name Key] = ${input.nameKey ?? current.nameKey ?? null},
        [Meter] = ${input.meter ?? current.meter ?? null},
        [Service Address] = ${input.serviceAddress ?? current.serviceAddress ?? null},
        [City] = ${location?.city ?? input.city ?? current.city ?? null},
        [State] = ${location?.state ?? input.state ?? current.state ?? null},
        [Zip] = ${location?.zip ?? input.zip ?? current.zip ?? null},
=======
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
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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

<<<<<<< HEAD
    await saveMeterNote(id, input.notes, req.user);
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
    return res.json({ data: await findTblMeterById(id) });
  } catch (error) {
    return next(error);
  }
});

<<<<<<< HEAD
const decimalCurrencyInput = z.preprocess(
  (value) => value === null || value === undefined ? value : String(value).trim(),
  z.string().regex(/^\d+(?:\.\d+)?$/, "Must be a valid decimal value").refine((value) => Number.isFinite(Number(value)), "Must be a valid decimal value")
);

const tblContractBaseSchema = z.object({
  companyId: z.coerce.number().int().positive("Company is required"),
  brokerId: z.coerce.number().int().positive("Broker is required"),
  supplierId: z.coerce.number().int().positive("Supplier is required"),
  swingId: z.coerce.number().int().positive("Swing is required"),
  passThroughId: z.coerce.number().int().positive("Pass Through is required"),
  billTypeId: z.coerce.number().int().positive("Bill Type is required"),
  productId: z.coerce.number().int().positive("Product is required"),
  meterIds: z.array(z.coerce.number().int().positive()).min(1, "Select at least one meter"),
  rate: decimalCurrencyInput,
  fee: decimalCurrencyInput,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
=======
const tblContractCreateSchema = z.object({
  companyId: optionalPositiveInt,
  brokerId: optionalPositiveInt,
  supplierId: optionalPositiveInt,
  meterIds: z.array(z.coerce.number().int().positive()).default([]),
  rate: optionalNumber,
  fee: optionalNumber,
  startDate: optionalDate,
  endDate: optionalDate,
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
  cFile: optionalText,
  contractFile: z.object({
    name: z.string().trim().min(1),
    contentType: z.string().trim().optional(),
<<<<<<< HEAD
    contentBase64: z.string().trim().min(1).refine(
      (value) => Buffer.from(value, "base64").length <= 15 * 1024 * 1024,
      "Contract file must be 15 MB or smaller."
    )
  }).optional(),
  notes: z.string().max(10000).refine((value) => value.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, "").trim().length > 0, "Notes are required"),
=======
    contentBase64: z.string().trim().min(1)
  }).optional(),
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
  isActive: z.boolean().default(true),
  onDate: optionalDate
});

<<<<<<< HEAD
const tblContractCreateSchema = tblContractBaseSchema.superRefine((input, context) => {
  if (input.endDate < input.startDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date cannot be before start date" });
  }
  if (!input.contractFile && !input.cFile) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["contractFile"], message: "Contract file is required" });
  }
});

const tblContractUpdateSchema = tblContractBaseSchema.partial().superRefine((input, context) => {
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date cannot be before start date" });
  }
});

async function saveContractNote(contractId: number, content: string | undefined, user: { id: string; orgId: string | null } | undefined) {
  if (content === undefined) return;
  const sanitizedContent = sanitizeCompanyNoteContent(content);
  const existing = await prisma.note.findFirst({
    where: { relatedType: "contract", relatedId: String(contractId) },
    orderBy: { updatedAt: "desc" },
    select: { id: true }
  });
  if (existing) {
    await prisma.note.update({ where: { id: existing.id }, data: { content: sanitizedContent } });
    return;
  }
  if (!sanitizedContent.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, "").trim()) return;
  if (!user?.orgId) throw Object.assign(new Error("An organization is required to save contract notes"), { statusCode: 400 });
  await prisma.note.create({
    data: { orgId: user.orgId, userId: user.id, relatedType: "contract", relatedId: String(contractId), content: sanitizedContent }
  });
}
=======
const tblContractUpdateSchema = tblContractCreateSchema.partial();
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d

reportsRoutes.post("/contracts", authorize("company:create"), async (req, res, next) => {
  try {
    const input = tblContractCreateSchema.parse(req.body);
    const company = input.companyId ? await findTblCompanyById(input.companyId) : null;
    const contractFolderId = await resolveContractFolderId(company);
    if (input.contractFile && !contractFolderId) {
      return res.status(400).json({ error: "Company ContractFolderID or CompanyFolderID is required to upload contract files." });
    }

<<<<<<< HEAD
    const productName = await findTblProductNameById(input.productId);
    const companyName = typeof company?.companyName === "string" ? company.companyName : "";
    const renamedContractFile = input.contractFile && productName && companyName
      ? {
          ...input.contractFile,
          name: contractUploadFileName({
            originalName: input.contractFile.name,
            productName,
            companyName,
            startDate: input.startDate,
            endDate: input.endDate
          })
        }
      : input.contractFile;
    const uploadedFile = renamedContractFile && contractFolderId
      ? await uploadSharePointFile(contractFolderId, renamedContractFile)
=======
    const uploadedFile = input.contractFile && contractFolderId
      ? await uploadSharePointFile(contractFolderId, input.contractFile)
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
      : null;
    const now = new Date();
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO dbo.tbl_Contract (
        [Broker],
        [Supplier],
<<<<<<< HEAD
        [Swing],
        [PassThrough],
        [BillType],
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
        ${input.swingId ?? null},
        ${input.passThroughId ?? null},
        ${input.billTypeId ?? null},
        CAST(${input.rate ?? null} AS DECIMAL(19,8)),
        CAST(${input.fee ?? null} AS DECIMAL(19,8)),
=======
        ${input.rate ?? null},
        ${input.fee ?? null},
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
    await saveContractNote(contractId, input.notes, req.user);
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
    return res.status(201).json({ data: await findTblContractById(contractId) });
  } catch (error) {
    return next(error);
  }
});

<<<<<<< HEAD
reportsRoutes.patch("/contracts/bulk-status", authorize("company:update"), async (req, res, next) => {
  try {
    const input = z.object({
      ids: z.array(z.coerce.number().int().positive()).min(1).max(500)
        .transform((ids) => Array.from(new Set(ids))),
      isActive: z.boolean()
    }).parse(req.body);

    const updated = await prisma.$executeRaw(Prisma.sql`
      UPDATE dbo.tbl_Contract
      SET [isActive] = ${input.isActive}, [updatedAt] = ${new Date()}
      WHERE [id] IN (${Prisma.join(input.ids)})
    `);

    return res.json({ updated, isActive: input.isActive });
  } catch (error) {
    return next(error);
  }
});

=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
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
<<<<<<< HEAD
        [Swing] = ${input.swingId ?? current.swingId ?? null},
        [PassThrough] = ${input.passThroughId ?? current.passThroughId ?? null},
        [BillType] = ${input.billTypeId ?? current.billTypeId ?? null},
        [Rate-kWh/therms] = CAST(${input.rate ?? current.rate ?? null} AS DECIMAL(19,8)),
        [Fee-kWh/Dth] = CAST(${input.fee ?? current.fee ?? null} AS DECIMAL(19,8)),
=======
        [Rate-kWh/therms] = ${input.rate ?? current.rate ?? null},
        [Fee-kWh/Dth] = ${input.fee ?? current.fee ?? null},
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
        [Start Date] = ${input.startDate ?? current.startDate ?? null},
        [End Date] = ${input.endDate ?? current.endDate ?? null},
        [cFile] = ${uploadedFile?.name ?? input.cFile ?? current.cFile ?? null},
        [isActive] = ${input.isActive ?? current.isActive},
        [updatedAt] = ${new Date()},
        [OnDate] = ${input.onDate ?? current.onDate ?? null}
      WHERE [id] = ${id}
    `;

    await upsertCompanyContractRelation(input.companyId, id, input.meterIds);
<<<<<<< HEAD
    await saveContractNote(id, input.notes, req.user);
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
    return res.json({ data: await findTblContractById(id) });
  } catch (error) {
    return next(error);
  }
});

const tblCompanyCreateSchema = z.object({
  organizationId: z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().default(1)),
<<<<<<< HEAD
  parentCompanyId: z.preprocess(emptyParentCompanyToUndefined, z.coerce.number().int().positive().optional()),
  companyName: z.string().trim().min(1, "Company name is required"),
  legalEntityName: z.string().trim().min(1, "Legal name is required"),
  mailingAddress: z.string().trim().min(1, "Mailing address is required"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  country: optionalText,
  postalCode: z.string().trim().min(1, "ZIP is required"),
  email: z.preprocess(emptyStringToUndefined, z.string().trim().email("Enter a valid email address").optional()),
  phoneNumber: z.string().trim().regex(/^\d{3}-\d{3}-\d{4}$/, "Phone number must use xxx-xxx-xxxx format"),
  taxId: optionalText,
  url: optionalText,
  notes: z.string().max(1000).default(""),
=======
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
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
  isActive: z.boolean().default(true)
});

const tblCompanyUpdateSchema = z.object({
<<<<<<< HEAD
  parentCompanyId: z.preprocess(emptyStringToNull, z.coerce.number().int().positive().nullable().optional()),
  companyName: z.string().trim().min(1, "Company name is required"),
  legalEntityName: z.string().trim().min(1, "Legal name is required"),
  mailingAddress: z.string().trim().min(1, "Mailing address is required"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  country: z.string().trim().optional(),
  postalCode: z.string().trim().min(1, "ZIP is required"),
  email: z.preprocess(emptyStringToNull, z.string().trim().email("Enter a valid email address").nullable().optional()),
  phoneNumber: z.string().trim().regex(/^\d{3}-\d{3}-\d{4}$/, "Phone number must use xxx-xxx-xxxx format"),
  taxId: z.string().trim().optional(),
  url: z.string().trim().optional(),
  notes: z.string().max(1000).optional(),
  isActive: z.boolean().optional()
});

function sanitizeCompanyNoteContent(content: string) {
  return content
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*\/?>/gi, "")
    .replace(/\s(on\w+|src|href)\s*=\s*(?:(["']).*?\2|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

async function saveCompanyNote(companyId: number, content: string | undefined, user: { id: string; orgId: string | null } | undefined) {
  if (content === undefined) return;
  const sanitizedContent = sanitizeCompanyNoteContent(content);
  const existingNotes = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT TOP (1) [id]
    FROM dbo.aae_notes
    WHERE [companyId] = ${companyId}
    ORDER BY [updatedAt] DESC
  `;
  const existing = existingNotes[0];
  if (existing) {
    await prisma.note.update({ where: { id: existing.id }, data: { content: sanitizedContent } });
    return;
  }
  if (!sanitizedContent.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, "").trim()) return;
  if (!user?.orgId) throw Object.assign(new Error("An organization is required to save company notes"), { statusCode: 400 });
  const note = await prisma.note.create({
    data: { orgId: user.orgId, userId: user.id, relatedType: "company", relatedId: String(companyId), content: sanitizedContent }
  });
  await prisma.$executeRaw`UPDATE dbo.aae_notes SET [companyId] = ${companyId} WHERE [id] = ${note.id}`;
}

async function createTblCompany(input: z.infer<typeof tblCompanyCreateSchema>, user: { id: string; orgId: string | null } | undefined) {
  if (input.parentCompanyId) {
    const parent = await findTblCompanyById(input.parentCompanyId);
    if (!parent) throw Object.assign(new Error("Parent company not found"), { statusCode: 400 });
  }
  const sharePointFolder = await createCompanySharePointFolders(input.companyName);
  const inserted = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO dbo.tblCompany (
      [organizationId], [ParentCompanyID], [Company Name], [Legal Entity Name], [Mailing Address],
      [city], [state], [country], [postalCode], [email], [Phone Number],
      [Tax ID], [URL], [CompanyFolderID], [ContractFolderID], [UtilityBillsFolderID],
      [isActive], [createdAt], [updatedAt]
    )
    OUTPUT INSERTED.[id] AS id
    VALUES (
      ${1}, ${input.parentCompanyId ?? null}, ${input.companyName}, ${input.legalEntityName ?? null}, ${input.mailingAddress ?? null},
      ${input.city ?? null}, ${input.state ?? null}, ${input.country ?? null}, ${input.postalCode ?? null},
      ${input.email || null}, ${input.phoneNumber ?? null}, ${input.taxId ?? null}, ${input.url || null},
      ${sharePointFolder.companyFolderId ?? null}, ${sharePointFolder.contractFolderId ?? null},
      ${sharePointFolder.utilityBillsFolderId ?? null}, ${input.isActive}, ${new Date()}, ${new Date()}
    )
  `;
  const id = inserted[0]?.id;
  if (!id) throw new Error("Company was inserted but its ID was not returned");
  await saveCompanyNote(id, input.notes, user);
  return { data: await findTblCompanyById(id), sharePointFolder };
}

reportsRoutes.post("/tbl-companies", authorize("company:create"), async (req, res, next) => {
  try {
    const input = tblCompanyCreateSchema.parse(req.body);
    return res.status(201).json(await createTblCompany(input, req.user));
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.post("/tbl-companies/bulk", authorize("company:create"), async (req, res, next) => {
  try {
    const request = z.object({
      companies: z.array(z.unknown()).min(1).max(500),
      confirmDuplicates: z.boolean().default(false)
    }).parse(req.body);
    const existingRows = await prisma.$queryRaw<Array<{ companyName: string | null }>>`
      SELECT [Company Name] AS companyName FROM dbo.tblCompany WHERE [isDeleted] = 0
    `;
    const existingNames = new Set(existingRows.map((item) => item.companyName?.trim().toLowerCase()).filter(Boolean));
    const uploadedNames = new Set<string>();
    const duplicateNames = new Set<string>();

    for (const candidate of request.companies) {
      if (!candidate || typeof candidate !== "object" || !("companyName" in candidate)) continue;
      const companyName = String(candidate.companyName ?? "").trim();
      const normalizedName = companyName.toLowerCase();
      if (!normalizedName) continue;
      if (existingNames.has(normalizedName) || uploadedNames.has(normalizedName)) duplicateNames.add(companyName);
      uploadedNames.add(normalizedName);
    }

    if (duplicateNames.size && !request.confirmDuplicates) {
      return res.status(409).json({
        error: "One or more companies have the same name. Confirm to continue importing them.",
        requiresConfirmation: true,
        duplicates: Array.from(duplicateNames)
      });
    }
    const imported: Array<{ row: number; id: string | number | undefined; companyName: string }> = [];
    const errors: Array<{ row: number; companyName: string; error: string }> = [];

    for (const [index, candidate] of request.companies.entries()) {
      const row = index + 2;
      const parsed = tblCompanyCreateSchema.safeParse(candidate);
      if (!parsed.success) {
        const companyName = candidate && typeof candidate === "object" && "companyName" in candidate
          ? String(candidate.companyName ?? "")
          : "";
        errors.push({ row, companyName, error: parsed.error.issues[0]?.message ?? "Invalid company data" });
        continue;
      }

      try {
        const result = await createTblCompany(parsed.data, req.user);
        imported.push({ row, id: result.data?.id == null ? undefined : String(result.data.id), companyName: parsed.data.companyName });
      } catch (error) {
        errors.push({ row, companyName: parsed.data.companyName, error: error instanceof Error ? error.message : "Unable to create company" });
      }
    }

    return res.status(errors.length ? 207 : 201).json({
      total: request.companies.length,
      imported: imported.length,
      failed: errors.length,
      data: imported,
      errors
    });
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.delete("/tbl-companies/bulk", async (req, res, next) => {
  if (req.user?.role !== "superadmin") return res.status(403).json({ error: "Only system admins can delete companies." });
  try {
    const { ids } = z.object({ ids: z.array(z.coerce.number().int().positive().max(2147483647)).min(1).max(500).transform((values) => [...new Set(values)]) }).parse(req.body);
    const result = await deleteCompanies(ids);
    return "error" in result ? res.status(result.status!).json({ error: result.error }) : res.json(result);
  } catch (error) { return next(error); }
});

reportsRoutes.delete("/tbl-companies/:id", async (req, res, next) => {
  if (req.user?.role !== "superadmin") return res.status(403).json({ error: "Only system admins can delete companies." });
  try {
    const id = z.coerce.number().int().positive().max(2147483647).parse(req.params.id);
    const result = await deleteCompanies([id]);
    return "error" in result ? res.status(result.status!).json({ error: result.error }) : res.json(result);
  } catch (error) { return next(error); }
});

reportsRoutes.patch("/tbl-companies/bulk-status", authorize("company:update"), async (req, res, next) => {
  try {
    const input = z.object({
      ids: z.array(z.coerce.number().int().positive()).min(2).max(500)
        .transform((ids) => Array.from(new Set(ids))),
      isActive: z.boolean()
    }).parse(req.body);
    if (input.ids.length < 2) return res.status(400).json({ error: "Select at least two companies" });

    const updated = await prisma.$executeRaw(Prisma.sql`
      UPDATE dbo.tblCompany
      SET [isActive] = ${input.isActive}, [updatedAt] = ${new Date()}
      WHERE [id] IN (${Prisma.join(input.ids)}) AND [isDeleted] = 0
    `);

    return res.json({ updated, isActive: input.isActive });
=======
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

    const rows = await rawUnsafeRows<Record<string, unknown>>(`
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
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
  } catch (error) {
    return next(error);
  }
});

reportsRoutes.patch("/tbl-companies/:id", authorize("company:update"), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const current = await findTblCompanyById(id);
    if (!current) return res.status(404).json({ error: "Company not found" });

<<<<<<< HEAD
    const statusOnly = z.object({ isActive: z.boolean() }).strict().safeParse(req.body);
    if (statusOnly.success) {
      await prisma.$executeRaw`
        UPDATE dbo.tblCompany
        SET [isActive] = ${statusOnly.data.isActive}, [updatedAt] = ${new Date()}
        WHERE [id] = ${id}
      `;
      return res.json({ data: await findTblCompanyById(id) });
    }

    const input = tblCompanyUpdateSchema.parse(req.body);
    if (input.parentCompanyId === id) {
      return res.status(400).json({ error: "A company cannot be its own parent" });
    }
    if (input.parentCompanyId) {
      const invalidParents = await prisma.$queryRaw<Array<{ id: number }>>`
        WITH descendants AS (
          SELECT [id] FROM dbo.tblCompany WHERE [ParentCompanyID] = ${id}
          UNION ALL
          SELECT company.[id]
          FROM dbo.tblCompany company
          INNER JOIN descendants ON company.[ParentCompanyID] = descendants.[id]
        )
        SELECT TOP (1) [id]
        FROM descendants
        WHERE [id] = ${input.parentCompanyId}
      `;
      if (invalidParents.length) {
        return res.status(400).json({ error: "A subcompany cannot be assigned beneath one of its descendants" });
      }
      const parent = await findTblCompanyById(input.parentCompanyId);
      if (!parent) return res.status(400).json({ error: "Parent company not found" });
    }
    await prisma.$executeRaw`
      UPDATE dbo.tblCompany
      SET
        [organizationId] = ${1},
        [ParentCompanyID] = ${input.parentCompanyId === undefined ? current.parentCompanyId ?? null : input.parentCompanyId},
=======
    const input = tblCompanyUpdateSchema.parse(req.body);
    await prisma.$executeRaw`
      UPDATE dbo.tblCompany
      SET
        [organizationId] = ${input.organizationId ?? current.organizationId},
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
        [Company Name] = ${input.companyName ?? current.companyName},
        [Legal Entity Name] = ${input.legalEntityName ?? current.legalEntityName ?? null},
        [Mailing Address] = ${input.mailingAddress ?? current.mailingAddress ?? null},
        [city] = ${input.city ?? current.city ?? null},
        [state] = ${input.state ?? current.state ?? null},
        [country] = ${input.country ?? current.country ?? null},
        [postalCode] = ${input.postalCode ?? current.postalCode ?? null},
<<<<<<< HEAD
        [email] = ${input.email === undefined ? current.email ?? null : input.email},
=======
        [email] = ${input.email || current.email || null},
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d
        [Phone Number] = ${input.phoneNumber ?? current.phoneNumber ?? null},
        [Tax ID] = ${input.taxId ?? current.taxId ?? null},
        [URL] = ${input.url ?? current.url ?? null},
        [isActive] = ${input.isActive ?? current.isActive},
        [updatedAt] = ${new Date()}
      WHERE [id] = ${id}
    `;
<<<<<<< HEAD
    await saveCompanyNote(id, input.notes, req.user);
=======
>>>>>>> 638d960c6840640ab32e0236dd4cc54e8287463d

    return res.json({ data: await findTblCompanyById(id) });
  } catch (error) {
    return next(error);
  }
});
