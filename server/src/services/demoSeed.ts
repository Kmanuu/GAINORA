// ============================================================================
// demoSeed.ts — Datos demo realistas para modo "trying" del wizard
// ============================================================================
// Genera un set autoconsistente: clientes, proyectos, contratos (FIXED, HOURLY,
// SUBSCRIPTION), horas distribuidas en los últimos 45 días, varCosts, fixedCosts
// y un par de pagos PARTIAL/PAID en el contrato suscripción para que el
// dashboard, cobros y rentabilidad muestren números reales desde el primer
// segundo. Todo se marca con isDemo=true para borrarse limpio en /demo/wipe.
// ============================================================================

import prisma from "../lib/prisma.js";
import {
  Status, BillingMode, ContractTier, ContractStatus, MaintenanceMode,
  PaymentStatus, PaymentMethod, Freq,
} from "@prisma/client";
import { breakdownFromContractPrice } from "./paymentMath.js";

interface SeedArgs {
  tenantId: string;
  userId:   string;
}

interface SeedResult {
  clients:    number;
  projects:   number;
  contracts:  number;
  fixedCosts: number;
  varCosts:   number;
  timeHours:  number;
  payments:   number;
}

const DAY = 86_400_000;
const today = () => new Date();
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthStart = (offset = 0) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
};
const monthEnd = (offset = 0) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
};

