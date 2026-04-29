/**
 * FASE 3 — Limpia toda la BD y crea la empresa "hnx" como única tenant.
 *
 * Pasos:
 *   1. Borra TODO el contenido de todos los tenants (orden topológico).
 *   2. Crea tenant "hnx" con configuración default.
 *   3. Crea 5 usuarios (uno por rol) con password "password123".
 *   4. Siembra datos demo realistas (usando seedDemo) bajo el OWNER.
 *   5. Resume el estado final por consola.
 *
 * Uso:
 *   npx tsx src/scripts/wipe-and-seed-hnx.ts
 *
 * Avisos:
 *   - DESTRUCTIVO. Borra todo. No tiene undo.
 *   - Idempotente: si ya existe hnx, lo borra y lo vuelve a crear limpio.
 */
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { seedDemo } from "../services/demoSeed.js";

const PASSWORD = "password123";
const TENANT_SLUG = "hnx";

const USERS = [
  { email: "manuel@hnx.app",   fullName: "Manuel (Superadmin)", role: "SUPERADMIN" as const, hourlyCost: null },
  { email: "owner@hnx.app",    fullName: "Olivia (Owner)",      role: "OWNER"      as const, hourlyCost: 60   },
  { email: "admin@hnx.app",    fullName: "Pepa (Admin)",        role: "ADMIN"      as const, hourlyCost: 38   },
  { email: "juan@hnx.app",     fullName: "Juan (Employee)",     role: "EMPLOYEE"   as const, hourlyCost: 25   },
  { email: "cristina@hnx.app", fullName: "Cristina (Viewer)",   role: "VIEWER"     as const, hourlyCost: null },
];

async function wipe() {
  console.log("→ Borrando contenido de todos los tenants…");
  // Orden topológico (deps más profundas primero, respeta Restrict de Project→Client e Invoice→Series).
  await prisma.invoiceAuditLog.deleteMany({});
  await prisma.invoiceLine.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.invoice.deleteMany({});       // antes de InvoiceSeries (Restrict)
  await prisma.payment.deleteMany({});
  await prisma.timeEntry.deleteMany({});
  await prisma.variableCost.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.invoiceSeries.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.project.deleteMany({});       // antes de Client (Restrict)
  await prisma.client.deleteMany({});
  await prisma.fixedCost.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
  console.log("  BD limpia.");
}

async function createHnxTenant() {
  console.log(`→ Creando tenant "${TENANT_SLUG}"…`);
  const tenant = await prisma.tenant.create({
    data: {
      name: "hnx",
      slug: TENANT_SLUG,
      plan: "GROWTH",
      plannedCapacityHours: 160,
      targetMarginPct: 30,
      costingMode: "ABSORPTION",
      reliabilityMinHours: 5,
    },
  });
  console.log(`  tenant.id = ${tenant.id}`);
  return tenant;
}

async function createUsers(tenantId: string) {
  console.log("→ Creando 5 usuarios (uno por rol)…");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const created: { id: string; email: string; role: string }[] = [];
  for (const u of USERS) {
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        hourlyCost: u.hourlyCost,
        isActive: true,
      },
    });
    console.log(`  ${u.role.padEnd(10)} ${u.email}`);
    created.push({ id: user.id, email: user.email, role: user.role });
  }
  return created;
}

async function createDefaultInvoiceSeries(tenantId: string) {
  await prisma.invoiceSeries.create({
    data: {
      tenantId,
      code: "A",
      name: "General",
      nextNumber: 1,
      isDefault: true,
    },
  });
  console.log("→ Serie de facturación default A creada.");
}

async function main() {
  await wipe();
  const tenant = await createHnxTenant();
  const users = await createUsers(tenant.id);
  await createDefaultInvoiceSeries(tenant.id);

  // Sembramos los datos demo bajo el OWNER (es quien suele ver el wizard).
  const owner = users.find((u) => u.role === "OWNER")!;
  console.log("→ Sembrando datos demo realistas bajo el OWNER…");
  const result = await seedDemo({ tenantId: tenant.id, userId: owner.id });
  console.log(`  ${result.clients} clientes, ${result.projects} proyectos, ${result.contracts} contratos, ${result.payments} cobros, ${result.invoices} facturas, ${result.timeHours}h fichadas, ${result.fixedCosts} costes fijos, ${result.varCosts} costes variables.`);

  console.log("\nResumen final:");
  console.log(`  tenant:    ${tenant.name} (slug ${tenant.slug})`);
  console.log(`  password:  ${PASSWORD}`);
  console.log(`  emails:`);
  for (const u of users) {
    console.log(`    ${u.role.padEnd(10)} ${u.email}`);
  }
  console.log("\nListo para deploy.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e);
  prisma.$disconnect();
  process.exit(1);
});
