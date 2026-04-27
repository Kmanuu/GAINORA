/**
 * Backfill: tenants sin InvoiceSeries reciben una serie "A" general por defecto.
 * Ejecutar una sola vez tras desplegar el cambio en register():
 *   cd server && npx tsx prisma/backfill-default-invoice-series.ts
 */
import prisma from "../src/lib/prisma.js";

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { invoiceSeries: true } },
    },
  });

  const targets = tenants.filter((t) => t._count.invoiceSeries === 0);
  if (targets.length === 0) {
    console.log("Todos los tenants ya tienen al menos una serie. Nada que hacer.");
    return;
  }

  console.log(`Tenants sin serie: ${targets.length}`);
  for (const t of targets) {
    await prisma.invoiceSeries.create({
      data: {
        tenantId: t.id,
        code: "A",
        name: "General",
        nextNumber: 1,
        isDefault: true,
      },
    });
    console.log(`  ✓ ${t.name} (${t.id}) → serie A creada`);
  }
  console.log("Backfill completado.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
