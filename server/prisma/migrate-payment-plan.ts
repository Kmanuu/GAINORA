// ============================================================================
// migrate-payment-plan.ts
// ----------------------------------------------------------------------------
// Migración idempotente para Fase 5 PRO:
//   1. Renombra el enum "Plan" (planes del SaaS) a "TenantPlan", liberando el
//      nombre para el nuevo modelo Plan (catálogo de planes del tenant).
//   2. Renombra la columna payments.paid_amount → payments.amount_paid.
//   3. Añade payments.amount_net, vat_rate, amount_gross, amount_due.
//   4. Hace backfill de las columnas nuevas a partir del antiguo payments.amount.
//
// Después de este script, `prisma db push` puede aplicar el schema final
// (eliminará la columna antigua `amount` sin pérdida real porque su valor
// vive ya en amount_gross).
// ============================================================================

import { Client } from "pg";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no definida en .env");

  const db = new Client({ connectionString: url });
  await db.connect();
  console.log("→ Conectado a la base de datos");

  await db.query("BEGIN");
  try {
    // 1. Renombrar enum Plan → TenantPlan (si aún existe con el nombre viejo)
    const enumOld = await db.query(`SELECT 1 FROM pg_type WHERE typname = 'Plan'`);
    if (enumOld.rows.length > 0) {
      await db.query(`ALTER TYPE "Plan" RENAME TO "TenantPlan"`);
      console.log("✓ enum Plan → TenantPlan");
    } else {
      console.log("• enum Plan ya renombrado, skip");
    }

    // 2. Renombrar columna paid_amount → amount_paid (preserva datos)
    const paidAmountCol = await db.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'payments' AND column_name = 'paid_amount'
    `);
    if (paidAmountCol.rows.length > 0) {
      await db.query(`ALTER TABLE payments RENAME COLUMN paid_amount TO amount_paid`);
      console.log("✓ payments.paid_amount → amount_paid");
    } else {
      console.log("• payments.paid_amount ya renombrado, skip");
    }

    // 3. Añadir nuevas columnas (idempotente)
    await db.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS amount_net   DECIMAL(12,2),
        ADD COLUMN IF NOT EXISTS vat_rate     DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS amount_gross DECIMAL(12,2),
        ADD COLUMN IF NOT EXISTS amount_due   DECIMAL(12,2)
    `);
    console.log("✓ Columnas amount_net, vat_rate, amount_gross, amount_due añadidas");

    // 4. Backfill desde la columna antigua `amount` (solo si todavía existe)
    const amountCol = await db.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'payments' AND column_name = 'amount'
    `);
    if (amountCol.rows.length > 0) {
      const r = await db.query(`
        UPDATE payments p SET
          vat_rate     = COALESCE(p.vat_rate,     c.vat_rate,    21),
          amount_gross = COALESCE(p.amount_gross, p.amount),
          amount_due   = COALESCE(p.amount_due,   p.amount),
          amount_net   = COALESCE(
            p.amount_net,
            ROUND( (p.amount / (1 + COALESCE(c.vat_rate, 21) / 100))::numeric, 2 )
          )
        FROM contracts c
        WHERE c.id = p.contract_id
      `);
      console.log(`✓ Backfill aplicado a ${r.rowCount} filas de payments`);
    } else {
      console.log("• Columna `amount` ya eliminada, no hay nada que migrar");
    }

    // 5. Marcar nuevas columnas como NOT NULL una vez tengan datos coherentes.
    //    Solo se hace si no quedan nulls — protege contra estados parciales.
    const nullsCount = await db.query(`
      SELECT COUNT(*)::int AS n FROM payments
      WHERE amount_net IS NULL OR amount_gross IS NULL
         OR amount_due IS NULL OR vat_rate IS NULL
    `);
    if (nullsCount.rows[0].n === 0) {
      await db.query(`
        ALTER TABLE payments
          ALTER COLUMN amount_net   SET NOT NULL,
          ALTER COLUMN vat_rate     SET NOT NULL,
          ALTER COLUMN amount_gross SET NOT NULL,
          ALTER COLUMN amount_due   SET NOT NULL
      `);
      console.log("✓ Nuevas columnas marcadas NOT NULL");
    } else {
      console.log(`⚠ ${nullsCount.rows[0].n} filas con nulls — se quedan nullables hasta resolver`);
    }

    await db.query("COMMIT");
    console.log("\n✅ Migración aplicada correctamente.");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error("❌ Error en migración:", e);
  process.exit(1);
});
