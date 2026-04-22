// Migración one-shot: convierte proyectos legacy (clientName embebido) en
// Client + Contract, y asigna contractId en todos los TimeEntry y VariableCost
// existentes. Seguro de ejecutar varias veces: salta proyectos que ya tengan
// contratos asociados.
//
// Uso:  tsx prisma/migrate-to-contracts.ts

import { env } from "../src/config/env.js";
import {
  PrismaClient,
  BillingMode,
  ContractTier,
  ContractStatus,
  Status,
} from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

function mapProjectStatusToContract(status: Status): ContractStatus {
  switch (status) {
    case Status.ACTIVE:
      return ContractStatus.ACTIVE;
    case Status.PAUSED:
    case Status.DRAFT:
      return ContractStatus.PAUSED;
    case Status.COMPLETED:
    case Status.CANCELLED:
    default:
      return ContractStatus.CANCELLED;
  }
}

async function main() {
  console.log("→ Migración a Contracts (Fase 5)");

  const projects = await prisma.project.findMany({
    include: { contracts: true },
  });

  let migrated = 0;
  let skipped = 0;

  for (const project of projects) {
    if (project.contracts.length > 0) {
      skipped++;
      continue;
    }

    const clientName = project.clientName?.trim() || "Cliente sin nombre";

    let client = await prisma.client.findFirst({
      where: { tenantId: project.tenantId, name: clientName },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          tenantId: project.tenantId,
          name: clientName,
          taxId: project.clientTaxId,
        },
      });
    }

    const contract = await prisma.contract.create({
      data: {
        tenantId: project.tenantId,
        projectId: project.id,
        clientId: client.id,
        tier: ContractTier.FREE,
        billingMode: project.billingMode ?? BillingMode.FIXED,
        price: project.budgetAmount ?? 0,
        hourlyRate: project.hourlyRate,
        budgetHours: project.budgetHours,
        partsMarkupPct: project.partsMarkupPct,
        status: mapProjectStatusToContract(project.status),
        startedAt: project.startDate ?? project.createdAt,
        endedAt: project.endDate,
      },
    });

    await prisma.timeEntry.updateMany({
      where: { projectId: project.id, contractId: null },
      data: { contractId: contract.id },
    });

    await prisma.variableCost.updateMany({
      where: { projectId: project.id, contractId: null },
      data: { contractId: contract.id },
    });

    console.log(`✓ ${project.name} → Client "${client.name}" + Contract`);
    migrated++;
  }

  console.log(`\nResultado: ${migrated} migrados, ${skipped} saltados`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
