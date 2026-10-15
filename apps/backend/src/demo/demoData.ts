import crypto from "node:crypto";
import type { AuthPrincipal } from "../security/auth.js";

const now = new Date().toISOString();

interface DemoCompany {
  id: string;
  orgId: string;
  name: string;
  industry?: string;
  phone?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

interface DemoContact {
  id: string;
  orgId: string;
  companyId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

interface DemoDeal {
  id: string;
  orgId: string;
  companyId?: string;
  contactId?: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  stage: string;
  probability: number;
  ownerId: string;
  closeDate?: Date;
  createdAt: string;
  updatedAt: string;
}

interface DemoTask {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: string;
  assigneeId?: string;
  relatedType?: string;
  relatedId?: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export const demoUser: AuthPrincipal = {
  id: "demo-superadmin",
  email: "superadmin@allamericanenergy.local",
  role: "superadmin",
  orgId: "demo-org"
};

export const demoCredentials = {
  email: "superadmin@allamericanenergy.local",
  password: "ChangeMe123!"
};

export const demoCompanies: DemoCompany[] = [
  {
    id: "company-bright-future",
    orgId: "demo-org",
    name: "Bright Future Solar",
    industry: "Solar Installation",
    phone: "+1-555-0100",
    website: "https://example.com",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "company-gridwise",
    orgId: "demo-org",
    name: "GridWise Manufacturing",
    industry: "Industrial Energy",
    phone: "+1-555-0145",
    website: "https://example.org",
    createdAt: now,
    updatedAt: now
  }
];

export const demoContacts: DemoContact[] = [
  {
    id: "contact-taylor-reed",
    orgId: "demo-org",
    companyId: "company-bright-future",
    firstName: "Taylor",
    lastName: "Reed",
    email: "taylor.reed@example.com",
    phone: "+1-555-0133",
    role: "Operations Director",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "contact-jordan-lee",
    orgId: "demo-org",
    companyId: "company-gridwise",
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan.lee@example.com",
    phone: "+1-555-0188",
    role: "Facilities Manager",
    createdAt: now,
    updatedAt: now
  }
];

export const demoDeals: DemoDeal[] = [
  {
    id: "deal-commercial-retrofit",
    orgId: "demo-org",
    companyId: "company-bright-future",
    contactId: "contact-taylor-reed",
    title: "Commercial solar retrofit",
    description: "Multi-site energy upgrade proposal.",
    amount: 125000,
    currency: "USD",
    stage: "proposal",
    probability: 60,
    ownerId: demoUser.id,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "deal-efficiency-audit",
    orgId: "demo-org",
    companyId: "company-gridwise",
    contactId: "contact-jordan-lee",
    title: "Facility efficiency audit",
    description: "Audit and rebate analysis for manufacturing line.",
    amount: 42000,
    currency: "USD",
    stage: "qualification",
    probability: 35,
    ownerId: demoUser.id,
    createdAt: now,
    updatedAt: now
  }
];

export const demoTasks: DemoTask[] = [
  {
    id: "task-follow-up",
    orgId: "demo-org",
    title: "Follow up on proposal",
    description: "Send rebate analysis and financing options.",
    status: "open",
    assigneeId: demoUser.id,
    relatedType: "deal",
    relatedId: "deal-commercial-retrofit",
    priority: "high",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "task-schedule-audit",
    orgId: "demo-org",
    title: "Schedule site audit",
    description: "Coordinate with facilities team.",
    status: "in_progress",
    assigneeId: demoUser.id,
    relatedType: "company",
    relatedId: "company-gridwise",
    priority: "medium",
    createdAt: now,
    updatedAt: now
  }
];

export const demoAuditLogs = [
  {
    id: "audit-login",
    orgId: "demo-org",
    userId: demoUser.id,
    action: "demo.started",
    objectType: "system",
    objectId: "demo",
    createdAt: now
  }
];

export function demoRefreshToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function paged<T>(data: T[], page = 1, pageSize = 25) {
  const start = (page - 1) * pageSize;
  return {
    data: data.slice(start, start + pageSize),
    page,
    pageSize,
    total: data.length
  };
}
