/**
 * Seed S7 — InvoiceSeries default
 *
 * Por cada tenant existente, asegura que hay una serie "A" marcada como
 * isDefault. Idempotente.
 */
import prisma from "../src/lib/prisma.js";

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true, name: true } });

  let created = 0;
  let kept    = 0;

  for (const t of tenants) {
    const existing = await prisma.invoiceSeries.findUnique({
      where: { tenantId_code: { tenantId: t.id, code: "A" } },
    });
    if (existing) {
      kept++;
      console.log(`  · ${t.slug}: ya tenía serie "A" (next=${existing.nextNumber})`);
      continue;
    }
    await prisma.invoiceSeries.create({
      data: {
        tenantId:   t.id,
        code:       "A",
        name:       "General",
        nextNumber: 1,
        isDefault:  true,
      },
    });
    created++;
    console.log(`  + ${t.slug}: serie "A" creada`);
  }

  console.log(`\nResumen: ${created} creadas · ${kept} ya existían (sobre ${tenants.length} tenants)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
