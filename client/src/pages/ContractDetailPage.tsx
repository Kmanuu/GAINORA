// ============================================================================
// ContractDetailPage.tsx — Vista de detalle de un contrato
// ============================================================================
// Cabecera con badges (status, tier, billingMode), KPIs (precio Net+Gross,
// MRR neto, próximo cobro, cobrado este año) y dos pestañas: Pagos e
// Inconvenientes. Reutiliza PaymentMarkModal para registrar cobros.
// ============================================================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, RefreshCw, Pencil, Wallet, Receipt,
  Repeat, CheckCircle2, Calendar, Building2, FolderKanban,
  AlertOctagon, RotateCw,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { fmt, fmtCurrency, fmtDate, toNum } from '@/lib/format';
import type { Contract, Payment, PaymentStatus } from '@/types';
import Card             from '@/components/ui/Card';
import Badge            from '@/components/ui/Badge';
import Button           from '@/components/ui/Button';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useToast }     from '@/components/ui/Toast';
import { useConfirm }   from '@/components/ui/ConfirmDialog';
import {
  TIER_LABEL, TIER_BADGE,
  BILLING_LABEL, BILLING_BADGE,
  STATUS_LABEL,  STATUS_BADGE,
} from '@/components/contracts/ContractsTab';
import IssuesPanel       from '@/components/contracts/IssuesPanel';
import PaymentMarkModal  from '@/components/payments/PaymentMarkModal';
import ContractEditModal from '@/components/contracts/ContractEditModal';

// ---------------------------------------------------------------------------
// Constantes visuales para Payment.status
// ---------------------------------------------------------------------------

const PAY_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagado',
};
const PAY_STATUS_BADGE: Record<PaymentStatus, 'orange' | 'blue' | 'green'> = {
  PENDING: 'orange', PARTIAL: 'blue', PAID: 'green',
};

