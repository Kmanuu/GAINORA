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
