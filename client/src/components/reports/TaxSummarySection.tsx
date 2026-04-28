// ============================================================================
// TaxSummarySection.tsx — Resumen fiscal trimestral para autónomos en España
// ============================================================================
// Muestra los números base de los modelos 303 (IVA) y 130 (IRPF) calculados
// a partir de las facturas emitidas y los gastos deducibles del trimestre.
//
// HorasPRO entrega los números, no presenta la declaración. El usuario los
// usa para llenar el formulario de la AEAT o se los pasa a su gestor.
// ============================================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator, ChevronLeft, ChevronRight,
  ExternalLink, FileText, Info, Sparkles, TrendingUp,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { fmtCurrency } from '@/lib/format';
import Card from '@/components/ui/Card';
import HelpTooltip from '@/components/ui/HelpTooltip';
import { useToast } from '@/components/ui/Toast';

interface TaxData {
  period: { year: number; quarter: number; from: string; to: string; label: string };
  invoices: {
    count: number;
    totalNet: number; totalVat: number; totalIrpf: number; totalGross: number;
    byVatRate: { rate: number; base: number; vat: number }[];
  };
  deductibleExpenses: {
    fixedNet: number; fixedVat: number;
    varNet: number; varVat: number;
    totalNet: number; totalVat: number;
  };
  model303: { vatRepercutido: number; vatSoportado: number; result: number; status: 'TO_PAY' | 'TO_COMPENSATE' };
  model130: { grossProfit: number; irpfRetenido: number; estimate: number; mayBeExempt: boolean };
  monthsBreakdown: { month: number; label: string; net: number; vat: number }[];
}

const CURRENT_YEAR    = new Date().getFullYear();
const CURRENT_QUARTER = Math.floor(new Date().getMonth() / 3) + 1;

