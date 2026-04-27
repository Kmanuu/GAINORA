import { env } from "../src/config/env.js";
import {
  PrismaClient,
  TenantPlan,
  Role,
  Status,
  Freq,
  BillingMode,
  ContractTier,
  ContractStatus,
  MaintenanceMode,
  PaymentStatus,
} from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando el volcado de datos (seed)...");

  // Orden importa por FKs. Borrar hijos antes que padres.
  await prisma.payment.deleteMany();
  await prisma.variableCost.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.client.deleteMany();
  await prisma.fixedCost.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 1. Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Agencia Creativa Demo",
      slug: "agencia-demo",
      taxId: "B12345678",
      plan: TenantPlan.GROWTH,
    },
  });
  console.log(`✅ Tenant: ${tenant.name}`);

  // 2. Usuarios
  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "owner@agencia-demo.com",
      passwordHash,
      fullName: "Laura (Propietaria)",
      role: Role.OWNER,
      hourlyCost: 50.0,
    },
  });

  const employee = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "designer@agencia-demo.com",
      passwordHash,
      fullName: "Carlos (Diseñador)",
      role: Role.EMPLOYEE,
      hourlyCost: 25.0,
    },
  });
  console.log(`✅ Usuarios: ${owner.email}, ${employee.email}`);

  // 3. Clientes
  const clientImportante = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      name: "Cliente Importante S.A.",
      taxId: "A87654321",
      email: "contacto@cliente-importante.com",
    },
  });

  const clientTaller = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      name: "Taller Mecánico López",
      email: "info@tallerlopez.es",
    },
  });
  console.log(`✅ Clientes: ${clientImportante.name}, ${clientTaller.name}`);

  // 4. Catálogo de planes que ofrece este tenant a sus clientes
  const planFree = await prisma.plan.create({
    data: {
      tenantId: tenant.id,
      name: "Free",
      tier: ContractTier.FREE,
      description: "Acceso básico de prueba",
      billingMode: BillingMode.SUBSCRIPTION,
      price: 0,
      maintenanceMode: MaintenanceMode.NONE,
      features: ["dashboard_basico", "max_1_proyecto"],
      limits: { maxUsers: 1, maxProjects: 1 },
    },
  });

  const planPro = await prisma.plan.create({
    data: {
      tenantId: tenant.id,
      name: "Pro",
      tier: ContractTier.PRO,
      description: "Plan estándar con soporte",
      billingMode: BillingMode.SUBSCRIPTION,
      price: 10,
      maintenanceMode: MaintenanceMode.SHARED,
      maintenanceExtraPct: 20,
      features: ["dashboard_completo", "issues", "soporte_email"],
      limits: { maxUsers: 5, maxProjects: 25 },
    },
  });

  const planMax = await prisma.plan.create({
    data: {
      tenantId: tenant.id,
      name: "Max",
      tier: ContractTier.MAX,
      description: "Plan empresa con soporte prioritario",
      billingMode: BillingMode.SUBSCRIPTION,
      price: 49,
      maintenanceMode: MaintenanceMode.SHARED,
      maintenanceExtraPct: 30,
      features: ["dashboard_completo", "issues", "soporte_prioritario", "api"],
      limits: { maxUsers: 50, maxProjects: 999 },
    },
  });
  console.log(`✅ Planes catálogo: ${planFree.name}, ${planPro.name}, ${planMax.name}`);

  // 5. Proyectos / Productos (mantenemos clientName legacy para compat UI actual)
  const project = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      name: "Rediseño Web Corporativa",
      clientName: clientImportante.name,
      clientTaxId: clientImportante.taxId,
      status: Status.ACTIVE,
      billingMode: BillingMode.FIXED,
      budgetHours: 100,
      budgetAmount: 5000.0,
    },
  });

  const productoHoraspro = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      name: "HorasPRO (Suscripción)",
      description: "Producto propio en modo suscripción",
      status: Status.ACTIVE,
      billingMode: BillingMode.SUBSCRIPTION,
      productMaintenanceCost: 5.0,
    },
  });
  console.log(`✅ Proyectos: ${project.name}, ${productoHoraspro.name}`);

  // 6. Contratos
  const contractRediseno = await prisma.contract.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      clientId: clientImportante.id,
      tier: ContractTier.PRO,
      billingMode: BillingMode.FIXED,
      price: 5000.0,
      status: ContractStatus.ACTIVE,
      startedAt: new Date(),
    },
  });

  const contractTallerSub = await prisma.contract.create({
    data: {
      tenantId: tenant.id,
      projectId: productoHoraspro.id,
      clientId: clientTaller.id,
      planId: planPro.id,
      tier: ContractTier.PRO,
      billingMode: BillingMode.SUBSCRIPTION,
      price: 10.0,
      maintenanceMode: MaintenanceMode.SHARED,
      maintenanceExtraPct: 20,
      billingDay: 1,
      status: ContractStatus.ACTIVE,
      startedAt: new Date(),
    },
  });
  console.log(`✅ Contratos: ${contractRediseno.id.slice(0, 8)}, ${contractTallerSub.id.slice(0, 8)}`);

  // 7. Costes Fijos
  await prisma.fixedCost.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: "Alquiler Oficina COWORKING",
        amount: 300.0,
        frequency: Freq.MONTHLY,
        category: "Estructura",
      },
      {
        tenantId: tenant.id,
        name: "Suscripción Adobe CC",
        amount: 60.0,
        frequency: Freq.MONTHLY,
        category: "Software",
      },
    ],
  });
  console.log(`✅ Costes fijos.`);

  // 8. Time Entries
  await prisma.timeEntry.create({
    data: {
      tenantId: tenant.id,
      userId: employee.id,
      projectId: project.id,
      contractId: contractRediseno.id,
      description: "Diseño de prototipos en Figma",
      startedAt: new Date(new Date().setHours(new Date().getHours() - 4)),
      endedAt: new Date(),
      durationMin: 240,
      isBillable: true,
    },
  });
  console.log(`✅ Entradas de tiempo.`);

  // 9. Pago pendiente del primer periodo de la suscripción del taller (10€ con IVA 21%)
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);

  const vat = 21;
  const gross = 10.0;
  const net = +(gross / (1 + vat / 100)).toFixed(2);

  await prisma.payment.create({
    data: {
      tenantId:    tenant.id,
      contractId:  contractTallerSub.id,
      periodStart,
      periodEnd,
      amountNet:   net,
      vatRate:     vat,
      amountGross: gross,
      amountDue:   gross,
      status:      PaymentStatus.PENDING,
    },
  });
  console.log(`✅ Pago demo creado (pendiente).`);

  console.log("🎉 Seed completado con éxito.");
}

main()
  .catch((e) => {
    console.error("Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
