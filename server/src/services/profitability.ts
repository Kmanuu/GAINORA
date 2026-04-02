// ============================================================================
// profitability.ts — Funciones puras de cálculo de rentabilidad
// ============================================================================
// SIN imports de Prisma, SIN acceso a BD, SIN llamadas externas.
// Solo matemáticas. Los datos llegan ya preparados por el controller/service
// que haga las queries y los pase aquí como parámetro.
// ============================================================================

// ---------------------------------------------------------------------------
// INTERFACES DE ENTRADA
// ---------------------------------------------------------------------------

/** Una entrada de tiempo ya procesada: solo necesitamos minutos y coste/hora */
export interface TimeEntryInput {
  /** Duración en minutos */
  durationMin: number;
  /** Coste por hora del empleado que hizo esta entrada (€/h) */
  hourlyCost: number;
  /** ¿Es facturable? Solo las facturables cuentan para tarifa mínima */
  isBillable: boolean;
}

/** Un coste variable ya extraído de la BD */
export interface VariableCostInput {
  /** Importe del coste en € */
  amount: number;
}

/** Un coste fijo ya normalizado a importe MENSUAL */
export interface FixedCostMonthlyInput {
  /** Importe mensual equivalente en € (si es trimestral → amount/3, anual → amount/12) */
  monthlyAmount: number;
}

/** Datos de entrada para calcular la rentabilidad de UN proyecto */
export interface ProjectProfitabilityInput {
  /** Lo que se le cobra al cliente (budget_amount del proyecto) */
  budgetAmount: number;
  /** Todas las entradas de tiempo asociadas a este proyecto */
  timeEntries: TimeEntryInput[];
  /** Todos los costes variables asociados a este proyecto */
  variableCosts: VariableCostInput[];
  /** Suma mensual de TODOS los costes fijos del tenant (ya normalizados) */
  totalFixedCostsMonthly: number;
  /** Número de proyectos activos del tenant (para repartir costes fijos) */
  activeProjectCount: number;
}

/** Datos de entrada para calcular métricas globales del negocio */
export interface BusinessMetricsInput {
  /** Suma de TODOS los costes del mes: fijos (normalizados) + variables + coste de horas */
  totalMonthlyCosts: number;
  /** Total de horas facturables del mes (en horas, no minutos) */
  totalBillableHours: number;
}

// ---------------------------------------------------------------------------
// INTERFACES DE SALIDA
// ---------------------------------------------------------------------------

/** Resultado de rentabilidad de un proyecto */
export interface ProjectProfitabilityResult {
  /** Ingresos = budget_amount */
  revenue: number;
  /** Σ(horas × coste_hora) + Σ(costes_variables) */
  directCost: number;
  /** Σ(costes_fijos_mes) / nº proyectos activos */
  indirectCost: number;
  /** Ingresos − Coste directo − Coste indirecto */
  netMargin: number;
  /** (Margen neto / Ingresos) × 100 — 0 si ingresos = 0 */
  profitabilityPct: number;
}

/** Métricas globales del negocio */
export interface BusinessMetricsResult {
  /** Σ(todos los costes) / Σ(horas facturables) — 0 si no hay horas */
  realHourlyCost: number;
  /** Coste/hora real × 1.3 (margen mínimo del 30%) */
  minimumRate: number;
}

// ---------------------------------------------------------------------------
// FUNCIONES AUXILIARES (privadas)
// ---------------------------------------------------------------------------

/**
 * Convierte minutos a horas decimales.
 * Ej: 150 min → 2.5 h
 */
function minutesToHours(minutes: number): number {
  return minutes / 60;
}

/**
 * Redondea a 2 decimales para evitar errores de punto flotante.
 * Ej: 33.33333333 → 33.33
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * División segura: si el divisor es 0 o negativo, devuelve 0.
 * Evita NaN e Infinity en los cálculos.
 */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

