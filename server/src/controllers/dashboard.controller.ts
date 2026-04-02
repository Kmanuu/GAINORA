// ============================================================================
// dashboard.controller.ts — Métricas de rentabilidad del negocio
// ============================================================================
// Consulta los datos brutos con Prisma, los transforma a las interfaces
// definidas en profitability.ts, y delega el cálculo a las funciones puras.
// ============================================================================

import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import {
  normalizeToMonthly,
  calculateProjectProfitability,
  calculateBusinessMetrics,
  type ProjectProfitabilityInput,
  type TimeEntryInput,
  type VariableCostInput,
} from "../services/profitability.js";

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Devuelve el primer instante (00:00:00.000) del mes actual */
function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Devuelve el último instante (23:59:59.999) del mes actual */
function endOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard — Métricas globales + rentabilidad por proyecto
// ---------------------------------------------------------------------------

export async function getMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // SIEMPRE del token JWT, NUNCA del body ni de params
    const tenantId = req.user!.tenantId;

    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();

    // ------------------------------------------------------------------
    // 1. Proyectos activos del tenant
    // ------------------------------------------------------------------
    const activeProjects = await prisma.project.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: {
        // Time entries de este mes para cada proyecto
        timeEntries: {
          where: {
            startedAt: { gte: monthStart, lte: monthEnd },
          },
          include: {
            user: { select: { hourlyCost: true } },
          },
        },
        // Costes variables de este mes para cada proyecto
        varCosts: {
          where: {
            date: { gte: monthStart, lte: monthEnd },
          },
        },
      },
    });

    const activeProjectCount = activeProjects.length;

    // ------------------------------------------------------------------
    // 2. Costes fijos activos del tenant → normalizar a mensual
    // ------------------------------------------------------------------
    const fixedCosts = await prisma.fixedCost.findMany({
      where: { tenantId, isActive: true },
    });

    // Suma de todos los costes fijos normalizados a importe mensual
    const totalFixedCostsMonthly = fixedCosts.reduce((sum, fc) => {
      return sum + normalizeToMonthly(Number(fc.amount), fc.frequency);
    }, 0);

    // ------------------------------------------------------------------
    // 3. TODAS las time entries del mes (para métricas globales)
    // ------------------------------------------------------------------
    const allMonthEntries = await prisma.timeEntry.findMany({
      where: {
        tenantId,
        startedAt: { gte: monthStart, lte: monthEnd },
      },
      include: {
        user: { select: { hourlyCost: true } },
      },
    });

    // ------------------------------------------------------------------
    // 4. TODOS los costes variables del mes (para métricas globales)
    // ------------------------------------------------------------------
    const allMonthVarCosts = await prisma.variableCost.findMany({
      where: {
        tenantId,
        date: { gte: monthStart, lte: monthEnd },
      },
    });

    // ------------------------------------------------------------------
    // 5. Calcular el coste directo total de mano de obra del mes
    //    Σ(durationMin / 60 × user.hourlyCost) para cada entrada
    // ------------------------------------------------------------------
    const totalLaborCost = allMonthEntries.reduce((sum, entry) => {
      const hours = entry.durationMin / 60;
      const hourlyCost = Number(entry.user.hourlyCost ?? 0);
      return sum + hours * hourlyCost;
    }, 0);

    // Suma de todos los costes variables del mes
    const totalVarCosts = allMonthVarCosts.reduce((sum, vc) => {
      return sum + Number(vc.amount);
    }, 0);

    // Horas facturables del mes (solo isBillable = true, en horas)
    const totalBillableHours = allMonthEntries
      .filter((e) => e.isBillable)
      .reduce((sum, e) => sum + e.durationMin / 60, 0);

    // ------------------------------------------------------------------
    // 6. Llamar a calculateBusinessMetrics con los datos transformados
    // ------------------------------------------------------------------
    const businessMetrics = calculateBusinessMetrics({
      totalMonthlyCosts: totalFixedCostsMonthly + totalVarCosts + totalLaborCost,
      totalBillableHours,
    });

    // ------------------------------------------------------------------
    // 7. Rentabilidad de cada proyecto activo
    // ------------------------------------------------------------------
    const projectsProfitability = activeProjects.map((project) => {
      // Transformar time entries de Prisma → TimeEntryInput
      const timeEntries: TimeEntryInput[] = project.timeEntries.map((te) => ({
        durationMin: te.durationMin,
        hourlyCost: Number(te.user.hourlyCost ?? 0),
        isBillable: te.isBillable,
      }));

      // Transformar costes variables de Prisma → VariableCostInput
      const variableCosts: VariableCostInput[] = project.varCosts.map((vc) => ({
        amount: Number(vc.amount),
      }));

      // Armar el input para la función pura
      const input: ProjectProfitabilityInput = {
        budgetAmount: Number(project.budgetAmount ?? 0),
        timeEntries,
        variableCosts,
        totalFixedCostsMonthly,
        activeProjectCount,
      };

      const profitability = calculateProjectProfitability(input);

      return {
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        ...profitability,
      };
    });

    // Ordenar por margen neto descendente → Top proyectos primero
    projectsProfitability.sort((a, b) => b.netMargin - a.netMargin);

    // ------------------------------------------------------------------
    // 8. Respuesta con formato estándar
    // ------------------------------------------------------------------
    res.json({
      success: true,
      data: {
        business: businessMetrics,
        projects: projectsProfitability,
        summary: {
          activeProjectCount,
          totalFixedCostsMonthly: Math.round(totalFixedCostsMonthly * 100) / 100,
          totalBillableHours: Math.round(totalBillableHours * 100) / 100,
          monthRange: {
            from: monthStart.toISOString(),
            to: monthEnd.toISOString(),
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