export default function TaxSummarySection() {
  const { toast } = useToast();
  const [year,    setYear]    = useState(CURRENT_YEAR);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(CURRENT_QUARTER as 1 | 2 | 3 | 4);
  const [data,    setData]    = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<{ success: boolean; data: TaxData }>(`/v1/dashboard/tax-summary?year=${year}&quarter=${quarter}`)
      .then((r) => { if (alive) setData(r.data); })
      .catch((e: Error) => toast('error', e.message))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [year, quarter, toast]);

  function prev() {
    if (quarter === 1) { setQuarter(4); setYear((y) => y - 1); }
    else setQuarter((q) => (q - 1) as 1 | 2 | 3 | 4);
  }
  function next() {
    if (quarter === 4) { setQuarter(1); setYear((y) => y + 1); }
    else setQuarter((q) => (q + 1) as 1 | 2 | 3 | 4);
  }

  const isCurrent = year === CURRENT_YEAR && quarter === CURRENT_QUARTER;

  return (
    <section className="mt-8 animate-fade-up" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-[var(--color-purple-subtle)] text-[var(--color-purple)] flex items-center justify-center">
            <Calculator className="w-4 h-4" strokeWidth={1.9} />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold text-[var(--color-text)] tracking-[-0.01em] flex items-center gap-1.5">
              Tu trimestre fiscal
              <HelpTooltip
                text="Los números base de los modelos 303 (IVA) y 130 (IRPF) calculados con tus facturas y gastos. HorasPRO no presenta la declaración: tú o tu gestor llevan estos números a la AEAT."
                maxWidth={320}
              />
            </h2>
            <p className="text-[12px] text-[var(--color-text-tertiary)]">
              Modelo 303 y 130 — números listos para tu gestor
            </p>
          </div>
        </div>

        {/* Navegación trimestre */}
        <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] p-1">
          <button
            onClick={prev}
            aria-label="Trimestre anterior"
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </button>
          <div className="px-2.5 min-w-[110px] text-center">
            <p className="text-[13px] font-semibold text-[var(--color-text)] leading-tight">Q{quarter} {year}</p>
            <p className="text-[10.5px] text-[var(--color-text-tertiary)] leading-none mt-0.5">
              {isCurrent ? 'En curso' : 'Cerrado'}
            </p>
          </div>
          <button
            onClick={next}
            aria-label="Trimestre siguiente"
            disabled={isCurrent}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {loading || !data ? (
        <Card padding="lg"><div className="skeleton h-32 rounded-[12px]" /></Card>
      ) : data.invoices.count === 0 ? (
        <Card padding="lg" className="text-center py-10">
          <div className="w-12 h-12 rounded-full bg-[var(--color-blue-subtle)] mx-auto flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-[var(--color-blue)]" strokeWidth={1.7} />
          </div>
          <p className="text-[14.5px] font-semibold text-[var(--color-text)]">Sin facturas en este trimestre</p>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 max-w-[400px] mx-auto leading-relaxed">
            Cuando emitas facturas con número correlativo, aquí verás los importes que tendrás que declarar al cierre.
          </p>
          <Link
            to="/facturas"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--color-blue)] hover:underline mt-3"
          >
            Ir a facturas <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* MODELO 303 — IVA */}
          <Card padding="md">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-purple)]">
                  Modelo 303
                </p>
                <p className="text-[15px] font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                  Liquidación IVA
                  <HelpTooltip text="IVA repercutido (cobrado a clientes) menos IVA soportado (pagado en gastos deducibles). Si sale positivo: pagas a Hacienda. Si negativo: te lo compensan en el siguiente trimestre." maxWidth={300} />
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <Row
                label="IVA repercutido (facturado)"
                value={fmtCurrency(data.model303.vatRepercutido, 2)}
                tone="positive"
              />
              <Row
                label="IVA soportado (gastos deducibles)"
                value={`-${fmtCurrency(data.model303.vatSoportado, 2)}`}
                tone="negative"
              />
              <div className="border-t border-[var(--color-border)] pt-2.5 mt-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold text-[var(--color-text)]">
                    {data.model303.status === 'TO_PAY' ? 'A pagar a Hacienda' : 'A compensar (te devuelve)'}
                  </span>
                  <span
                    className={clsx(
                      'text-[24px] font-semibold tabular-nums tracking-[-0.02em]',
                      data.model303.status === 'TO_PAY'
                        ? 'text-[var(--color-orange)]'
                        : 'text-[var(--color-green)]',
                    )}
                  >
                    {fmtCurrency(Math.abs(data.model303.result), 2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Desglose por tipo de IVA */}
            {data.invoices.byVatRate.length > 1 && (
              <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-2">
                  Desglose por tipo
                </p>
                <div className="space-y-1.5">
                  {data.invoices.byVatRate.map((r) => (
                    <div key={r.rate} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-[var(--color-text-secondary)]">
                        IVA {r.rate}% sobre {fmtCurrency(r.base, 2)}
                      </span>
                      <span className="text-[var(--color-text)] font-medium tabular-nums">
                        {fmtCurrency(r.vat, 2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* MODELO 130 — IRPF */}
          <Card padding="md">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-blue)]">
                  Modelo 130
                </p>
                <p className="text-[15px] font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                  Pago fraccionado IRPF
                  <HelpTooltip text="Anticipo trimestral del IRPF anual. Estimación: 20% sobre tu beneficio (ingresos − gastos) menos las retenciones que ya te hicieron tus clientes." maxWidth={300} />
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <Row label="Beneficio neto del trimestre" value={fmtCurrency(data.model130.grossProfit, 2)} />
              <Row
                label="IRPF ya retenido por clientes"
                value={`-${fmtCurrency(data.model130.irpfRetenido, 2)}`}
                tone="positive"
              />
              <div className="border-t border-[var(--color-border)] pt-2.5 mt-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold text-[var(--color-text)]">
                    {data.model130.mayBeExempt ? 'Posiblemente exento' : 'Estimación a ingresar'}
                  </span>
                  <span
                    className={clsx(
                      'text-[24px] font-semibold tabular-nums tracking-[-0.02em]',
                      data.model130.mayBeExempt
                        ? 'text-[var(--color-text-tertiary)]'
                        : 'text-[var(--color-blue)]',
                    )}
                  >
                    {fmtCurrency(data.model130.estimate, 2)}
                  </span>
                </div>
                {data.model130.mayBeExempt && (
                  <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-1.5 leading-relaxed">
                    Más del 70% de tus facturas llevan retención IRPF; podrías estar exento de presentar el modelo 130. Confirma con tu gestor.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* DETALLE FACTURAS */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[var(--color-text-secondary)]" strokeWidth={1.9} />
              <h3 className="text-[14px] font-semibold text-[var(--color-text)]">Lo que has facturado</h3>
            </div>
            <div className="space-y-2">
              <Row label="Facturas emitidas" value={String(data.invoices.count)} />
              <Row label="Base imponible (sin IVA)" value={fmtCurrency(data.invoices.totalNet, 2)} bold />
              <Row label="IVA cobrado" value={fmtCurrency(data.invoices.totalVat, 2)} />
              <Row label="IRPF retenido por clientes" value={fmtCurrency(data.invoices.totalIrpf, 2)} />
              <Row label="Total facturado (bruto)" value={fmtCurrency(data.invoices.totalGross, 2)} muted />
            </div>

            {/* Mini timeline meses */}
            {data.monthsBreakdown.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-2.5">
                  Por mes
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {data.monthsBreakdown.map((m) => {
                    const max = Math.max(...data.monthsBreakdown.map((x) => x.net), 1);
                    const pct = max > 0 ? (m.net / max) * 100 : 0;
                    return (
                      <div key={m.month} className="rounded-[10px] bg-[var(--color-surface-alt)] p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)] font-semibold">
                          {m.label}
                        </p>
                        <p className="text-[13.5px] font-semibold text-[var(--color-text)] tabular-nums mt-0.5">
                          {fmtCurrency(m.net, 0)}
                        </p>
                        <div className="mt-1.5 h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--color-purple)] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* DETALLE GASTOS DEDUCIBLES */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[var(--color-text-secondary)] rotate-180" strokeWidth={1.9} />
              <h3 className="text-[14px] font-semibold text-[var(--color-text)]">Tus gastos deducibles</h3>
            </div>
            <div className="space-y-2">
              <Row label="Costes fijos del trimestre (sin IVA)" value={fmtCurrency(data.deductibleExpenses.fixedNet, 2)} />
              <Row label="Costes variables del trimestre (sin IVA)" value={fmtCurrency(data.deductibleExpenses.varNet, 2)} />
              <Row label="Total gasto deducible (sin IVA)" value={fmtCurrency(data.deductibleExpenses.totalNet, 2)} bold />
              <div className="border-t border-[var(--color-border)] my-2" />
              <Row label="IVA soportado de fijos" value={fmtCurrency(data.deductibleExpenses.fixedVat, 2)} />
              <Row label="IVA soportado de variables" value={fmtCurrency(data.deductibleExpenses.varVat, 2)} />
              <Row label="Total IVA soportado" value={fmtCurrency(data.deductibleExpenses.totalVat, 2)} bold />
            </div>

            <div className="mt-4 px-3 py-2.5 rounded-[10px] bg-[var(--color-orange-subtle)] border border-[rgba(255,159,10,0.15)] flex gap-2">
              <Info className="w-3.5 h-3.5 text-[var(--color-orange)] shrink-0 mt-[2px]" strokeWidth={2} />
              <p className="text-[11.5px] leading-relaxed text-[var(--color-text)]">
                Los costes fijos asumen IVA al 21%. Si tienes alguno exento (alquileres residenciales, seguros, intereses bancarios…), avísale a tu gestor antes de presentar.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Disclaimer + CTAs */}
      <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
        <Link
          to="/ayuda?a=tarjetas-fiscales"
          className="text-[12.5px] font-semibold text-[var(--color-blue)] hover:underline inline-flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
          Cómo se calculan estos números
        </Link>
        <p className="text-[11px] text-[var(--color-text-tertiary)] italic">
          HorasPRO entrega los números, no presenta la declaración.
        </p>
      </div>
    </section>
  );
}

function Row({
  label, value, tone, bold, muted,
}: {
  label: string; value: string; tone?: 'positive' | 'negative'; bold?: boolean; muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={clsx(
        'text-[12.5px] truncate',
        muted ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-secondary)]',
      )}>
        {label}
      </span>
      <span className={clsx(
        'tabular-nums shrink-0',
        bold ? 'font-semibold text-[14px]' : 'text-[13px]',
        tone === 'positive' && 'text-[var(--color-green)]',
        tone === 'negative' && 'text-[var(--color-orange)]',
        !tone && 'text-[var(--color-text)]',
        muted && 'text-[var(--color-text-tertiary)]',
      )}>
        {value}
      </span>
    </div>
  );
}
