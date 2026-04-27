// ============================================================================
// profitability.ts — Cálculos puros de rentabilidad en cliente
// ============================================================================
// Espejo del servicio del backend. Permite mostrar desgloses en tiempo real
// sin esperar al dashboard endpoint.
// ============================================================================

import type { Project, TimeEntry, VarCost, BillingMode } from '@/types';
import { toNum } from '@/lib/format';

// ---------------------------------------------------------------------------
// Pieza / material — desglose económico
// ---------------------------------------------------------------------------

export interface PartBreakdown {
  /** Coste real con IVA incluido × cantidad — lo que paga el negocio */
  realCost: number;
  /** Precio al cliente con margen aplicado */
  clientPrice: number;
  /** Cantidad × base unitaria (sin IVA ni margen) */
  netBase: number;
  /** Importe del IVA sobre la base */
  vatAmount: number;
  /** Importe del margen añadido */
  markupAmount: number;
}

/** Desglose económico de un coste variable (pieza) */
export function partBreakdown(cost: VarCost, defaultMarkupPct = 0): PartBreakdown {
  const amount  = toNum(cost.amount);
  const qty     = toNum(cost.quantity) || 1;
  const vat     = toNum(cost.vatRate);
  const markup  = cost.markupPct != null ? toNum(cost.markupPct) : defaultMarkupPct;

  // Base sin IVA
  const netPerUnit = cost.priceIncludesVat ? amount / (1 + vat / 100) : amount;
  const netBase    = netPerUnit * qty;
  const vatAmount  = netBase * (vat / 100);

  const realCost     = netBase + vatAmount;
  const markupAmount = realCost * (markup / 100);
  const clientPrice  = realCost + markupAmount;

  return {
    realCost:     round2(realCost),
    clientPrice:  round2(clientPrice),
    netBase:      round2(netBase),
    vatAmount:    round2(vatAmount),
    markupAmount: round2(markupAmount),
  };
}

// ---------------------------------------------------------------------------
// Proyecto — rentabilidad completa
// ---------------------------------------------------------------------------

export interface ProjectMetrics {
  totalHours:       number;
  billableHours:    number;
  laborCost:        number;
  laborRevenue:     number;
  partsCost:        number;
  partsRevenue:     number;
  directCost:       number;
  revenue:          number;
  netMargin:        number;
  profitabilityPct: number;
}

export interface HourlyCostLike {
  hourlyCost?: string | number | null;
}

/** Calcula las métricas económicas de un proyecto en el cliente */
export function computeProjectMetrics(
  project: Pick<Project, 'billingMode' | 'budgetAmount' | 'hourlyRate' | 'partsMarkupPct'>,
  entries: (TimeEntry & { user?: HourlyCostLike })[],
  costs:   VarCost[],
): ProjectMetrics {
  const mode      = project.billingMode ?? 'FIXED';
  const budget    = toNum(project.budgetAmount);
  const rate      = toNum(project.hourlyRate);
  const defMarkup = toNum(project.partsMarkupPct);

  const totalMin      = entries.reduce((s, e) => s + toNum(e.durationMin), 0);
  const billableMin   = entries.filter((e) => e.isBillable).reduce((s, e) => s + toNum(e.durationMin), 0);
  const totalHours    = totalMin / 60;
  const billableHours = billableMin / 60;

  const laborCost = entries.reduce((s, e) => {
    const hours = toNum(e.durationMin) / 60;
    const hCost = e.user?.hourlyCost != null ? toNum(e.user.hourlyCost) : 0;
    return s + hours * hCost;
  }, 0);

  let partsCost    = 0;
  let partsRevenue = 0;
  for (const c of costs) {
    const b = partBreakdown(c, defMarkup);
    partsCost    += b.realCost;
    partsRevenue += b.clientPrice;
  }

  let laborRevenue = 0;
  if (mode === 'HOURLY' || mode === 'HYBRID') {
    laborRevenue = billableHours * rate;
  }

  let revenue: number;
  if (mode === 'FIXED' || mode === 'SUBSCRIPTION') {
    revenue = budget + partsRevenue;
  } else if (mode === 'HOURLY') {
    revenue = laborRevenue + partsRevenue;
  } else {
    // HYBRID
    revenue = budget + laborRevenue + partsRevenue;
  }

  const directCost       = laborCost + partsCost;
  const netMargin        = revenue - directCost;
  const profitabilityPct = revenue > 0 ? (netMargin / revenue) * 100 : 0;

  return {
    totalHours:       round2(totalHours),
    billableHours:    round2(billableHours),
    laborCost:        round2(laborCost),
    laborRevenue:     round2(laborRevenue),
    partsCost:        round2(partsCost),
    partsRevenue:     round2(partsRevenue),
    directCost:       round2(directCost),
    revenue:          round2(revenue),
    netMargin:        round2(netMargin),
    profitabilityPct: round2(profitabilityPct),
  };
}

// ---------------------------------------------------------------------------
// Etiquetas y helpers UI
// ---------------------------------------------------------------------------

export const BILLING_MODE_LABEL: Record<BillingMode, string> = {
  FIXED:  'Presupuesto cerrado',
  HOURLY: 'Por horas',
  HYBRID: 'Mixto (presupuesto + horas)',
  SUBSCRIPTION: 'Suscripción',
};

export const BILLING_MODE_DESCRIPTION: Record<BillingMode, string> = {
  FIXED:  'Sabes de antemano lo que vas a cobrar. Las horas trabajadas se contabilizan para saber si sales rentable, pero no afectan al precio final.',
  HOURLY: 'No sabes cuánto vas a tardar. Se cobra según el tiempo real registrado (tarifa × horas). Ideal para reparaciones o tareas abiertas.',
  HYBRID: 'Un presupuesto base (anticipo/fijo) más las horas reales. Útil cuando te contratan un marco de horas pero luego hay extras.',
  SUBSCRIPTION: 'Cobro recurrente mensual o periódico por un servicio continuo.',
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
