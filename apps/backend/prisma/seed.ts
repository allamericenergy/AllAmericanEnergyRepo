import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

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
    update: { passwordHash, status: "active", role: Role.superadmin, orgId: org.id },
    create: {
      email,
      passwordHash,
      firstName: "System",
      lastName: "Admin",
      role: Role.superadmin,
      status: "active",
      orgId: org.id
    }
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