type Tab = 'pagos' | 'inconvenientes';

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const { confirm } = useConfirm();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState<Tab>('pagos');
  const [markTarget, setMarkTarget] = useState<Payment | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback((silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    setError('');
    api.get<Contract>(`/v1/contracts/${id}`)
      .then(setContract)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const { priceGross, priceNet, mrrNet, payments, nextDuePayment, paidThisYear, totalDueThisYear, openIssuesCount } = useMemo(() => {
    if (!contract) {
      return {
        priceGross: 0, priceNet: 0, mrrNet: 0,
        payments: [] as Payment[], nextDuePayment: null as Payment | null,
        paidThisYear: 0, totalDueThisYear: 0, openIssuesCount: 0,
      };
    }
    const p     = toNum(contract.price);
    const vat   = toNum(contract.vatRate);
    const factor = 1 + vat / 100;
    const gross = contract.priceIncludesVat ? p          : p * factor;
    const net   = contract.priceIncludesVat ? p / factor : p;
    const isSub = contract.billingMode === 'SUBSCRIPTION';
    // Si el contrato no está activo, no genera MRR ni próximo cobro: ya está
    // pausado o cancelado. Mostrar 200€/mes en un contrato cancelado induce
    // a error.
    const isLive = contract.status === 'ACTIVE';
    const ps    = (contract.payments ?? []).slice().sort((a, b) =>
      new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime(),
    );
    const next  = isLive ? (ps.find((x) => x.status !== 'PAID') ?? null) : null;
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    let paidYear = 0;
    let dueYear  = 0;
    for (const pay of ps) {
      if (new Date(pay.periodStart) >= yearStart) {
        paidYear += toNum(pay.amountPaid);
        dueYear  += toNum(pay.amountDue);
      }
    }
    const open = (contract.issues ?? []).filter((i) => !i.closedAt).length;
    return {
      priceGross:       gross,
      priceNet:         net,
      mrrNet:           isSub && isLive ? net : 0,
      payments:         ps,
      nextDuePayment:   next,
      paidThisYear:     paidYear,
      totalDueThisYear: dueYear,
      openIssuesCount:  open,
    };
  }, [contract]);

  async function handleGeneratePeriodPayment() {
    if (!contract) return;
    if (contract.billingMode !== 'SUBSCRIPTION') {
      toast('error', 'Solo se pueden generar pagos automáticos en suscripciones');
      return;
    }
    const ok = await confirm({
      title:       'Generar pago del periodo',
      message:     'Se creará un pago PENDING para el mes en curso (si aún no existe).',
      confirmText: 'Generar',
    });
    if (!ok) return;
    try {
      const res = await api.post<{ created: number; skipped: number }>('/v1/payments/roll', {});
      if (res.created > 0)      toast('success', `${res.created} pago(s) generado(s)`);
      else if (res.skipped > 0) toast('success', 'El pago de este periodo ya existía');
      else                      toast('success', 'Sin cambios');
      load(true);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al generar pago');
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[900px] mx-auto">
        <div className="skeleton h-5 w-24 mb-4" />
        <div className="skeleton h-8 w-72 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[0,1,2,3].map((i) => <div key={i} className="skeleton h-24 rounded-[16px]" />)}
        </div>
        <div className="skeleton h-64 rounded-[16px]" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-8 h-8 text-[var(--color-red)]" strokeWidth={1.5} />
        <p className="text-[15px] font-medium text-[var(--color-text)]">{error || 'Contrato no encontrado'}</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>Volver</Button>
          <Button variant="secondary" size="sm" onClick={() => load()} icon={<RefreshCw className="w-4 h-4" />}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const isSubscription = contract.billingMode === 'SUBSCRIPTION';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[900px] mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-blue)] hover:opacity-80 transition-opacity mb-4 animate-fade-up"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        Volver
      </button>

      {/* Header */}
      <header className="mb-6 animate-fade-up" style={{ animationDelay: '40ms', animationFillMode: 'both' } as React.CSSProperties}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={STATUS_BADGE[contract.status]} dot pulse={contract.status === 'ACTIVE'}>
                {STATUS_LABEL[contract.status]}
              </Badge>
              <Badge variant={TIER_BADGE[contract.tier]}>{TIER_LABEL[contract.tier]}</Badge>
              <Badge variant={BILLING_BADGE[contract.billingMode]}>{BILLING_LABEL[contract.billingMode]}</Badge>
              {contract.plan && <Badge variant="gray">Plan: {contract.plan.name}</Badge>}
            </div>

            <h1 className="text-[26px] sm:text-[30px] font-semibold text-[var(--color-text)] leading-tight tracking-[-0.02em] flex items-center gap-2 flex-wrap">
              <Building2 className="w-6 h-6 text-[var(--color-text-tertiary)] shrink-0" strokeWidth={1.7} />
              {contract.client?.name ?? 'Cliente eliminado'}
            </h1>

            {contract.project && (
              <Link
                to={`/proyectos/${contract.project.id}`}
                className="inline-flex items-center gap-1.5 mt-1.5 text-[13.5px] text-[var(--color-blue)] hover:underline"
              >
                <FolderKanban className="w-3.5 h-3.5" strokeWidth={2} />
                {contract.project.name}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSubscription && (
              <Button
                variant="secondary" size="sm"
                icon={<Repeat className="w-3.5 h-3.5" strokeWidth={2} />}
                onClick={handleGeneratePeriodPayment}
              >
                Generar pago del mes
              </Button>
            )}
            <Button
              variant="secondary" size="sm"
              icon={<Pencil className="w-3.5 h-3.5" strokeWidth={2} />}
              onClick={() => setEditOpen(true)}
            >
              Editar
            </Button>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-fade-up" style={{ animationDelay: '120ms', animationFillMode: 'both' } as React.CSSProperties}>
        <KpiCardSimple
          icon={<Wallet className="w-[18px] h-[18px]" strokeWidth={1.9} />}
          label="Precio"
          value={fmtCurrency(priceGross, 2)}
          hint={`${fmtCurrency(priceNet, 2)} neto · IVA ${fmt(toNum(contract.vatRate), 0)}%`}
          color="blue"
        />
        <KpiCardSimple
          icon={<Repeat className="w-[18px] h-[18px]" strokeWidth={1.9} />}
          label={isSubscription ? 'MRR neto' : 'Recurrencia'}
          value={isSubscription ? fmtCurrency(mrrNet, 2) : '—'}
          hint={isSubscription ? 'Por mes, sin IVA' : 'No es suscripción'}
          color={isSubscription ? 'green' : 'neutral'}
        />
        <KpiCardSimple
          icon={<Calendar className="w-[18px] h-[18px]" strokeWidth={1.9} />}
          label="Próximo cobro"
          value={nextDuePayment ? fmtDate(nextDuePayment.periodEnd) : '—'}
          hint={nextDuePayment ? `${fmtCurrency(toNum(nextDuePayment.amountDue), 2)} pendiente` : 'Sin pagos pendientes'}
          color={nextDuePayment ? 'orange' : 'neutral'}
        />
        <KpiCardSimple
          icon={<CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={1.9} />}
          label="Cobrado este año"
          value={fmtCurrency(paidThisYear, 0)}
          hint={totalDueThisYear > 0 ? `${fmt((paidThisYear / totalDueThisYear) * 100, 0)}% del total` : 'Aún sin cobros'}
          color="purple"
        />
      </div>

      {/* Tabs */}
      <div className="mb-5 animate-fade-up" style={{ animationDelay: '180ms', animationFillMode: 'both' } as React.CSSProperties}>
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pagos',         label: 'Pagos',          count: payments.length },
            { value: 'inconvenientes', label: 'Inconvenientes', count: openIssuesCount },
          ]}
        />
      </div>

      {/* Contenido por tab */}
      <div className="animate-fade-up" style={{ animationDelay: '220ms', animationFillMode: 'both' } as React.CSSProperties}>
        {tab === 'pagos' && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold text-[var(--color-text)] tracking-tight flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[var(--color-text-tertiary)]" strokeWidth={2} />
                Pagos
                <span className="text-[12px] font-normal text-[var(--color-text-tertiary)] tabular-nums">
                  ({payments.length})
                </span>
              </h2>
            </div>

            {payments.length === 0 ? (
              <Card padding="lg" className="text-center py-10">
                <p className="text-[14px] text-[var(--color-text-secondary)] mb-1">Sin pagos registrados</p>
                <p className="text-[12.5px] text-[var(--color-text-tertiary)]">
                  {isSubscription
                    ? 'Pulsa "Generar pago del mes" en la cabecera para crear el primer cobro.'
                    : 'Los pagos se generarán automáticamente al convertir este contrato a suscripción.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {payments.map((p, i) => (
                  <PaymentRow
                    key={p.id}
                    payment={p}
                    index={i}
                    onMark={() => setMarkTarget(p)}
                    onRegenerate={async () => {
                      try {
                        await api.post(`/v1/payments/${p.id}/regenerate`, {});
                        toast('success', 'Pago regenerado con el precio actual');
                        load(true);
                      } catch (e: unknown) {
                        toast('error', e instanceof Error ? e.message : 'Error al regenerar');
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'inconvenientes' && contract.id && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[16px] font-semibold text-[var(--color-text)] tracking-tight flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-[var(--color-text-tertiary)]" strokeWidth={2} />
                Inconvenientes
              </h2>
            </div>
            <IssuesPanel contractId={contract.id} />
          </section>
        )}
      </div>

      <PaymentMarkModal
        payment={markTarget}
        onClose={() => setMarkTarget(null)}
        onSuccess={() => load(true)}
      />

      <ContractEditModal
        contract={contract}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); load(true); }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI mini
// ---------------------------------------------------------------------------

function KpiCardSimple({ icon, label, value, hint, color }: {
  icon:  React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'neutral';
}) {
  const palette: Record<string, { bg: string; ic: string }> = {
    blue:    { bg: 'var(--color-blue-subtle)',   ic: 'var(--color-blue)' },
    green:   { bg: 'var(--color-green-subtle)',  ic: 'var(--color-green)' },
    orange:  { bg: 'var(--color-orange-subtle)', ic: 'var(--color-orange)' },
    red:     { bg: 'var(--color-red-subtle)',    ic: 'var(--color-red)' },
    purple:  { bg: 'var(--color-purple-subtle)', ic: '#BF5AF2' },
    neutral: { bg: 'var(--color-surface-alt)',   ic: 'var(--color-text-secondary)' },
  };
  const c = palette[color];
  return (
    <Card padding="md">
      <div className="flex items-start justify-between mb-2.5">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
          style={{ background: c.bg, color: c.ic }}
        >
          {icon}
        </div>
      </div>
      <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-0.5">{label}</p>
      <p className="text-[20px] font-semibold text-[var(--color-text)] leading-tight tracking-tight tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-1 leading-tight">{hint}</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PaymentRow
// ---------------------------------------------------------------------------

function PaymentRow({ payment, index, onMark, onRegenerate }: {
  payment: Payment; index: number; onMark: () => void; onRegenerate: () => void;
}) {
  const due  = toNum(payment.amountDue);
  const paid = toNum(payment.amountPaid);
  const isPaid = payment.status === 'PAID';
  const isPending = payment.status === 'PENDING';
  const pct  = due > 0 ? Math.min(100, (paid / due) * 100) : 0;

  return (
    <Card
      padding="md"
      className="animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 30, 200)}ms`, animationFillMode: 'both' } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0',
            isPaid
              ? 'bg-[var(--color-green-subtle)] text-[var(--color-green)]'
              : 'bg-[var(--color-orange-subtle)] text-[var(--color-orange)]',
          )}
        >
          {isPaid
            ? <CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={2} />
            : <Receipt      className="w-[18px] h-[18px]" strokeWidth={2} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-[var(--color-text)] tabular-nums">
              {fmtDate(payment.periodStart)} → {fmtDate(payment.periodEnd)}
            </p>
            <Badge variant={PAY_STATUS_BADGE[payment.status]} size="sm">
              {PAY_STATUS_LABEL[payment.status]}
            </Badge>
          </div>
          <div className="mt-1 h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: isPaid ? 'var(--color-green)' : pct > 0 ? 'var(--color-blue)' : 'var(--color-orange)',
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11.5px] text-[var(--color-text-tertiary)] mt-1 tabular-nums">
            <span>{fmtCurrency(paid, 2)} cobrado</span>
            <span>de {fmtCurrency(due, 2)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isPending && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCw className="w-3.5 h-3.5" strokeWidth={2} />}
              onClick={onRegenerate}
              title="Recalcular el importe con el precio actual del contrato"
            >
              <span className="hidden sm:inline">Regenerar</span>
            </Button>
          )}
          {!isPaid ? (
            <Button variant="ghost" size="sm" onClick={onMark}>Cobrar</Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMark}
              title="Ver historial de abonos"
            >
              Detalles
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
