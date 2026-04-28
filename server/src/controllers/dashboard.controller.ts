// ============================================================================
// dashboard.controller.ts — Métricas del negocio (Fase 5)
// ============================================================================
// Acepta rango temporal variable (week/month/quarter/year/custom).
// Calcula rentabilidad AGRUPANDO CONTRATOS (no proyectos). Proyectos siguen
// apareciendo en la respuesta por compat con el frontend actual — se calculan
// sumando la rentabilidad de sus contratos activos.
// Incluye endpoint /projection?months=N para proyección pura.
// ============================================================================

import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import {
  normalizeToMonthly,
  calculateContractProfitability,
  calculateBusinessMetrics,
  round2,
  type ContractProfitabilityInput,
  type MaintenanceMode,
  type BillingMode,
  type CostingMode,
} from "../services/profitability.js";
import { generateModel303Pdf, generateModel130Pdf } from "../services/taxModelPdf.js";

// ---------------------------------------------------------------------------
// Helpers de rango temporal
// ---------------------------------------------------------------------------

type RangeKey = "week" | "month" | "quarter" | "year" | "custom";

interface ResolvedRange {
  from: Date;
  to: Date;
  monthsInRange: number;
  period: RangeKey;
}

function resolveRange(param: string | undefined, from?: string, to?: string): ResolvedRange {
  const now = new Date();
  let start: Date;
  let end: Date;
  const period = (param ?? "month") as RangeKey;

  if (period === "custom" && from && to) {
    start = new Date(from);
    end   = new Date(to);
  } else if (period === "week") {
    const day  = now.getDay();          // 0 = domingo
    const diff = day === 0 ? 6 : day - 1;
    start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    end   = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    end   = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
  } else if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1);
    end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const monthsInRange = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1,
  );

  return { from: start, to: end, monthsInRange, period };
}

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard
// ---------------------------------------------------------------------------

