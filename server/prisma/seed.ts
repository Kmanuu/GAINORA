import { env } from "../src/config/env.js";
import { PrismaClient, Plan, Role, Status, Freq } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log("Iniciando el volcado de datos (seed)...");

  // Limpiar datos existentes (opcional, cuidado en producción)
  await prisma.variableCost.deleteMany();
  await prisma.fixedCost.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 1. Crear Tenant (Agencia)
  const tenant = await prisma.tenant.create({
    data: {
      name: "Agencia Creativa Demo",
      slug: "agencia-demo",
      taxId: "B12345678",
      plan: Plan.GROWTH,
    },
  });
  console.log(`✅ Tenant creado: ${tenant.name}`);

  // 2. Crear Usuarios (OWNER, ADMIN, EMPLOYEE)
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
  console.log(`✅ Usuarios creados: ${owner.email}, ${employee.email}`);

  // 3. Crear Proyecto
  const project = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      name: "Rediseño Web Corporativa",
      clientName: "Cliente Importante S.A.",
      status: Status.ACTIVE,
      budgetHours: 100,
      budgetAmount: 5000.0,
    },
  });
  console.log(`✅ Proyecto creado: ${project.name}`);

  // 4. Crear Costes Fijos (Alquiler, Software)
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
  console.log(`✅ Costes fijos añadidos.`);

  // 5. Crear Entradas de Tiempo (Time Entries)
  await prisma.timeEntry.create({
    data: {
      tenantId: tenant.id,
      userId: employee.id,
      projectId: project.id,
      description: "Diseño de prototipos en Figma",
      startedAt: new Date(new Date().setHours(new Date().getHours() - 4)),
      endedAt: new Date(),
      durationMin: 240, // 4 horas
      isBillable: true,
    },
  });
  console.log(`✅ Entradas de tiempo registradas.`);

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
