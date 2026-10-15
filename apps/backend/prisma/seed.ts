import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { allPermissions, permissionMatrix, type Role } from "../src/security/permissions.js";

const prisma = new PrismaClient();

const rolePriority: Record<Role, number> = {
  superadmin: 0,
  admin: 10,
  member: 50,
  user: 100
};

function splitPermission(permission: string) {
  const [module, action] = permission.split(".");
  return { module, action, displayName: `${module} ${action}` };
}

async function seedPermissions() {
  for (const permission of allPermissions) {
    const data = splitPermission(permission);
    await prisma.permission.upsert({
      where: { module_action: { module: data.module, action: data.action } },
      update: { displayName: data.displayName },
      create: data
    });
  }
}

async function seedRole(roleName: Role, orgId: string) {
  const role = await prisma.authRole.upsert({
    where: { orgId_name: { orgId, name: roleName } },
    update: { isSystemRole: true, priority: rolePriority[roleName] },
    create: {
      orgId,
      name: roleName,
      description: `${roleName} system role`,
      priority: rolePriority[roleName],
      isSystemRole: true
    }
  });

  for (const permissionKey of permissionMatrix[roleName]) {
    const { module, action } = splitPermission(permissionKey);
    const permission = await prisma.permission.findUniqueOrThrow({ where: { module_action: { module, action } } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id }
    });
  }

  return role;
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "seed-allamericanenergy" },
    update: {},
    create: {
      id: "seed-allamericanenergy",
      name: "AllAmericanEnergy",
      address: "United States"
    }
  });

  const email = process.env.SUPERADMIN_EMAIL ?? "superadmin@allamericanenergy.local";
  const password = process.env.SUPERADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const superadmin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, status: "active", role: "superadmin", orgId: org.id, emailVerified: true },
    create: {
      email,
      username: "superadmin",
      passwordHash,
      firstName: "System",
      lastName: "Admin",
      role: "superadmin",
      status: "active",
      emailVerified: true,
      orgId: org.id
    }
  });

  await seedPermissions();
  const superadminRole = await seedRole("superadmin", org.id);
  await seedRole("admin", org.id);
  await seedRole("member", org.id);
  await seedRole("user", org.id);

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superadmin.id, roleId: superadminRole.id } },
    update: {},
    create: { userId: superadmin.id, roleId: superadminRole.id }
  });

  await prisma.passwordHistory.create({
    data: { userId: superadmin.id, passwordHash }
  });

  const company = await prisma.company.create({
    data: {
      orgId: org.id,
      name: "Bright Future Solar",
      industry: "Solar Installation",
      phone: "+1-555-0100",
      website: "https://example.com"
    }
  });

  const contact = await prisma.contact.create({
    data: {
      orgId: org.id,
      companyId: company.id,
      firstName: "Taylor",
      lastName: "Reed",
      email: "taylor.reed@example.com",
      phone: "+1-555-0133",
      role: "Operations Director"
    }
  });

  await prisma.deal.create({
    data: {
      orgId: org.id,
      companyId: company.id,
      contactId: contact.id,
      title: "Commercial solar retrofit",
      description: "Initial opportunity for a multi-site energy upgrade.",
      amount: 125000,
      stage: "proposal",
      probability: 60,
      ownerId: superadmin.id
    }
  });

  await prisma.task.create({
    data: {
      orgId: org.id,
      title: "Follow up on proposal",
      description: "Send rebate analysis and financing options.",
      assigneeId: superadmin.id,
      relatedType: "contact",
      relatedId: contact.id,
      priority: "high"
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
