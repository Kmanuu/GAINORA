// ============================================================================
// profitability.ts — Funciones puras de cálculo de rentabilidad
// ============================================================================
// SIN imports de Prisma, SIN acceso a BD, SIN llamadas externas.
// Solo matemáticas. Los datos llegan ya preparados por el controller.
//
// v3 (Fase 5 - Suscripciones):
//   - billingMode se amplía con SUBSCRIPTION
//   - calculateContractProfitability reemplaza al antiguo por-proyecto
//   - Mantenimiento proporcional (SHARED) entre contratos del mismo producto
//   - issues no facturables restan margen como coste extra
// ============================================================================

export type BillingMode = "FIXED" | "HOURLY" | "HYBRID" | "SUBSCRIPTION";
export type MaintenanceMode = "NONE" | "SHARED" | "CUSTOM";

export interface TimeEntryInput {
  durationMin: number;
  hourlyCost: number;
  isBillable: boolean;
}

export interface VariableCostInput {
  amount: number;
  quantity?: number;
  priceIncludesVat?: boolean;
  vatRate?: number;
  markupPct?: number | null;
}

export type CostingMode = "ABSORPTION" | "CONTRIBUTION";

export interface BusinessMetricsInput {
  /** Costes fijos del tenant ya extendidos al rango (€). */
  totalFixedCosts: number;
  /** Costes directos del rango: mano de obra + piezas de TODOS los contratos (€). */
  totalDirectCosts: number;
  /** Horas facturables registradas en el rango. */
  totalBillableHours: number;
  /** Capacidad planificada del tenant (h/mes). */
  plannedCapacityHours: number;
  /** Margen objetivo del tenant (%). */
  targetMarginPct: number;
  /** Modo de costeo del tenant. */
  costingMode: CostingMode;
  /** Meses cubiertos por el rango (para escalar capacidad). */
  monthsInRange: number;
  /** Umbral mínimo de horas para considerar el cálculo fiable. */
  reliabilityMinHours: number;
}

export interface BusinessMetricsResult {
  /** Coste real por hora (overhead + directo). null si no hay datos suficientes. */
  realHourlyCost: number | null;
  /** Tarifa mínima recomendada (real * (1 + margen)). null si no hay datos suficientes. */
  minimumRate: number | null;
  /** Tasa de absorción de overhead por hora de capacidad. */
  overheadPerHour: number;
  /** Coste directo medio por hora facturable (basado en datos del rango). */
  directCostPerHour: number;
  /** Utilización: horas facturables / capacidad. */
  utilizationPct: number;
  /** Si el cálculo se considera fiable (suficientes datos). */
  isReliable: boolean;
  /** Mensaje legible si el cálculo no es fiable. */
  unreliableReason: string | null;
  /** Capacidad total del rango (h). */
  capacityHours: number;
}

// ---------------------------------------------------------------------------
// Entrada/Salida: Rentabilidad por CONTRATO (Fase 5)
// ---------------------------------------------------------------------------

export interface ContractProfitabilityInput {
  billingMode: BillingMode;
  // SUBSCRIPTION
  price: number;               // cuota recurrente (gross o net según priceIncludesVat)
  // FIXED / HYBRID
  budgetAmount: number;        // importe cerrado del contrato (gross o net según priceIncludesVat)
  setupFee: number;            // importe one-shot al iniciar (gross o net según priceIncludesVat)
  // HOURLY / HYBRID
  hourlyRate: number;          // tarifa por hora (gross o net según priceIncludesVat)
  // Piezas
  partsMarkupPct: number;      // margen por defecto sobre piezas
  // Mantenimiento
  maintenanceMode: MaintenanceMode;
  maintenanceExtraPct: number; // % extra sobre el coste base (para SHARED)
  maintenanceFixedAmount: number; // importe fijo (para CUSTOM)
  productMaintenanceCost: number; // coste base mensual del producto (siempre neto, es coste real)
  activeContractsOfProduct: number; // contratos activos del mismo producto
  // IVA del contrato — los importes de revenue se devuelven SIEMPRE en NETO
  priceIncludesVat: boolean;
  vatRate: number;             // % (e.g. 21)
  // Rango temporal
  monthsInRange: number;       // cuántos meses cubre el cálculo
  startedInRange: boolean;     // si el contrato arrancó dentro del rango
  // Datos brutos
  timeEntries: TimeEntryInput[];
  variableCosts: VariableCostInput[];
  // Impacto de issues no facturables (labor interno + partes con IVA)
  nonBillableIssueCost: number;
  // Globales
  totalMonthlyCosts: number;   // del tenant, YA multiplicado por monthsInRange
  activeContractsCount: number;
}

