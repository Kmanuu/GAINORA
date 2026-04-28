// ============================================================================
// admin.controller.ts — Endpoints exclusivos del rol SUPERADMIN
// ============================================================================
// Vista global del SaaS: tenants, usuarios, ingresos agregados. NO permite
// editar datos de otros tenants — sólo lectura para soporte y operaciones.
// ============================================================================

import { Request, Response } from "express";
import prisma from "../lib/prisma.js";

interface TenantSummary {
  id:           string;
  name:         string;
  slug:         string;
  taxId:        string | null;
  plan:         string;
  createdAt:    Date;
  users:        number;
  clients:      number;
  projects:     number;
  contracts:    number;
  invoicesIssued: number;
  totalGrossIssued: number;
  fixedCostsActive: number;
  hasDemo:      boolean;
}

export async function listTenantsAdmin(_req: Request, res: Response) {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          users:      true,
          clients:    true,
          projects:   true,
          contracts:  true,
          fixedCosts: true,
        },
      },
    },
  });

  const summaries: TenantSummary[] = await Promise.all(
    tenants.map(async (t) => {
      const [issuedAgg, demoCount] = await Promise.all([
        prisma.invoice.aggregate({
          where: { tenantId: t.id, status: { in: ["ISSUED", "PAID"] } },
          _count: { _all: true },
          _sum:   { totalGross: true },
        }),
        prisma.client.count({ where: { tenantId: t.id, isDemo: true } }),
      ]);
      return {
        id:               t.id,
        name:             t.name,
        slug:             t.slug,
        taxId:            t.taxId,
        plan:             t.plan,
        createdAt:        t.createdAt,
        users:            t._count.users,
        clients:          t._count.clients,
        projects:         t._count.projects,
        contracts:        t._count.contracts,
        invoicesIssued:   issuedAgg._count._all,
        totalGrossIssued: Number(issuedAgg._sum.totalGross ?? 0),
        fixedCostsActive: t._count.fixedCosts,
        hasDemo:          demoCount > 0,
      };
    }),
  );

  // Totales agregados del SaaS
  const totals = summaries.reduce(
    (acc, t) => ({
      tenants:        acc.tenants + 1,
      users:          acc.users    + t.users,
      clients:        acc.clients  + t.clients,
      contracts:      acc.contracts + t.contracts,
      invoicesIssued: acc.invoicesIssued + t.invoicesIssued,
      totalGross:     acc.totalGross     + t.totalGrossIssued,
    }),
    { tenants: 0, users: 0, clients: 0, contracts: 0, invoicesIssued: 0, totalGross: 0 },
  );

  res.json({ tenants: summaries, totals });
}

export async function getTenantDetailAdmin(req: Request, res: Response) {
  const { id } = req.params;
  const tenant = await prisma.tenant.findUnique({
    where: { id: id as string },
    include: {
      users:    { select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true } },
      _count: {
        select: {
          clients:    true,
          projects:   true,
          contracts:  true,
          payments:   true,
          invoices:   true,
          fixedCosts: true,
        },
      },
    },
  });
  if (!tenant) {
    res.status(404).json({ error: { message: "Tenant no encontrado" } });
    return;
  }

  const [invIssuedAgg, invDraftAgg, paymentsAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: { tenantId: id as string, status: { in: ["ISSUED", "PAID"] } },
      _count: { _all: true },
      _sum:   { totalGross: true, totalIrpf: true, totalVat: true },
    }),
    prisma.invoice.count({ where: { tenantId: id as string, status: "DRAFT" } }),
    prisma.payment.aggregate({
      where: { tenantId: id as string },
      _count: { _all: true },
      _sum:   { amountPaid: true, amountDue: true },
    }),
  ]);

  res.json({
    tenant: {
      id:        tenant.id,
      name:      tenant.name,
      slug:      tenant.slug,
      taxId:     tenant.taxId,
      plan:      tenant.plan,
      createdAt: tenant.createdAt,
      settings:  tenant.settings,
    },
    counts: tenant._count,
    users:  tenant.users,
    invoices: {
      issued:      invIssuedAgg._count._all,
      drafts:      invDraftAgg,
      totalGross:  Number(invIssuedAgg._sum.totalGross ?? 0),
      totalIrpf:   Number(invIssuedAgg._sum.totalIrpf  ?? 0),
      totalVat:    Number(invIssuedAgg._sum.totalVat   ?? 0),
    },
    payments: {
      total:      paymentsAgg._count._all,
      paid:       Number(paymentsAgg._sum.amountPaid ?? 0),
      pending:    Number(paymentsAgg._sum.amountDue  ?? 0) - Number(paymentsAgg._sum.amountPaid ?? 0),
    },
  });
}
