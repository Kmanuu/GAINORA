/**
 * Crea 3 usuarios de prueba (ADMIN/EMPLOYEE/VIEWER) en agencia-demo,
 * todos con password "demo1234". Idempotente: si el email ya existe lo
 * salta. Útil para QA y Claude-Chrome.
 *
 * Uso:  npx tsx src/scripts/seed-team-users.ts
 */
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

const USERS = [
  { email: "pepa-admin@gainora.test",    fullName: "Pepa Romero (Admin)",       role: "ADMIN",    hourlyCost: 38 },
  { email: "juan-empleado@gainora.test", fullName: "Juan Pérez (Empleado)",     role: "EMPLOYEE", hourlyCost: 25 },
  { email: "asesor-viewer@gainora.test", fullName: "Cristina Asesora (Viewer)", role: "VIEWER",   hourlyCost: 0  },
] as const;

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "agencia-demo" } });
  if (!tenant) {
    console.error("Tenant agencia-demo no encontrado");
    process.exit(1);
  }
  const hash = await bcrypt.hash("demo1234", 12);

  for (const u of USERS) {
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      select: { id: true, role: true },
    });
    if (existing) {
      // Sincronizamos rol y password por si los toqué a mano antes.
      await prisma.user.update({
        where: { id: existing.id },
        data:  { role: u.role, passwordHash: hash, fullName: u.fullName, hourlyCost: u.hourlyCost > 0 ? u.hourlyCost : null, isActive: true },
      });
      console.log(`actualizado: ${u.email} (${u.role})`);
    } else {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: u.email,
          passwordHash: hash,
          fullName: u.fullName,
          role: u.role,
          hourlyCost: u.hourlyCost > 0 ? u.hourlyCost : null,
        },
      });
      console.log(`creado: ${u.email} (${u.role})`);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