export interface ContractProfitabilityResult {
  revenue: number;
  recurringRevenue: number;
  setupRevenue: number;
  laborRevenue: number;
  partsRevenue: number;
  maintenanceRevenue: number;
  directCost: number;
  laborCost: number;
  partsCost: number;
  issueCost: number;
  maintenanceCost: number;
  indirectCost: number;
  netMargin: number;
  profitabilityPct: number;
  totalHours: number;
  billableHours: number;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function safeDivide(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

// ---------------------------------------------------------------------------
// Normalizar coste fijo a mensual
// ---------------------------------------------------------------------------

export function normalizeToMonthly(
  amount: number,
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY",
): number {
  switch (frequency) {
    case "MONTHLY":   return round2(amount);
    case "QUARTERLY": return round2(amount / 3);
    case "YEARLY":    return round2(amount / 12);
  }
}

// ---------------------------------------------------------------------------
// Desglose económico de una pieza: realCost (con IVA) + clientPrice (con margen)
// ---------------------------------------------------------------------------

export function calculatePartBreakdown(
  part: VariableCostInput,
  defaultMarkupPct: number = 0,
): { realCost: number; clientPrice: number } {
  const quantity = part.quantity ?? 1;
  const vat      = part.vatRate ?? 21;
  const markup   = part.markupPct ?? defaultMarkupPct;

  const basePerUnit = part.priceIncludesVat
    ? part.amount
    : part.amount * (1 + vat / 100);

  const realCost    = basePerUnit * quantity;
  const clientPrice = realCost * (1 + markup / 100);

  return {
    realCost:    round2(realCost),
    clientPrice: round2(clientPrice),
  };
}

// ---------------------------------------------------------------------------
// Mantenimiento compartido: lo que cada contrato aporta del coste base
// ---------------------------------------------------------------------------

export function calculateSharedMaintenance(
  productMaintenanceCost: number,
  activeContractsOfProduct: number,
): number {
  return round2(safeDivide(productMaintenanceCost, Math.max(1, activeContractsOfProduct)));
}

// ---------------------------------------------------------------------------
// Rentabilidad por contrato (NUEVO — Fase 5)
// ---------------------------------------------------------------------------

export function calculateContractProfitability(
  d: ContractProfitabilityInput,
): ContractProfitabilityResult {
  const mode   = d.billingMode;
  const months = Math.max(1, d.monthsInRange);

  // Conversor a NETO: si el contrato declara que `price/budget/setup/rate`
  // incluyen IVA, lo descontamos para análisis de rentabilidad real.
  // El IVA es un pase a Hacienda, no es ingreso del negocio.
  const factor = 1 + (d.vatRate ?? 21) / 100;
  const toNet  = (gross: number): number =>
    d.priceIncludesVat ? gross / factor : gross;

  // --- Horas y mano de obra ---
  const totalMinutes    = d.timeEntries.reduce((s, e) => s + e.durationMin, 0);
  const billableMinutes = d.timeEntries.filter((e) => e.isBillable).reduce((s, e) => s + e.durationMin, 0);
  const totalHours      = minutesToHours(totalMinutes);
  const billableHours   = minutesToHours(billableMinutes);
  const laborCost       = d.timeEntries.reduce(
    (s, e) => s + minutesToHours(e.durationMin) * e.hourlyCost,
    0,
  );

  // --- Piezas (ya manejan su propio vatRate y priceIncludesVat por línea) ---
  const defaultMarkup = d.partsMarkupPct ?? 0;
  let partsCost    = 0;
  let partsRevenue = 0;
  for (const part of d.variableCosts) {
    const br = calculatePartBreakdown(part, defaultMarkup);
    partsCost    += br.realCost;
    partsRevenue += br.clientPrice;
  }

  // --- Mantenimiento (sólo aplicable a SUBSCRIPTION en general) ---
  let maintenanceRevenue = 0;
  let maintenanceCostInternal = 0;
  if (mode === "SUBSCRIPTION") {
    const shared = calculateSharedMaintenance(d.productMaintenanceCost, d.activeContractsOfProduct);
    maintenanceCostInternal = shared * months; // coste real, ya neto
    if (d.maintenanceMode === "SHARED") {
      // El % extra es markup sobre coste real, sin IVA
      maintenanceRevenue = shared * (1 + (d.maintenanceExtraPct ?? 0) / 100) * months;
    } else if (d.maintenanceMode === "CUSTOM") {
      maintenanceRevenue = toNet(d.maintenanceFixedAmount ?? 0) * months;
    }
  }

  // --- Ingresos por mano de obra ---
  let laborRevenue = 0;
  const rate = toNet(d.hourlyRate ?? 0);
  if (mode === "HOURLY" || mode === "HYBRID") {
    laborRevenue = billableHours * rate;
  }

  // --- Ingresos recurrentes / cerrados (siempre devueltos en NETO) ---
  let recurringRevenue = 0;
  if (mode === "SUBSCRIPTION") {
    recurringRevenue = toNet(d.price ?? 0) * months;
  } else if (mode === "FIXED" || mode === "HYBRID") {
    // El presupuesto cerrado se cobra una vez, al inicio del contrato
    recurringRevenue = d.startedInRange ? toNet(d.budgetAmount ?? 0) : 0;
  }

  // --- Setup fee (one-shot al iniciar) ---
  const setupRevenue = d.startedInRange ? toNet(d.setupFee ?? 0) : 0;

  // --- Ingresos totales ---
  const revenue = recurringRevenue + setupRevenue + laborRevenue + partsRevenue + maintenanceRevenue;

  // --- Costes ---
  const issueCost    = d.nonBillableIssueCost ?? 0;
  const directCost   = laborCost + partsCost + issueCost + maintenanceCostInternal;
  const indirectCost = safeDivide(d.totalMonthlyCosts, d.activeContractsCount);

  // --- Margen ---
  const netMargin        = revenue - directCost - indirectCost;
  const profitabilityPct = safeDivide(netMargin, revenue) * 100;

  return {
    revenue:            round2(revenue),
    recurringRevenue:   round2(recurringRevenue),
    setupRevenue:       round2(setupRevenue),
    laborRevenue:       round2(laborRevenue),
    partsRevenue:       round2(partsRevenue),
    maintenanceRevenue: round2(maintenanceRevenue),
    directCost:         round2(directCost),
    laborCost:          round2(laborCost),
    partsCost:          round2(partsCost),
    issueCost:          round2(issueCost),
    maintenanceCost:    round2(maintenanceCostInternal),
    indirectCost:       round2(indirectCost),
    netMargin:          round2(netMargin),
    profitabilityPct:   round2(profitabilityPct),
    totalHours:         round2(totalHours),
    billableHours:      round2(billableHours),
  };
}

// ---------------------------------------------------------------------------
// Métricas globales del negocio (sin cambios — sigue siendo €/hora y mínima)
// ---------------------------------------------------------------------------

/**
 * Calcula la métrica protagonista del dashboard.
 *
 * Modelo de absorción (default):
 *   overheadPerHour    = totalFixedCosts / capacidadTotalDelRango
 *   directCostPerHour  = totalDirectCosts / horasFacturables (si hay suficientes)
 *   realHourlyCost     = overheadPerHour + directCostPerHour
 *   minimumRate        = realHourlyCost * (1 + targetMarginPct/100)
 *
 * Si las horas facturadas son inferiores al umbral de fiabilidad,
 * realHourlyCost y minimumRate devuelven null y se entrega un motivo.
 * La UI debe mostrar "necesitas X horas para calcular tu tarifa" en
 * vez de un número engañoso.
 */
export function calculateBusinessMetrics(
  data: BusinessMetricsInput,
): BusinessMetricsResult {
  const months = Math.max(1, data.monthsInRange);
  const capacityHours = Math.max(0, data.plannedCapacityHours) * months;

  // Overhead absorbido por hora de capacidad — estable, no depende de
  // cuánto se trabajó realmente.
  const overheadPerHour = capacityHours > 0
    ? round2(data.totalFixedCosts / capacityHours)
    : 0;

  const utilizationPct = capacityHours > 0
    ? round2((data.totalBillableHours / capacityHours) * 100)
    : 0;

  const isReliable = data.totalBillableHours >= data.reliabilityMinHours;
  const unreliableReason = isReliable
    ? null
    : `Necesitas al menos ${data.reliabilityMinHours} horas facturables registradas en el rango para calcular tu tarifa real. Actualmente: ${round2(data.totalBillableHours)}h.`;

  // Coste directo / hora — solo significativo con horas suficientes.
  const directCostPerHour = isReliable
    ? round2(data.totalDirectCosts / data.totalBillableHours)
    : 0;

  if (!isReliable) {
    return {
      realHourlyCost:    null,
      minimumRate:       null,
      overheadPerHour,
      directCostPerHour: 0,
      utilizationPct,
      isReliable:        false,
      unreliableReason,
      capacityHours,
    };
  }

  const realHourlyCost = round2(overheadPerHour + directCostPerHour);
  const marginFactor = 1 + (data.targetMarginPct ?? 0) / 100;
  const minimumRate  = round2(realHourlyCost * marginFactor);

  return {
    realHourlyCost,
    minimumRate,
    overheadPerHour,
    directCostPerHour,
    utilizationPct,
    isReliable:       true,
    unreliableReason: null,
    capacityHours,
  };
}

// ---------------------------------------------------------------------------
// LEGACY — calculateProjectProfitability (deprecado, pero mantenido para no
// romper código externo que pueda seguir llamándolo)
// ---------------------------------------------------------------------------

export interface ProjectProfitabilityInput {
  billingMode?: BillingMode;
  budgetAmount: number;
  hourlyRate?: number;
  partsMarkupPct?: number;
  timeEntries: TimeEntryInput[];
  variableCosts: VariableCostInput[];
  totalFixedCostsMonthly: number;
  activeProjectCount: number;
}

export interface ProjectProfitabilityResult {
  revenue: number;
  laborRevenue: number;
  partsRevenue: number;
  directCost: number;
  laborCost: number;
  partsCost: number;
  indirectCost: number;
  netMargin: number;
  profitabilityPct: number;
  totalHours: number;
}

export function calculateProjectProfitability(
  data: ProjectProfitabilityInput,
): ProjectProfitabilityResult {
  const mode = data.billingMode ?? "FIXED";
  const totalMinutes = data.timeEntries.reduce((s, e) => s + e.durationMin, 0);
  const totalHours   = minutesToHours(totalMinutes);
  const billableMinutes = data.timeEntries.filter((e) => e.isBillable).reduce((s, e) => s + e.durationMin, 0);
  const billableHours   = minutesToHours(billableMinutes);
  const laborCost    = data.timeEntries.reduce(
    (s, e) => s + minutesToHours(e.durationMin) * e.hourlyCost,
    0,
  );

  const defaultMarkup = data.partsMarkupPct ?? 0;
  let partsCost    = 0;
  let partsRevenue = 0;
  for (const part of data.variableCosts) {
    const br = calculatePartBreakdown(part, defaultMarkup);
    partsCost    += br.realCost;
    partsRevenue += br.clientPrice;
  }

  let laborRevenue = 0;
  const rate = data.hourlyRate ?? 0;
  if (mode === "HOURLY" || mode === "HYBRID") laborRevenue = billableHours * rate;

  let revenue: number;
  if (mode === "FIXED" || mode === "SUBSCRIPTION") revenue = data.budgetAmount + partsRevenue;
  else if (mode === "HOURLY") revenue = laborRevenue + partsRevenue;
  else                        revenue = data.budgetAmount + laborRevenue + partsRevenue;

  const directCost   = laborCost + partsCost;
  const indirectCost = safeDivide(data.totalFixedCostsMonthly, data.activeProjectCount);
  const netMargin        = revenue - directCost - indirectCost;
  const profitabilityPct = safeDivide(netMargin, revenue) * 100;

  return {
    revenue:          round2(revenue),
    laborRevenue:     round2(laborRevenue),
    partsRevenue:     round2(partsRevenue),
    directCost:       round2(directCost),
    laborCost:        round2(laborCost),
    partsCost:        round2(partsCost),
    indirectCost:     round2(indirectCost),
    netMargin:        round2(netMargin),
    profitabilityPct: round2(profitabilityPct),
    totalHours:       round2(totalHours),
  };
}
