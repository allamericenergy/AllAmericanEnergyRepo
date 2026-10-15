import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import type { AuthPrincipal } from "../security/auth.js";

// null means unrestricted; an empty list means no assigned companies.
export async function memberCompanyScope(user: AuthPrincipal | undefined): Promise<number[] | null> {
  if (user?.role !== "member") return null;
  const member = await prisma.user.findUnique({ where: { id: user.id }, select: { company: true } });
  const company = member?.company?.trim();
  if (!company) return [];
  let assignedIds: number[];
  if (/^\d+$/.test(company)) {
    const id = Number(company);
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) return [];
    assignedIds = [id];
  } else {
    // Older accounts can store a company name instead of its ID.
    const matches = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT [id] FROM dbo.tblCompany WHERE [Company Name] = ${company} AND [isDeleted] = 0
    `);
    assignedIds = matches.map((match) => match.id);
  }
  if (!assignedIds.length) return [];

  const companies = await prisma.$queryRaw<Array<{ id: number; parentCompanyId: number | null }>>(Prisma.sql`
    SELECT [id], [ParentCompanyID] AS [parentCompanyId] FROM dbo.tblCompany WHERE [isDeleted] = 0
  `);
  const existingIds = new Set(companies.map((row) => row.id));
  const neighbors = new Map<number, number[]>();
  for (const row of companies) {
    if (row.parentCompanyId == null || !existingIds.has(row.parentCompanyId)) continue;
    neighbors.set(row.id, [...(neighbors.get(row.id) ?? []), row.parentCompanyId]);
    neighbors.set(row.parentCompanyId, [...(neighbors.get(row.parentCompanyId) ?? []), row.id]);
  }

  // Walk the whole family, including ancestors and their other child branches.
  // A visited set also makes malformed cycles safe and avoids duplicate IDs.
  const scope = new Set<number>();
  const pending = assignedIds.filter((id) => existingIds.has(id));
  while (pending.length) {
    const id = pending.pop()!;
    if (scope.has(id)) continue;
    scope.add(id);
    pending.push(...(neighbors.get(id) ?? []));
  }
  return [...scope].sort((a, b) => a - b);
}

export function memberCompanyFilter(column: string, scope: number[] | null): string {
  if (scope === null) return "1 = 1";
  if (!scope.length) return "1 = 0";
  return `${column} IN (${scope.join(",")})`;
}

// Members assigned to an ancestor are also members of its child companies.
export async function companyMemberAssignments(companyId: number): Promise<string[]> {
  const companies = await prisma.$queryRaw<Array<{ id: number; parentCompanyId: number | null; companyName: string | null }>>(Prisma.sql`
    SELECT [id], [ParentCompanyID] AS [parentCompanyId], [Company Name] AS [companyName]
    FROM dbo.tblCompany WHERE [isDeleted] = 0
  `);
  const byId = new Map(companies.map((company) => [company.id, company]));
  const visited = new Set<number>();
  const assignments = new Set<string>();
  let current: number | null = companyId;
  while (current !== null && !visited.has(current)) {
    visited.add(current);
    const company = byId.get(current);
    if (!company) break;
    assignments.add(String(company.id));
    if (company.companyName?.trim()) assignments.add(company.companyName.trim());
    current = company.parentCompanyId ?? null;
  }
  return [...assignments];
}
