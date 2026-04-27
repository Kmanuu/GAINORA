// ============================================================================
// migrate-legacy-projects-to-contracts.ts — Migración one-shot S2.1
// ============================================================================
// Convierte cada Project sin contratos en un Contract real, reconcilia o
// crea el Client desde Project.clientName, y reasigna timeEntries y
// variableCosts al contrato resultante. Idempotente: si el proyecto ya
// tiene contratos, lo salta. Si el cliente ya existe (mismo tenant, mismo
// nombre normalizado), lo reutiliza.
//
// Uso:
//   cd server && npx tsx prisma/migrate-legacy-projects-to-contracts.ts
//
// Comportamiento ante billingMode == SUBSCRIPTION en Project (incoherente
// con el modelo nuevo): se degrada a FIXED en el contrato resultante,
// porque las suscripciones reales requieren campos de los que el Project
// legacy carece (billingDay, billingFrequency).
// ============================================================================

import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

interface Stats {
  projectsScanned:    number;
  projectsSkipped:    number;
  contractsCreated:   number;
  clientsReused:      number;
  clientsCreated:     number;
  timeEntriesLinked:  number;
  varCostsLinked:     number;
  errors:             Array<{ projectId: string; reason: string }>;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function findOrCreateClient(
  tx: Prisma.TransactionClient,
  tenantId: string,
  rawName: string | null,
): Promise<{ clientId: string; created: boolean }> {
  const name = (rawName ?? "").trim() || "Cliente sin nombre";
  const target = normalize(name);

  const existing = await tx.client.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });
  const match = existing.find((c) => normalize(c.name) === target);
  if (match) return { clientId: match.id, created: false };

  const created = await tx.client.create({
    data: { tenantId, name },
    select: { id: true },
  });
  return { clientId: created.id, created: true };
}

async function migrate(): Promise<Stats> {
  const stats: Stats = {
    projectsScanned:   0,
    projectsSkipped:   0,
    contractsCreated:  0,
    clientsReused:     0,
    clientsCreated:    0,
    timeEntriesLinked: 0,
    varCostsLinked:    0,
    errors:            [],
  };

  const legacy = await prisma.project.findMany({
    where: { contracts: { none: {} } },
    orderBy: { createdAt: "asc" },
  });

  for (const p of legacy) {
    stats.projectsScanned += 1;
    try {
      await prisma.$transaction(async (tx) => {
        const { clientId, created } = await findOrCreateClient(tx, p.tenantId, p.clientName);
        if (created) stats.clientsCreated += 1; else stats.clientsReused += 1;

        // SUBSCRIPTION en Project no es válido en el modelo nuevo: degrada a FIXED.
        const safeBillingMode =
          p.billingMode === "SUBSCRIPTION" ? "FIXED" : p.billingMode;

        const contract = await tx.contract.create({
          data: {
            tenantId:         p.tenantId,
            projectId:        p.id,
            clientId,
            tier:             "FREE",
            billingMode:      safeBillingMode,
            price:            p.budgetAmount ?? 0,
            hourlyRate:       p.hourlyRate ?? null,
            partsMarkupPct:   p.partsMarkupPct ?? null,
            budgetHours:      p.budgetHours ?? null,
            maintenanceMode:  "NONE",
            priceIncludesVat: false,
            vatRate:          21,
            status:           p.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
            startedAt:        p.startDate ?? p.createdAt,
            endedAt:          p.endDate ?? null,
            notes:            "Migrado automáticamente desde proyecto legacy",
          },
          select: { id: true },
        });
        stats.contractsCreated += 1;

        const teResult = await tx.timeEntry.updateMany({
          where: { projectId: p.id, contractId: null },
          data:  { contractId: contract.id },
        });
        stats.timeEntriesLinked += teResult.count;

        const vcResult = await tx.variableCost.updateMany({
          where: { projectId: p.id, contractId: null },
          data:  { contractId: contract.id },
        });
        stats.varCostsLinked += vcResult.count;
      });
    } catch (err) {
      stats.errors.push({
        projectId: p.id,
        reason:    err instanceof Error ? err.message : String(err),
      });
      stats.projectsSkipped += 1;
    }
  }

  return stats;
}

(async () => {
  console.log("→ Iniciando migración legacy projects → contracts");
  const stats = await migrate();
  console.log("\n=== Resultado ===");
  console.log(`Proyectos analizados:    ${stats.projectsScanned}`);
  console.log(`Contratos creados:       ${stats.contractsCreated}`);
  console.log(`Clientes reutilizados:   ${stats.clientsReused}`);
  console.log(`Clientes nuevos:         ${stats.clientsCreated}`);
  console.log(`TimeEntries enlazados:   ${stats.timeEntriesLinked}`);
  console.log(`VariableCosts enlazados: ${stats.varCostsLinked}`);
  console.log(`Proyectos saltados:      ${stats.projectsSkipped}`);
  if (stats.errors.length > 0) {
    console.log("\n⚠️  Errores:");
    for (const e of stats.errors) {
      console.log(`  - ${e.projectId}: ${e.reason}`);
    }
    process.exit(1);
  }
  await prisma.$disconnect();
})();
