/**
 * Crea/sincroniza 5 usuarios (uno por rol) en el tenant agencia-demo
 * para QA. Todos con password "password123". Idempotente.
 *
 * Uso:  npx tsx src/scripts/seed-qa-roles.ts
 */
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

const PASSWORD = "password123";
const TENANT_SLUG = "agencia-demo";

const USERS = [
  { email: "manuel@agencia-demo.com",   fullName: "Manuel (Superadmin)",  role: "SUPERADMIN" as const, hourlyCost: null  },
  { email: "owner@agencia-demo.com",    fullName: "Olivia (Owner)",       role: "OWNER"      as const, hourlyCost: 60    },
  { email: "admin@agencia-demo.com",    fullName: "Pepa (Admin)",         role: "ADMIN"      as const, hourlyCost: 38    },
  { email: "juan@agencia-demo.com",     fullName: "Juan (Employee)",      role: "EMPLOYEE"   as const, hourlyCost: 25    },
  { email: "cristina@agencia-demo.com", fullName: "Cristina (Viewer)",    role: "VIEWER"     as const, hourlyCost: null  },
];

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) {
    console.error(`Tenant ${TENANT_SLUG} no encontrado. Ejecuta primero el seed principal.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const u of USERS) {
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      select: { id: true },
    });

    const data = {
      passwordHash,
      fullName:   u.fullName,
      role:       u.role,
      hourlyCost: u.hourlyCost,
      isActive:   true,
    };

    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data });
      console.log(`actualizado: ${u.email}  (${u.role})`);
    } else {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email:    u.email,
          ...data,
        },
      });
      console.log(`creado:      ${u.email}  (${u.role})`);
    }
  }

  console.log(`\nTodos los usuarios listos. Password: ${PASSWORD}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
