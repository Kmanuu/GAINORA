// ============================================================================
// paymentMath.ts — Funciones puras para desglose IVA y estado de pagos
// ============================================================================
// Sin imports de Prisma, sin acceso a BD. Reutilizable en cualquier capa.
// ============================================================================

export type PaymentStatusValue = "PENDING" | "PARTIAL" | "PAID";

export interface BreakdownInput {
  amountGross?: number;
  amountNet?: number;
  vatRate: number;
}

export interface BreakdownOutput {
  amountNet: number;
  amountGross: number;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Devuelve { amountNet, amountGross } a partir de cualquiera de los dos.
 * Si vienen ambos, se respetan tal cual (el cliente sabe lo que hace).
 * Si no viene ninguno, devuelve ceros.
 */
export function breakdownPayment(input: BreakdownInput): BreakdownOutput {
  const vat = input.vatRate ?? 21;
  const factor = 1 + vat / 100;

  if (input.amountGross !== undefined && input.amountNet !== undefined) {
    return { amountNet: round2(input.amountNet), amountGross: round2(input.amountGross) };
  }
  if (input.amountGross !== undefined) {
    return { amountGross: round2(input.amountGross), amountNet: round2(input.amountGross / factor) };
  }
  if (input.amountNet !== undefined) {
    return { amountNet: round2(input.amountNet), amountGross: round2(input.amountNet * factor) };
  }
  return { amountNet: 0, amountGross: 0 };
}

/**
 * A partir del `price` de un contrato y su flag `priceIncludesVat`,
 * resuelve cuál es Gross y cuál es Net. Para crear pagos automáticamente.
 */
export function breakdownFromContractPrice(
  price: number,
  vatRate: number,
  priceIncludesVat: boolean,
): BreakdownOutput {
  return priceIncludesVat
    ? breakdownPayment({ amountGross: price, vatRate })
    : breakdownPayment({ amountNet:   price, vatRate });
}

/**
 * Estado del pago en función de cuánto se ha cobrado vs cuánto se debía.
 */
export function deriveStatus(amountPaid: number, amountDue: number): PaymentStatusValue {
  if (amountPaid <= 0)         return "PENDING";
  if (amountPaid + 0.001 >= amountDue) return "PAID";
  return "PARTIAL";
}

// ============================================================================
// Periodos de facturación (S5)
// ============================================================================
// Funciones puras para resolver periodos según frecuencia (MONTHLY,
// QUARTERLY, YEARLY) y calcular prorrateo de primer y último periodo cuando
// el contrato no cubre el periodo completo. Trabajamos siempre en UTC para
// evitar deslizamientos por zona horaria (Prisma @db.Date llega en UTC).
// ============================================================================

export type BillingFrequency = "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface BillingPeriod {
  /** Primer día del periodo (UTC, hora 00:00). */
  periodStart: Date;
  /** Último día del periodo (UTC, hora 00:00). */
  periodEnd:   Date;
}

/** Crea Date a inicio del día UTC. */
function utcDay(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

/** Normaliza una fecha (potencialmente con hora) a inicio del día UTC. */
function toUtcDay(d: Date): Date {
  return utcDay(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Devuelve el periodo facturable que contiene la fecha dada.
 * - MONTHLY: del 1 al último día del mes.
 * - QUARTERLY: trimestres naturales (Q1: ene-mar, Q2: abr-jun, etc.).
 * - YEARLY: año natural (1 enero a 31 diciembre).
 */
export function getPeriodForDate(date: Date, frequency: BillingFrequency): BillingPeriod {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  if (frequency === "MONTHLY") {
    return {
      periodStart: utcDay(y, m, 1),
      periodEnd:   utcDay(y, m + 1, 0),
    };
  }
  if (frequency === "QUARTERLY") {
    const qStartMonth = Math.floor(m / 3) * 3;
    return {
      periodStart: utcDay(y, qStartMonth, 1),
      periodEnd:   utcDay(y, qStartMonth + 3, 0),
    };
  }
  // YEARLY
  return {
    periodStart: utcDay(y, 0, 1),
    periodEnd:   utcDay(y, 12, 0),
  };
}

/** Inicio del periodo siguiente al dado, según frecuencia. */
export function nextPeriodStart(periodStart: Date, frequency: BillingFrequency): Date {
  const y = periodStart.getUTCFullYear();
  const m = periodStart.getUTCMonth();
  const step = frequency === "MONTHLY" ? 1 : frequency === "QUARTERLY" ? 3 : 12;
  return utcDay(y, m + step, 1);
}

/** Días inclusivos entre dos fechas. */
function daysInclusive(from: Date, to: Date): number {
  const ms = toUtcDay(to).getTime() - toUtcDay(from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * Fracción [0..1] del periodo cubierta por la vigencia del contrato.
 * - 1 si el contrato cubre el periodo entero.
 * - <1 si el contrato empieza después del inicio del periodo o termina antes
 *   del fin del periodo (primer/último periodo prorrateado).
 * - 0 si no hay solapamiento.
 */
export function prorationFactor(
  periodStart: Date,
  periodEnd:   Date,
  contractStart: Date,
  contractEnd:   Date | null,
): number {
  const ps = toUtcDay(periodStart);
  const pe = toUtcDay(periodEnd);
  const cs = toUtcDay(contractStart);
  const ce = contractEnd ? toUtcDay(contractEnd) : null;

  const start = cs > ps ? cs : ps;
  const end   = ce && ce < pe ? ce : pe;
  if (end < start) return 0;

  const periodDays = daysInclusive(ps, pe);
  const overlap    = daysInclusive(start, end);
  const factor     = overlap / periodDays;
  return Math.min(1, Math.max(0, Math.round(factor * 1000) / 1000));
}

/**
 * Lista de periodos entre el inicio del contrato y `until` (o `contractEnd`,
 * lo que ocurra antes). Cada entrada incluye su factor de prorrateo; los
 * periodos centrales son siempre 1.
 *
 * No filtra contra Payments ya existentes — eso lo gestiona el controller
 * cruzando con la BD por @@unique([contractId, periodStart]).
 */
export function getMissingPeriods(
  contractStart: Date,
  contractEnd:   Date | null,
  frequency:     BillingFrequency,
  until:         Date = new Date(),
): Array<BillingPeriod & { prorationFactor: number }> {
  const horizon = contractEnd && toUtcDay(contractEnd) < toUtcDay(until)
    ? toUtcDay(contractEnd)
    : toUtcDay(until);

  const result: Array<BillingPeriod & { prorationFactor: number }> = [];
  let current = getPeriodForDate(contractStart, frequency);

  // Cap defensivo: máx. 600 iteraciones (≈50 años mensuales).
  let safety = 600;
  while (current.periodStart.getTime() <= horizon.getTime() && safety-- > 0) {
    const factor = prorationFactor(
      current.periodStart, current.periodEnd, contractStart, contractEnd,
    );
    if (factor > 0) {
      result.push({
        periodStart:     current.periodStart,
        periodEnd:       current.periodEnd,
        prorationFactor: factor,
      });
    }
    const nextStart = nextPeriodStart(current.periodStart, frequency);
    const nextNext  = nextPeriodStart(nextStart, frequency);
    current = {
      periodStart: nextStart,
      // último día del periodo siguiente = inicio del que sigue – 1 día.
      periodEnd:   new Date(nextNext.getTime() - 86_400_000),
    };
  }
  return result;
}