export async function seedDemo({ tenantId, userId }: SeedArgs): Promise<SeedResult> {
  return prisma.$transaction(async (tx) => {
    // 1. Clientes (5)
    const clientCarp = await tx.client.create({ data: {
      tenantId, isDemo: true,
      name: "Carpintería López",
      taxId: "B12345678",
      email: "info@carpinterialopez.es",
      phone: "+34 612 345 678",
    }});
    const clientEstudio = await tx.client.create({ data: {
      tenantId, isDemo: true,
      name: "Estudio Diseño Marco",
      taxId: "B87654321",
      email: "marco@estudiomarco.com",
    }});
    const clientCafe = await tx.client.create({ data: {
      tenantId, isDemo: true,
      name: "Café del Mercado",
      taxId: "B22334455",
      email: "hola@cafedelmercado.es",
    }});
    const clientBoutique = await tx.client.create({ data: {
      tenantId, isDemo: true,
      name: "Boutique Lina",
      taxId: "B55667788",
      email: "lina@boutiquelina.com",
    }});
    const clientConsult = await tx.client.create({ data: {
      tenantId, isDemo: true,
      name: "Consultoría Vega",
      taxId: "B99887766",
      email: "vega@consultoriavega.es",
      notes: "Cliente referido por un colega — pendiente primer encargo.",
    }});

    // 2. Proyectos (3 — Boutique y Consultoría sin proyecto activo todavía,
    //    aparecen en cartera para que se vea cómo se gestionan leads).
    const projReforma = await tx.project.create({ data: {
      tenantId, isDemo: true,
      clientId: clientCarp.id,
      name: "Reforma local Calle Mayor",
      description: "Reforma integral del nuevo local en c/ Mayor 23.",
      status: Status.ACTIVE,
      billingMode: BillingMode.FIXED,
      budgetAmount: 3500, budgetHours: 60,
      startDate: dateOnly(daysAgo(40)),
    }});
    const projBranding = await tx.project.create({ data: {
      tenantId, isDemo: true,
      clientId: clientEstudio.id,
      name: "Identidad de marca",
      description: "Logo, paleta y manual de uso.",
      status: Status.ACTIVE,
      billingMode: BillingMode.HOURLY,
      hourlyRate: 50,
      startDate: dateOnly(daysAgo(25)),
    }});
    const projMant = await tx.project.create({ data: {
      tenantId, isDemo: true,
      clientId: clientCafe.id,
      name: "Mantenimiento web mensual",
      description: "Actualizaciones, copias, soporte.",
      status: Status.ACTIVE,
      billingMode: BillingMode.SUBSCRIPTION,
      startDate: dateOnly(daysAgo(75)),
    }});

    // 3. Contratos (uno por proyecto)
    const contractReforma = await tx.contract.create({ data: {
      tenantId, isDemo: true,
      projectId: projReforma.id,
      clientId:  clientCarp.id,
      tier:        ContractTier.PRO,
      billingMode: BillingMode.FIXED,
      price:       3500,
      vatRate:     21,
      irpfRate:    15, // profesional típico
      status:      ContractStatus.ACTIVE,
      startedAt:   dateOnly(daysAgo(40)),
    }});
    const contractBranding = await tx.contract.create({ data: {
      tenantId, isDemo: true,
      projectId: projBranding.id,
      clientId:  clientEstudio.id,
      tier:        ContractTier.FREE,
      billingMode: BillingMode.HOURLY,
      hourlyRate:  50,
      vatRate:     21,
      irpfRate:    15,
      status:      ContractStatus.ACTIVE,
      startedAt:   dateOnly(daysAgo(25)),
    }});
    const contractMant = await tx.contract.create({ data: {
      tenantId, isDemo: true,
      projectId: projMant.id,
      clientId:  clientCafe.id,
      tier:           ContractTier.PRO,
      billingMode:    BillingMode.SUBSCRIPTION,
      price:          80,
      vatRate:        21,
      maintenanceMode: MaintenanceMode.SHARED,
      maintenanceExtraPct: 0,
      billingDay:     1,
      billingFrequency: Freq.MONTHLY,
      status:         ContractStatus.ACTIVE,
      startedAt:      dateOnly(daysAgo(75)),
    }});

    // 4. Costes fijos (2)
    const fixedCount = await tx.fixedCost.createMany({ data: [
      { tenantId, isDemo: true, name: "Alquiler oficina", amount: 350, frequency: Freq.MONTHLY, category: "Estructura" },
      { tenantId, isDemo: true, name: "Software (Adobe + Notion)", amount: 60, frequency: Freq.MONTHLY, category: "Software" },
    ]});

    // 5. Variable costs (5)
    const varCount = await tx.variableCost.createMany({ data: [
      { tenantId, projectId: projReforma.id,  contractId: contractReforma.id,
        name: "Material — pladur y perfilería", amount: 380, vatRate: 21, date: dateOnly(daysAgo(35)), category: "Materiales" },
      { tenantId, projectId: projReforma.id,  contractId: contractReforma.id,
        name: "Pintura y rodillos", amount: 95, vatRate: 21, date: dateOnly(daysAgo(20)), category: "Materiales" },
      { tenantId, projectId: projReforma.id,  contractId: contractReforma.id,
        name: "Gasolina viajes obra", amount: 42, quantity: 3, vatRate: 21, date: dateOnly(daysAgo(15)), category: "Desplazamientos" },
      { tenantId, projectId: projBranding.id, contractId: contractBranding.id,
        name: "Stock photos premium", amount: 29, vatRate: 21, date: dateOnly(daysAgo(18)), category: "Software" },
      { tenantId, projectId: projMant.id,     contractId: contractMant.id,
        name: "Backup mensual S3", amount: 8, vatRate: 21, date: dateOnly(daysAgo(5)), category: "Software" },
    ]});

    // 6. Horas (20 totales). Reparto: 12h reforma, 8h branding.
    const reformaSlots: Array<[number, number, string]> = [
      [38, 240, "Toma de medidas y planos en obra"],
      [34, 180, "Compra de materiales y descarga"],
      [30, 240, "Demolición tabiquería existente"],
      [22, 180, "Montaje pladur primera estancia"],
      [12,  90, "Detalles de pintura y remates"],
    ];
    const brandingSlots: Array<[number, number, string]> = [
      [22, 120, "Briefing y moodboard inicial"],
      [18, 180, "Exploración tipográfica"],
      [12,  90, "Variantes de logo"],
      [ 6, 120, "Manual de marca (primer borrador)"],
      [ 2,  60, "Revisión cliente y ajustes"],
    ];

    let timeMin = 0;
    for (const [d, dur, desc] of reformaSlots) {
      const start = new Date(daysAgo(d).setHours(9, 0, 0, 0));
      const end   = new Date(start.getTime() + dur * 60_000);
      await tx.timeEntry.create({ data: {
        tenantId, userId,
        projectId: projReforma.id, contractId: contractReforma.id,
        description: desc, startedAt: start, endedAt: end,
        durationMin: dur, isBillable: true,
      }});
      timeMin += dur;
    }
    for (const [d, dur, desc] of brandingSlots) {
      const start = new Date(daysAgo(d).setHours(11, 0, 0, 0));
      const end   = new Date(start.getTime() + dur * 60_000);
      await tx.timeEntry.create({ data: {
        tenantId, userId,
        projectId: projBranding.id, contractId: contractBranding.id,
        description: desc, startedAt: start, endedAt: end,
        durationMin: dur, isBillable: true,
      }});
      timeMin += dur;
    }

    // 7. Pagos del contrato suscripción (Café del Mercado) — 3 periodos:
    //    hace 2 meses → PAID, hace 1 mes → PARTIAL, mes actual → PENDING.
    const subPrice = 80;
    const { amountNet, amountGross } = breakdownFromContractPrice(subPrice, 21, false);

    // mes -2 (PAID)
    const p2Start = monthStart(-2);
    const p2End   = monthEnd(-2);
    const pay2 = await tx.payment.create({ data: {
      tenantId, contractId: contractMant.id,
      periodStart: p2Start, periodEnd: p2End,
      amountNet, amountGross, amountDue: amountGross,
      vatRate: 21, irpfAmount: 0,
      amountPaid: amountGross,
      status: PaymentStatus.PAID,
      paidAt: new Date(p2End.getTime() + 4 * DAY),
    }});
    await tx.paymentTransaction.create({ data: {
      tenantId, paymentId: pay2.id,
      amount: amountGross, paidAt: new Date(p2End.getTime() + 4 * DAY),
      method: PaymentMethod.TRANSFER, reference: "DEMO-202602",
    }});

    // mes -1 (PARTIAL — cobrado la mitad)
    const p1Start = monthStart(-1);
    const p1End   = monthEnd(-1);
    const half = Math.round((amountGross / 2) * 100) / 100;
    const pay1 = await tx.payment.create({ data: {
      tenantId, contractId: contractMant.id,
      periodStart: p1Start, periodEnd: p1End,
      amountNet, amountGross, amountDue: amountGross,
      vatRate: 21, irpfAmount: 0,
      amountPaid: half,
      status: PaymentStatus.PARTIAL,
      paidAt: null,
    }});
    await tx.paymentTransaction.create({ data: {
      tenantId, paymentId: pay1.id,
      amount: half, paidAt: new Date(p1End.getTime() + 6 * DAY),
      method: PaymentMethod.TRANSFER, reference: "DEMO-PARTIAL",
    }});

    // mes actual (PENDING)
    const p0Start = monthStart(0);
    const p0End   = monthEnd(0);
    await tx.payment.create({ data: {
      tenantId, contractId: contractMant.id,
      periodStart: p0Start, periodEnd: p0End,
      amountNet, amountGross, amountDue: amountGross,
      vatRate: 21, irpfAmount: 0,
      amountPaid: 0,
      status: PaymentStatus.PENDING,
    }});

    return {
      clients:    5,
      projects:   3,
      contracts:  3,
      fixedCosts: fixedCount.count,
      varCosts:   varCount.count,
      timeHours:  Math.round(timeMin / 6) / 10, // 1 decimal
      payments:   3,
    };
  }, { timeout: 20_000 });
}