export async function getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { from, to, monthsInRange, period } = resolveRange(
      req.query.range as string | undefined,
      req.query.from as string | undefined,
      req.query.to as string | undefined,
    );

    // Contratos activos en el rango: status ACTIVE y (endedAt null o endedAt >= from)
    const activeContracts = await prisma.contract.findMany({
      where: {
        tenantId,
        status:    "ACTIVE",
        startedAt: { lte: to },
        OR: [{ endedAt: null }, { endedAt: { gte: from } }],
      },
      include: {
        project: { select: { id: true, name: true, productMaintenanceCost: true, billingMode: true } },
        client:  { select: { id: true, name: true } },
        timeEntries: {
          where: { startedAt: { gte: from, lte: to } },
          include: { user: { select: { hourlyCost: true } } },
        },
        varCosts: { where: { date: { gte: from, lte: to } } },
        issues: {
          include: {
            timeEntries: {
              where: { startedAt: { gte: from, lte: to } },
              include: { user: { select: { hourlyCost: true } } },
            },
            varCosts: { where: { date: { gte: from, lte: to } } },
          },
        },
      },
    });

    const activeContractsCount = activeContracts.length;

    // Configuración de coste/capacidad del tenant — necesaria tanto en
    // el cálculo por contrato (costingMode) como en el cálculo global.
    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: {
        plannedCapacityHours: true,
        targetMarginPct:      true,
        costingMode:          true,
        reliabilityMinHours:  true,
      },
    });
    const tenantCostingMode: CostingMode = (tenant?.costingMode ?? "ABSORPTION") as CostingMode;

    // Costes fijos del tenant
    const fixedCosts = await prisma.fixedCost.findMany({ where: { tenantId, isActive: true } });
    const fixedPerMonth = fixedCosts.reduce(
      (s, fc) => s + normalizeToMonthly(Number(fc.amount), fc.frequency),
      0,
    );

    // Coste de mantenimiento de productos con contratos activos (una vez por proyecto)
    const productMaintByProject = new Map<string, number>();
    for (const c of activeContracts) {
      if (!productMaintByProject.has(c.project.id)) {
        productMaintByProject.set(c.project.id, Number(c.project.productMaintenanceCost ?? 0));
      }
    }
    const productMaintPerMonth = Array.from(productMaintByProject.values()).reduce((s, v) => s + v, 0);

    const totalMonthlyCostsInRange = (fixedPerMonth + productMaintPerMonth) * monthsInRange;

    // Contratos activos por producto (para reparto de mantenimiento SHARED)
    const contractsByProduct: Record<string, number> = {};
    for (const c of activeContracts) {
      contractsByProduct[c.project.id] = (contractsByProduct[c.project.id] ?? 0) + 1;
    }

    // Rentabilidad por contrato
    const contractsMetrics = activeContracts.map((c) => {
      // Separar entries/costs de issues facturables (cuentan como trabajo normal)
      // de los de issues NO facturables (cuentan como coste extra, reducen margen).
      const billableIssues    = c.issues.filter((i) => i.isBillable);
      const nonBillableIssues = c.issues.filter((i) => !i.isBillable);

      const allTimeEntries = [
        ...c.timeEntries,
        ...billableIssues.flatMap((i) => i.timeEntries),
      ];
      const allVarCosts = [
        ...c.varCosts,
        ...billableIssues.flatMap((i) => i.varCosts),
      ];

      const timeEntriesInput = allTimeEntries.map((te) => ({
        durationMin: te.durationMin,
        hourlyCost:  Number(te.user.hourlyCost ?? 0),
        isBillable:  te.isBillable,
      }));
      const varCostsInput = allVarCosts.map((vc) => ({
        amount:           Number(vc.amount),
        quantity:         Number(vc.quantity ?? 1),
        priceIncludesVat: vc.priceIncludesVat ?? false,
        vatRate:          Number(vc.vatRate ?? 21),
        markupPct:        vc.markupPct != null ? Number(vc.markupPct) : null,
      }));

      // Coste de issues no facturables: labor interno + partes (con IVA)
      let nonBillableIssueCost = 0;
      for (const issue of nonBillableIssues) {
        const labor = issue.timeEntries.reduce(
          (s, te) => s + (te.durationMin / 60) * Number(te.user.hourlyCost ?? 0),
          0,
        );
        const parts = issue.varCosts.reduce((s, vc) => {
          const qty  = Number(vc.quantity ?? 1);
          const base = Number(vc.amount);
          const vat  = Number(vc.vatRate ?? 21);
          const unit = vc.priceIncludesVat ? base : base * (1 + vat / 100);
          return s + unit * qty;
        }, 0);
        nonBillableIssueCost += labor + parts;
      }

      const startedInRange = c.startedAt >= from && c.startedAt <= to;

      const input: ContractProfitabilityInput = {
        billingMode:              c.billingMode as BillingMode,
        price:                    Number(c.price),
        budgetAmount:             (c.billingMode === "FIXED" || c.billingMode === "HYBRID")
                                    ? Number(c.price)
                                    : 0,
        setupFee:                 Number(c.setupFee ?? 0),
        hourlyRate:               Number(c.hourlyRate ?? 0),
        partsMarkupPct:           Number(c.partsMarkupPct ?? 0),
        maintenanceMode:          c.maintenanceMode as MaintenanceMode,
        maintenanceExtraPct:      Number(c.maintenanceExtraPct ?? 0),
        maintenanceFixedAmount:   Number(c.maintenanceFixedAmount ?? 0),
        productMaintenanceCost:   Number(c.project.productMaintenanceCost ?? 0),
        activeContractsOfProduct: contractsByProduct[c.project.id] ?? 1,
        priceIncludesVat:         c.priceIncludesVat,
        vatRate:                  Number(c.vatRate ?? 21),
        monthsInRange,
        startedInRange,
        timeEntries:              timeEntriesInput,
        variableCosts:            varCostsInput,
        nonBillableIssueCost,
        totalMonthlyCosts:        totalMonthlyCostsInRange,
        activeContractsCount,
        costingMode:              tenantCostingMode,
      };

      const profitability = calculateContractProfitability(input);

      return { contract: c, profitability };
    });

    // Nota: el bloque legacyProjects que metía Contracts ficticios con
    // id `legacy_*` se eliminó en S2.2. Los proyectos sin contratos se
    // migraron one-shot con migrate-legacy-projects-to-contracts.ts.
    // De ahora en adelante, todo proyecto ACTIVE debe tener al menos un
    // contrato; si no lo tiene, no aparece en el dashboard hasta que el
    // usuario lo cree.

    // Agregar a nivel proyecto (compat con frontend actual)
    const projectsMap = new Map<string, any>();
    for (const { contract, profitability } of contractsMetrics) {
      const key = contract.project.id;
      if (!projectsMap.has(key)) {
        projectsMap.set(key, {
          id:              contract.project.id,
          name:            contract.project.name,
          clientName:      contract.client.name,
          billingMode:     contract.billingMode,
          revenue:         0,
          directCost:      0,
          indirectCost:    0,
          laborCost:       0,
          partsCost:       0,
          netMargin:       0,
          totalHours:      0,
          contractCount:   0,
          profitabilityPct: 0,
        });
      }
      const p = projectsMap.get(key);
      p.revenue       += profitability.revenue;
      p.directCost    += profitability.directCost;
      p.indirectCost  += profitability.indirectCost;
      p.laborCost     += profitability.laborCost;
      p.partsCost     += profitability.partsCost;
      p.netMargin     += profitability.netMargin;
      p.totalHours    += profitability.totalHours;
      p.contractCount += 1;
    }
    const projectsList = Array.from(projectsMap.values())
      .map((p) => ({
        ...p,
        revenue:          round2(p.revenue),
        directCost:       round2(p.directCost),
        indirectCost:     round2(p.indirectCost),
        laborCost:        round2(p.laborCost),
        partsCost:        round2(p.partsCost),
        netMargin:        round2(p.netMargin),
        totalHours:       round2(p.totalHours),
        profitabilityPct: p.revenue > 0 ? round2((p.netMargin / p.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.netMargin - a.netMargin);

    // Business metrics
    const totalBillableHours = contractsMetrics.reduce(
      (s, { profitability }) => s + profitability.billableHours,
      0,
    );
    const totalDirectCosts = contractsMetrics.reduce(
      (s, { profitability }) => s + profitability.directCost,
      0,
    );

    const business = calculateBusinessMetrics({
      // Costes FIJOS del rango — separados de los directos.
      totalFixedCosts:       totalMonthlyCostsInRange,
      // Costes DIRECTOS del rango: mano de obra + piezas (ya por contrato).
      totalDirectCosts,
      totalBillableHours,
      plannedCapacityHours:  tenant?.plannedCapacityHours ?? 160,
      targetMarginPct:       Number(tenant?.targetMarginPct ?? 30),
      costingMode:           tenantCostingMode,
      monthsInRange,
      reliabilityMinHours:   tenant?.reliabilityMinHours ?? 5,
    });

    // Recurring revenue (MRR) — siempre en NETO para que el dashboard refleje
    // ingreso real del negocio, no el bruto que va a Hacienda.
    const mrr = activeContracts
      .filter((c) => c.billingMode === "SUBSCRIPTION")
      .reduce((s, c) => {
        const price  = Number(c.price);
        const vat    = Number(c.vatRate ?? 21);
        const net    = c.priceIncludesVat ? price / (1 + vat / 100) : price;
        return s + net;
      }, 0);

    res.json({
      success: true,
      data: {
        business,
        projects: projectsList,
        contracts: contractsMetrics.map(({ contract, profitability }) => ({
          id:           contract.id,
          projectId:    contract.project.id,
          projectName:  contract.project.name,
          clientId:     contract.client.id,
          clientName:   contract.client.name,
          tier:         contract.tier,
          billingMode:  contract.billingMode,
          status:       contract.status,
          price:        Number(contract.price),
          ...profitability,
        })),
        summary: {
          activeProjectCount:     projectsMap.size,
          activeContractCount:    activeContractsCount,
          totalFixedCostsMonthly: round2(fixedPerMonth),
          totalBillableHours:     round2(totalBillableHours),
          recurringRevenue:       round2(mrr),
          monthsInRange,
          range: {
            from:   from.toISOString(),
            to:     to.toISOString(),
            period,
          },
          // Compat con el frontend actual:
          monthRange: { from: from.toISOString(), to: to.toISOString() },
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/projection?months=N
// ---------------------------------------------------------------------------

export async function getProjection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const parsed = parseInt((req.query.months as string) ?? "12", 10);
    const months = Math.min(60, Math.max(1, isNaN(parsed) ? 12 : parsed));

    const activeSubs = await prisma.contract.findMany({
      where: {
        tenantId,
        billingMode: "SUBSCRIPTION",
        status:      "ACTIVE",
      },
      include: {
        project: { select: { id: true, productMaintenanceCost: true } },
      },
    });

    // MRR en NETO (igual que en /dashboard) para análisis de rentabilidad real.
    const mrr = activeSubs.reduce((s, c) => {
      const price = Number(c.price);
      const vat   = Number(c.vatRate ?? 21);
      const net   = c.priceIncludesVat ? price / (1 + vat / 100) : price;
      return s + net;
    }, 0);
    const activeSubsCount = activeSubs.length;

    const fixedCosts = await prisma.fixedCost.findMany({ where: { tenantId, isActive: true } });
    const fixedMonthly = fixedCosts.reduce(
      (s, fc) => s + normalizeToMonthly(Number(fc.amount), fc.frequency),
      0,
    );

    // productMaintenanceCost sumado una vez por proyecto
    const seen = new Set<string>();
    let productMaintMonthly = 0;
    for (const c of activeSubs) {
      if (!seen.has(c.project.id)) {
        seen.add(c.project.id);
        productMaintMonthly += Number(c.project.productMaintenanceCost ?? 0);
      }
    }

    const monthlyCosts = fixedMonthly + productMaintMonthly;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTime = await prisma.timeEntry.findMany({
      where: { tenantId, contract: { billingMode: "SUBSCRIPTION", status: "ACTIVE" }, startedAt: { gte: thirtyDaysAgo } },
      include: { user: { select: { hourlyCost: true } } },
    });
    const recentParts = await prisma.variableCost.findMany({
      where: { tenantId, contract: { billingMode: "SUBSCRIPTION", status: "ACTIVE" }, date: { gte: thirtyDaysAgo } },
    });

    let avgDirectCostMonthly = 0;
    for (const te of recentTime) {
      avgDirectCostMonthly += (te.durationMin / 60) * Number(te.user.hourlyCost ?? 0);
    }
    for (const vc of recentParts) {
      const qty = Number(vc.quantity ?? 1);
      const vat = Number(vc.vatRate ?? 21);
      const base = Number(vc.amount);
      const real = vc.priceIncludesVat ? base : base * (1 + vat / 100);
      avgDirectCostMonthly += real * qty;
    }

    const totalMonthlyCosts = monthlyCosts + avgDirectCostMonthly;

    res.json({
      success: true,
      data: {
        months,
        mrr:                 round2(mrr),
        monthlyCosts:        round2(totalMonthlyCosts),
        projectedRevenue:    round2(mrr * months),
        projectedCosts:      round2(totalMonthlyCosts * months),
        projectedProfit:     round2((mrr - totalMonthlyCosts) * months),
        activeSubscriptions: activeSubsCount,
        avgRevenuePerSub:    activeSubsCount > 0 ? round2(mrr / activeSubsCount) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ===========================================================================
// GET /api/v1/dashboard/collections-health
// ===========================================================================
// Métricas de morosidad: DSO global y por cliente, top 3 clientes que más
// tardan en pagar, y desglose del pendiente por antigüedad (0-30, 30-60,
// 60-90, 90+ días).
// ===========================================================================
export async function getCollectionsHealth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const now = new Date();

    const payments = await prisma.payment.findMany({
      where: { tenantId },
      include: {
        contract: {
          select: {
            id:     true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    // DSO = Days Sales Outstanding = días promedio entre creación del pago
    // y su cobro. Solo se computa en payments PAID.
    const paid = payments.filter((p) => p.status === "PAID" && p.paidAt);
    const dsoSamples: number[] = [];
    const dsoByClient: Map<string, { name: string; sum: number; count: number }> = new Map();

    for (const p of paid) {
      const days = Math.max(0, Math.round(
        (new Date(p.paidAt!).getTime() - new Date(p.createdAt).getTime()) / 86_400_000,
      ));
      dsoSamples.push(days);
      const cid  = p.contract.client.id;
      const cnam = p.contract.client.name;
      const cur  = dsoByClient.get(cid) ?? { name: cnam, sum: 0, count: 0 };
      cur.sum += days;
      cur.count++;
      dsoByClient.set(cid, cur);
    }

    const dsoGlobal = dsoSamples.length > 0
      ? Math.round(dsoSamples.reduce((s, n) => s + n, 0) / dsoSamples.length)
      : null;

    const slowestClients = Array.from(dsoByClient.entries())
      .map(([id, v]) => ({ clientId: id, name: v.name, avgDays: Math.round(v.sum / v.count), invoicesPaid: v.count }))
      .filter((c) => c.invoicesPaid >= 1)
      .sort((a, b) => b.avgDays - a.avgDays)
      .slice(0, 3);

    // Pendiente por antigüedad (sólo PENDING y PARTIAL)
    const buckets = { d0_30: 0, d30_60: 0, d60_90: 0, d90_plus: 0 };
    let totalPendingGross = 0;
    let totalPendingNet   = 0;

    for (const p of payments) {
      if (p.status === "PAID") continue;
      const remaining = Math.max(0, Number(p.amountDue) - Number(p.amountPaid));
      if (remaining === 0) continue;
      const ageDays = Math.max(0, Math.round(
        (now.getTime() - new Date(p.createdAt).getTime()) / 86_400_000,
      ));
      // Net pendiente proporcional
      const dueGross = Number(p.amountDue);
      const fraction = dueGross > 0 ? remaining / dueGross : 0;
      const netRemaining = Number(p.amountNet) * fraction;

      totalPendingGross += remaining;
      totalPendingNet   += netRemaining;

      if (ageDays < 30)       buckets.d0_30   += remaining;
      else if (ageDays < 60)  buckets.d30_60  += remaining;
      else if (ageDays < 90)  buckets.d60_90  += remaining;
      else                    buckets.d90_plus += remaining;
    }

    res.json({
      success: true,
      data: {
        dsoGlobalDays: dsoGlobal,
        invoicesPaid:  paid.length,
        slowestClients,
        pendingByAge: {
          d0_30:   round2(buckets.d0_30),
          d30_60:  round2(buckets.d30_60),
          d60_90:  round2(buckets.d60_90),
          d90_plus: round2(buckets.d90_plus),
        },
        totalPendingGross: round2(totalPendingGross),
        totalPendingNet:   round2(totalPendingNet),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ===========================================================================
// GET /api/v1/dashboard/tax-summary?year=YYYY&quarter=1|2|3|4
// ===========================================================================
// Resumen fiscal trimestral pensado para autónomos en España. Calcula los
// números base de los modelos 303 (IVA) y 130 (IRPF) a partir de:
//   · Invoices ISSUED del periodo (devengo) → IVA repercutido
//   · FixedCost + VariableCost del periodo  → IVA soportado deducible
//   · Payments con IRPF aplicado            → retenciones soportadas
//
// IMPORTANTE: HorasPRO entrega los NÚMEROS, no presenta la declaración.
// El usuario los lleva a la web AEAT o a su gestor.
// ===========================================================================
export interface TaxSummaryData {
  period: { year: number; quarter: number; from: string; to: string; label: string };
  criterion: "ACCRUAL" | "CASH";
  invoices: {
    count: number; totalNet: number; totalVat: number; totalIrpf: number;
    totalGross: number;
    byVatRate: { rate: number; base: number; vat: number }[];
  };
  deductibleExpenses: {
    fixedNet: number; fixedVat: number;
    varNet:   number; varVat:   number;
    totalNet: number; totalVat: number;
  };
  model303: {
    vatRepercutido: number; vatSoportado: number;
    result: number; status: "TO_PAY" | "TO_COMPENSATE";
  };
  model130: {
    grossProfit: number; irpfRetenido: number;
    estimate: number; mayBeExempt: boolean;
  };
  monthsBreakdown: { month: number; label: string; net: number; vat: number }[];
}

export async function computeTaxSummary(
  tenantId: string,
  year: number,
  quarter: number,
): Promise<TaxSummaryData> {
    // Rango UTC del trimestre [from, to)
    const from = new Date(Date.UTC(year, (quarter - 1) * 3, 1));
    const to   = new Date(Date.UTC(year, quarter * 3, 1));

    // Criterio fiscal del tenant (devengo por defecto)
    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { taxCriterion: true },
    });
    const criterion: "ACCRUAL" | "CASH" = tenant?.taxCriterion ?? "ACCRUAL";

    /** Devuelve la fecha efectiva de "cobro" de una factura para el modo CASH:
     *  el paidAt de la última PaymentTransaction asociada, o el paidAt del
     *  Payment, o como fallback la propia issueDate. */
    type InvWithPayment = Awaited<ReturnType<typeof prisma.invoice.findFirst>> & {
      lines:   { vatRate: unknown; lineNet: unknown }[];
      client:  { name: string; taxId: string | null } | null;
      payment: { paidAt: Date | null; transactions: { paidAt: Date }[] } | null;
    };
    function effectivePaidDate(inv: InvWithPayment): Date {
      const txDates = (inv.payment?.transactions ?? []).map((t) => new Date(t.paidAt).getTime());
      if (txDates.length > 0) return new Date(Math.max(...txDates));
      if (inv.payment?.paidAt) return new Date(inv.payment.paidAt);
      return new Date(inv.issueDate);
    }

    // ── Facturas del periodo según criterio fiscal ────────────────────────
    let invoices: InvWithPayment[];
    if (criterion === "CASH") {
      // Caja: sólo cuenta lo cobrado dentro del trimestre.
      const allPaid = await prisma.invoice.findMany({
        where:   { tenantId, status: "PAID" },
        include: {
          lines:   true,
          client:  { select: { name: true, taxId: true } },
          payment: { include: { transactions: true } },
        },
      }) as InvWithPayment[];
      invoices = allPaid.filter((inv) => {
        const d = effectivePaidDate(inv);
        return d >= from && d < to;
      });
    } else {
      // Devengo: contamos por fecha de emisión.
      invoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          status:    { in: ["ISSUED", "PAID"] },
          issueDate: { gte: from, lt: to },
        },
        include: {
          lines:   true,
          client:  { select: { name: true, taxId: true } },
          payment: { include: { transactions: true } },
        },
      }) as InvWithPayment[];
    }

    // Agrupa IVA repercutido por tipo (21, 10, 4, 0…)
    const vatByRate = new Map<string, { base: number; vat: number }>();
    let totalNet      = 0;
    let totalVatRep   = 0;
    let totalIrpf     = 0;
    let invoicesCount = 0;

    for (const inv of invoices) {
      // Las rectificativas tienen totales negativos: se restan automáticamente
      invoicesCount++;
      totalNet    += Number(inv.subtotalNet);
      totalVatRep += Number(inv.totalVat);
      totalIrpf   += Number(inv.totalIrpf);
      for (const line of inv.lines) {
        const k = String(Number(line.vatRate));
        const cur = vatByRate.get(k) ?? { base: 0, vat: 0 };
        cur.base += Number(line.lineNet);
        const vat = Number(line.lineNet) * (Number(line.vatRate) / 100);
        cur.vat  += vat;
        vatByRate.set(k, cur);
      }
    }

    // ── IVA soportado deducible: gastos fijos del trimestre + variables ────
    // Los FixedCosts se "anualizan/mensualizan" según frequency. Para el
    // trimestre tomamos 3 meses de un MONTHLY, 1 de un QUARTERLY, 1/4 de un
    // YEARLY. Solo cuenta si está activo y marcado deducible (asumimos sí
    // por defecto si no existe campo deductible).
    const fixedCosts = await prisma.fixedCost.findMany({
      where: { tenantId, isActive: true },
    });
    let fixedNetInQuarter = 0;
    let fixedVatDeductible = 0;
    // FixedCost no tiene vatRate en schema: asumimos 21% (IVA general
    // español, lo más común para servicios/software). El usuario verá el
    // dato como aproximación y puede corregir manualmente en su declaración.
    const FIXED_VAT_ASSUMED = 21;
    for (const fc of fixedCosts) {
      const amountWithVat = Number(fc.amount);
      const factor  = 1 + FIXED_VAT_ASSUMED / 100;
      const net = amountWithVat / factor;
      const vat = amountWithVat - net;
      let multiplier = 0;
      if (fc.frequency === "MONTHLY")   multiplier = 3;
      else if (fc.frequency === "QUARTERLY") multiplier = 1;
      else if (fc.frequency === "YEARLY")    multiplier = 0.25;
      fixedNetInQuarter += net * multiplier;
      fixedVatDeductible += vat * multiplier;
    }

    const varCosts = await prisma.variableCost.findMany({
      where: {
        tenantId,
        date: { gte: from, lt: to },
      },
    });
    let varNetInQuarter = 0;
    let varVatDeductible = 0;
    for (const vc of varCosts) {
      const amount = Number(vc.amount);
      const qty    = Number(vc.quantity ?? 1);
      const total  = amount * qty;
      const vatRate = Number(vc.vatRate ?? 0);
      const factor  = 1 + vatRate / 100;
      // VariableCost.priceIncludesVat marca si el amount es bruto o neto
      const net = vc.priceIncludesVat ? total / factor : total;
      const vat = vc.priceIncludesVat ? total - net    : total * vatRate / 100;
      varNetInQuarter += net;
      varVatDeductible += vat;
    }

    const totalVatSupported = fixedVatDeductible + varVatDeductible;
    const totalDeductibleNet = fixedNetInQuarter + varNetInQuarter;

    // Resultado modelo 303
    const vatToPay303 = totalVatRep - totalVatSupported;

    // ── Modelo 130 (pago fraccionado IRPF) ─────────────────────────────────
    // Estimación: 20% sobre (ingresos − gastos) acumulado del año hasta fin
    // de trimestre, MENOS retenciones soportadas, MENOS pagos fraccionados
    // anteriores. Aquí calculamos sólo el trimestre concreto para mostrar
    // un orden de magnitud — el cálculo oficial es acumulativo.
    const grossProfitQuarter = totalNet - totalDeductibleNet;
    const irpf130Estimate    = Math.max(0, grossProfitQuarter * 0.20 - totalIrpf);

    // ── Detalle por mes del trimestre (para una mini barra de timeline) ───
    // En modo CASH usamos la fecha de cobro; en ACCRUAL la de emisión.
    const monthsBreakdown: { month: number; label: string; net: number; vat: number }[] = [];
    for (let m = (quarter - 1) * 3; m < quarter * 3; m++) {
      const mStart = new Date(Date.UTC(year, m, 1));
      const mEnd   = new Date(Date.UTC(year, m + 1, 1));
      const monthInvs = invoices.filter((i) => {
        const d = criterion === "CASH" ? effectivePaidDate(i) : new Date(i.issueDate);
        return d >= mStart && d < mEnd;
      });
      const mNet = monthInvs.reduce((s, i) => s + Number(i.subtotalNet), 0);
      const mVat = monthInvs.reduce((s, i) => s + Number(i.totalVat), 0);
      const monthName = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m];
      monthsBreakdown.push({ month: m + 1, label: monthName, net: round2(mNet), vat: round2(mVat) });
    }

    return {
      period: {
        year, quarter,
        from: from.toISOString(),
        to:   to.toISOString(),
        label: `Q${quarter} ${year}`,
      },
      criterion,
      invoices: {
        count:      invoicesCount,
        totalNet:   round2(totalNet),
        totalVat:   round2(totalVatRep),
        totalIrpf:  round2(totalIrpf),
        totalGross: round2(totalNet + totalVatRep),
        byVatRate:  Array.from(vatByRate.entries())
                          .map(([rate, v]) => ({ rate: parseFloat(rate), base: round2(v.base), vat: round2(v.vat) }))
                          .sort((a, b) => b.rate - a.rate),
      },
      deductibleExpenses: {
        fixedNet: round2(fixedNetInQuarter),
        fixedVat: round2(fixedVatDeductible),
        varNet:   round2(varNetInQuarter),
        varVat:   round2(varVatDeductible),
        totalNet: round2(totalDeductibleNet),
        totalVat: round2(totalVatSupported),
      },
      model303: {
        vatRepercutido: round2(totalVatRep),
        vatSoportado:   round2(totalVatSupported),
        result:         round2(vatToPay303),
        status: vatToPay303 >= 0 ? "TO_PAY" : "TO_COMPENSATE",
      },
      model130: {
        grossProfit:  round2(grossProfitQuarter),
        irpfRetenido: round2(totalIrpf),
        estimate:     round2(irpf130Estimate),
        mayBeExempt:  totalNet > 0 && (totalIrpf / (totalNet * 0.15)) > 0.70,
      },
      monthsBreakdown,
    };
}

export async function getTaxSummary(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const yearStr    = String(req.query.year    ?? new Date().getFullYear());
    const quarterStr = String(req.query.quarter ?? Math.floor(new Date().getMonth() / 3) + 1);
    const year    = parseInt(yearStr, 10);
    const quarter = Math.min(4, Math.max(1, parseInt(quarterStr, 10)));
    if (!Number.isFinite(year)) {
      res.status(400).json({ error: { message: "Año inválido" } }); return;
    }
    const data = await computeTaxSummary(tenantId, year, quarter);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

// ===========================================================================
// GET /api/v1/dashboard/tax-summary/:model/pdf?year=YYYY&quarter=1|2|3|4
// ===========================================================================
// Genera el PDF preformulario del modelo solicitado (303 o 130).
// Reusa los datos calculados por computeTaxSummary y los formatea con
// taxModelPdf.ts. No es documento oficial AEAT, sólo hoja resumen.
// ===========================================================================
export async function getTaxModelPdf(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const model = String(req.params.model ?? "").toLowerCase();
    if (model !== "303" && model !== "130") {
      res.status(404).json({ error: { message: "Modelo no soportado" } }); return;
    }
    const yearStr    = String(req.query.year    ?? new Date().getFullYear());
    const quarterStr = String(req.query.quarter ?? Math.floor(new Date().getMonth() / 3) + 1);
    const year    = parseInt(yearStr, 10);
    const quarter = Math.min(4, Math.max(1, parseInt(quarterStr, 10)));
    if (!Number.isFinite(year)) {
      res.status(400).json({ error: { message: "Año inválido" } }); return;
    }

    const [data, tenant] = await Promise.all([
      computeTaxSummary(tenantId, year, quarter),
      prisma.tenant.findUnique({
        where:  { id: tenantId },
        select: { name: true, taxId: true, settings: true },
      }),
    ]);

    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    const billing  = (settings.billing ?? {}) as Record<string, unknown>;
    const emitter  = {
      tenantName:  tenant?.name ?? "—",
      tenantTaxId: tenant?.taxId ?? null,
      fullName:    (billing.fullName   as string | null) ?? null,
      taxId:       tenant?.taxId ?? null,
      address:     (billing.address    as string | null) ?? null,
      postalCode:  (billing.postalCode as string | null) ?? null,
      city:        (billing.city       as string | null) ?? null,
      country:     (billing.country    as string | null) ?? "España",
    };

    const pdf = model === "303"
      ? await generateModel303Pdf(data, emitter)
      : await generateModel130Pdf(data, emitter);

    const fileName = `modelo-${model}-${data.period.label.replace(" ", "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.send(pdf);
  } catch (error) { next(error); }
}
