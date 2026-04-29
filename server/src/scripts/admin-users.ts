#!/usr/bin/env tsx
/**
 * Gestión de usuarios Gainora — uso exclusivo local/dev
 *
 * Comandos:
 *   list                          → listar todos los tenants y usuarios
 *   create <email> <pass> <name>  → crear usuario en un tenant existente
 *   reset <email> <newpass>       → cambiar contraseña
 *   delete <email>                → eliminar usuario
 *   tenant-list                   → listar tenants (slug + plan)
 *   tenant-create <name> <slug>   → crear tenant nuevo
 */

import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

const [, , cmd, ...args] = process.argv;

async function main() {
  switch (cmd) {
    case "list": {
      const tenants = await prisma.tenant.findMany({
        include: { users: { select: { email: true, fullName: true, role: true, isActive: true } } },
        orderBy: { createdAt: "asc" },
      });
      if (!tenants.length) { console.log("Sin tenants en la base de datos."); break; }
      for (const t of tenants) {
        console.log(`\n🏢 ${t.name}  (slug: ${t.slug}  plan: ${t.plan}  id: ${t.id})`);
        if (!t.users.length) { console.log("   — sin usuarios"); continue; }
        for (const u of t.users) {
          const estado = u.isActive ? "✅" : "❌";
          console.log(`   ${estado} ${u.email}  [${u.role}]  ${u.fullName}`);
        }
      }
      break;
    }

    case "create": {
      const [email, password, ...nameParts] = args;
      const fullName = nameParts.join(" ") || email;
      if (!email || !password) {
        console.error("Uso: create <email> <password> [nombre completo]");
        process.exit(1);
      }
      const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "asc" } });
      if (!tenants.length) { console.error("No hay tenants. Crea uno primero con tenant-create."); process.exit(1); }

      let tenant = tenants[0];
      if (tenants.length > 1) {
        console.log("Tenants disponibles:");
        tenants.forEach((t, i) => console.log(`  ${i + 1}. ${t.name} (${t.slug})`));
        // Usa el primero por defecto — para elegir otro pasa slug como 4º arg
        const slugArg = nameParts[nameParts.length - 1];
        const found = tenants.find(t => t.slug === slugArg);
        if (found) { tenant = found; console.log(`Usando tenant: ${tenant.name}`); }
        else { console.log(`Usando primer tenant: ${tenant.name}`); }
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { tenantId: tenant.id, email, passwordHash, fullName, role: "OWNER" },
      });
      console.log(`\n✅ Usuario creado: ${user.email} en tenant "${tenant.name}"`);
      break;
    }

    case "reset": {
      const [email, newPassword] = args;
      if (!email || !newPassword) { console.error("Uso: reset <email> <nuevaContraseña>"); process.exit(1); }
      const passwordHash = await bcrypt.hash(newPassword, 12);
      const updated = await prisma.user.updateMany({ where: { email }, data: { passwordHash } });
      if (!updated.count) { console.error(`Usuario no encontrado: ${email}`); process.exit(1); }
      console.log(`✅ Contraseña actualizada para ${email}`);
      break;
    }

    case "delete": {
      const [email] = args;
      if (!email) { console.error("Uso: delete <email>"); process.exit(1); }
      const deleted = await prisma.user.deleteMany({ where: { email } });
      if (!deleted.count) { console.error(`Usuario no encontrado: ${email}`); process.exit(1); }
      console.log(`✅ Usuario eliminado: ${email}`);
      break;
    }

    case "tenant-list": {
      const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "asc" } });
      if (!tenants.length) { console.log("Sin tenants."); break; }
      console.log("\nTenants:");
      tenants.forEach(t => console.log(`  ${t.name}  slug: ${t.slug}  plan: ${t.plan}  id: ${t.id}`));
      break;
    }

    case "tenant-create": {
      const [name, slug] = args;
      if (!name || !slug) { console.error("Uso: tenant-create <nombre> <slug>"); process.exit(1); }
      const tenant = await prisma.tenant.create({ data: { name, slug } });
      console.log(`✅ Tenant creado: ${tenant.name} (${tenant.slug}) → ${tenant.id}`);
      break;
    }

    default:
      console.log(`
Gainora — Admin de usuarios
─────────────────────────────────────────────────────
  npx tsx src/scripts/admin-users.ts list
  npx tsx src/scripts/admin-users.ts create <email> <pass> [nombre]
  npx tsx src/scripts/admin-users.ts reset <email> <nuevaPass>
  npx tsx src/scripts/admin-users.ts delete <email>
  npx tsx src/scripts/admin-users.ts tenant-list
  npx tsx src/scripts/admin-users.ts tenant-create <nombre> <slug>
`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
