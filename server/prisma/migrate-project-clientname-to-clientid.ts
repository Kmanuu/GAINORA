/**
 * Backfill Project.clientId — S3.2
 *
 * Para cada Project con clientId NULL:
 *  1. Si el Project tiene contracts, usa el clientId del primer contract
 *     (S2 garantiza coherencia: distinctClientIds = 1 por Project).
 *  2. Si el Project no tiene contracts (no debería pasar tras S2, pero
 *     defensivo): busca/crea un Client por nombre normalizado a partir
 *     de Project.clientName.
 *
 * Idempotente: re-ejecutar no duplica nada.
 */
import prisma from "../src/lib/prisma.js";

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true, name: true } });

  let totalAssignedFromContract = 0;
  let totalAssignedFromName     = 0;
  let totalCreatedClients       = 0;
  let totalSkippedNoData        = 0;

  for (const t of tenants) {
    console.log(`\n=== Tenant: ${t.name} (${t.slug}) ===`);

    const projects = await prisma.project.findMany({
      where:  { tenantId: t.id, clientId: null },
      select: {
        id:         true,
        name:       true,
        clientName: true,
        contracts:  { select: { clientId: true }, take: 1, orderBy: { createdAt: "asc" } },
      },
    });

    if (projects.length === 0) {
      console.log("  Nada que migrar (todos los projects tienen clientId).");
      continue;
    }

    const tenantClients = await prisma.client.findMany({
      where:  { tenantId: t.id },
      select: { id: true, name: true },
    });
    const clientByNormName = new Map(tenantClients.map((c) => [normalizeName(c.name), c.id]));

    for (const p of projects) {
      // Caso A: derivar de contract
      if (p.contracts.length > 0) {
        await prisma.project.update({
          where: { id: p.id },
          data:  { clientId: p.contracts[0].clientId },
        });
        totalAssignedFromContract++;
        console.log(`  ✓ "${p.name}" → clientId desde contract`);
        continue;
      }

      // Caso B: sin contracts → resolver por clientName
      if (!p.clientName || p.clientName.trim() === "") {
        console.log(`  ⚠ "${p.name}" sin contracts ni clientName — saltado`);
        totalSkippedNoData++;
        continue;
      }

      const norm = normalizeName(p.clientName);
      let clientId = clientByNormName.get(norm);

      if (!clientId) {
        const created = await prisma.client.create({
          data:   { tenantId: t.id, name: p.clientName.trim() },
          select: { id: true },
        });
        clientId = created.id;
        clientByNormName.set(norm, clientId);
        totalCreatedClients++;
        console.log(`  + Cliente creado: "${p.clientName.trim()}" para "${p.name}"`);
      }

      await prisma.project.update({
        where: { id: p.id },
        data:  { clientId },
      });
      totalAssignedFromName++;
      console.log(`  ✓ "${p.name}" → clientId desde clientName "${p.clientName}"`);
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Asignados desde Contract: ${totalAssignedFromContract}`);
  console.log(`Asignados desde clientName: ${totalAssignedFromName}`);
  console.log(`Clients creados: ${totalCreatedClients}`);
  console.log(`Saltados (sin datos): ${totalSkippedNoData}`);

  // Verificación final
  const stillNull = await prisma.project.count({ where: { clientId: null } });
  console.log(`\nProjects con clientId NULL tras migración: ${stillNull}`);
  if (stillNull > 0) {
    console.error("⚠ Hay Projects huérfanos. Revisar antes de hacer NOT NULL.");
    process.exitCode = 1;
  } else {
    console.log("✅ Todos los Projects tienen clientId. Listo para hacer NOT NULL.");
  }

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