// ---------------------------------------------------------------------------
// FUNCIÓN EXPORTADA: Normalizar coste fijo a mensual
// ---------------------------------------------------------------------------

/**
 * Convierte un coste fijo a su equivalente mensual según la frecuencia.
 *
 * - MONTHLY    → se queda igual
 * - QUARTERLY  → amount / 3
 * - YEARLY     → amount / 12
 *
 * El controller llama a esto ANTES de pasar los datos a calculateProjectProfitability.
 */
export function normalizeToMonthly(
  amount: number,
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY",
): number {
  switch (frequency) {
    case "MONTHLY":
      return round2(amount);
    case "QUARTERLY":
      return round2(amount / 3);
    case "YEARLY":
      return round2(amount / 12);
  }
}

// ---------------------------------------------------------------------------
// FUNCIÓN EXPORTADA: Rentabilidad de UN proyecto
// ---------------------------------------------------------------------------

/**
 * Calcula la rentabilidad de un proyecto concreto.
 *
 * Fórmula:
 *   Ingresos        = budget_amount
 *   Coste directo   = Σ(horas × coste_hora_empleado) + Σ(costes_variables)
 *   Coste indirecto = Σ(costes_fijos_mes) / nº proyectos activos
 *   Margen neto     = Ingresos − Coste directo − Coste indirecto
 *   % Rentabilidad  = (Margen neto / Ingresos) × 100
 *
 * Caso límite: si budgetAmount = 0, profitabilityPct devuelve 0 (no Infinity).
 * Caso límite: si activeProjectCount = 0, indirectCost devuelve 0.
 */
export function calculateProjectProfitability(
  data: ProjectProfitabilityInput,
): ProjectProfitabilityResult {
  // --- 1. Ingresos: lo que se le cobra al cliente ---
  const revenue = round2(data.budgetAmount);

  // --- 2. Coste directo: horas trabajadas + gastos puntuales ---
  // 2a. Coste de las horas: cada entrada × (minutos→horas × €/h del empleado)
  const laborCost = data.timeEntries.reduce((sum, entry) => {
    const hours = minutesToHours(entry.durationMin);
    return sum + hours * entry.hourlyCost;
  }, 0);

  // 2b. Costes variables: suma directa de importes
  const variableCostTotal = data.variableCosts.reduce(
    (sum, cost) => sum + cost.amount,
    0,
  );

  const directCost = round2(laborCost + variableCostTotal);

  // --- 3. Coste indirecto: costes fijos repartidos entre proyectos activos ---
  const indirectCost = round2(
    safeDivide(data.totalFixedCostsMonthly, data.activeProjectCount),
  );

  // --- 4. Margen neto ---
  const netMargin = round2(revenue - directCost - indirectCost);

  // --- 5. Porcentaje de rentabilidad ---
  // Si revenue = 0, evitamos división por cero → 0%
  const profitabilityPct = round2(safeDivide(netMargin, revenue) * 100);

  return {
    revenue,
    directCost,
    indirectCost,
    netMargin,
    profitabilityPct,
  };
}

// ---------------------------------------------------------------------------
// FUNCIÓN EXPORTADA: Métricas globales del negocio
// ---------------------------------------------------------------------------

/**
 * Calcula el coste/hora real y la tarifa mínima recomendada del negocio.
 *
 * Fórmula:
 *   Coste/hora real = Σ(todos los costes del mes) / Σ(horas facturables del mes)
 *   Tarifa mínima   = Coste/hora real × 1.3
 *
 * Caso límite: si totalBillableHours = 0, ambos valores devuelven 0.
 */
export function calculateBusinessMetrics(
  data: BusinessMetricsInput,
): BusinessMetricsResult {
  const realHourlyCost = round2(
    safeDivide(data.totalMonthlyCosts, data.totalBillableHours),
  );

  // Margen mínimo del 30% sobre el coste real
  const minimumRate = round2(realHourlyCost * 1.3);

  return {
    realHourlyCost,
    minimumRate,
  };
}
