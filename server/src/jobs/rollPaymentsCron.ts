// ============================================================================
// rollPaymentsCron.ts — Cron diario de generación automática de cobros
// ============================================================================
// Se ejecuta a las 03:00 hora del servidor cada día. Itera todos los tenants
// y, para cada uno, dispara `runRollForTenant` (la misma lógica que el
// endpoint POST /payments/roll, sin la capa HTTP). Idempotente: el
// @@unique([contractId, periodStart]) bloquea duplicados, así que ejecutar
// dos veces el mismo día es seguro.
//
// Disabled si NODE_ENV === 'test' para no contaminar los runs de tests.
// ============================================================================

import cron from "node-cron";
import prisma from "../lib/prisma.js";
import { runRollForTenant } from "../controllers/payment.controller.js";

const CRON_EXPRESSION = "0 3 * * *"; // todos los días a las 03:00

export function startRollPaymentsCron(): void {
  if (process.env.NODE_ENV === "test") return;

  cron.schedule(CRON_EXPRESSION, async () => {
    const startedAt = new Date();
    console.log(`[cron:rollPayments] iniciado @ ${startedAt.toISOString()}`);

    let okCount = 0;
    let errCount = 0;
    let totalCreated = 0;
    let totalBackfilled = 0;

    try {
      const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
      for (const t of tenants) {
        try {
          const result = await runRollForTenant(t.id);
          totalCreated    += result.created;
          totalBackfilled += result.backfilledPeriods;
          okCount++;
          if (result.created > 0) {
            console.log(`[cron:rollPayments] tenant=${t.slug} created=${result.created} skipped=${result.skipped} backfilled=${result.backfilledPeriods}`);
          }
        } catch (err) {
          errCount++;
          console.error(`[cron:rollPayments] tenant=${t.slug} ERROR`, err);
        }
      }
    } catch (err) {
      console.error("[cron:rollPayments] fallo al listar tenants", err);
    }

    const tookMs = Date.now() - startedAt.getTime();
    console.log(`[cron:rollPayments] fin · tenantsOK=${okCount} err=${errCount} pagosCreados=${totalCreated} backfilled=${totalBackfilled} took=${tookMs}ms`);
  }, { timezone: "Europe/Madrid" });

  console.log(`[cron:rollPayments] programado: "${CRON_EXPRESSION}" (Europe/Madrid)`);
}