export async function wipeDemo(tenantId: string): Promise<{ removed: number }> {
  return prisma.$transaction(async (tx) => {
    // Orden de borrado pensado para esquivar restricciones FK:
    //   Invoice (Restrict desde Client)  → primero por client.isDemo
    //   Project.isDemo (Cascade lleva Contract → Payment, TimeEntry, VariableCost, Issue)
    //   Project quedaría apuntando a Client si Client tiene Restrict, pero
    //   ahora ya no quedan Projects. Borramos FixedCost y luego Client.
    const demoClientIds = (await tx.client.findMany({
      where: { tenantId, isDemo: true }, select: { id: true },
    })).map(c => c.id);

    let removed = 0;

    if (demoClientIds.length > 0) {
      const inv = await tx.invoice.deleteMany({ where: { tenantId, clientId: { in: demoClientIds } } });
      removed += inv.count;
    }

    const proj = await tx.project.deleteMany({ where: { tenantId, isDemo: true } });
    removed += proj.count;

    const fc = await tx.fixedCost.deleteMany({ where: { tenantId, isDemo: true } });
    removed += fc.count;

    const cli = await tx.client.deleteMany({ where: { tenantId, isDemo: true } });
    removed += cli.count;

    return { removed };
  }, { timeout: 20_000 });
}

export async function countDemoArtifacts(tenantId: string) {
  const [clients, projects, contracts, fixedCosts] = await Promise.all([
    prisma.client.count({    where: { tenantId, isDemo: true } }),
    prisma.project.count({   where: { tenantId, isDemo: true } }),
    prisma.contract.count({  where: { tenantId, isDemo: true } }),
    prisma.fixedCost.count({ where: { tenantId, isDemo: true } }),
  ]);
  return { clients, projects, contracts, fixedCosts,
           hasDemo: clients + projects + contracts + fixedCosts > 0 };
}
