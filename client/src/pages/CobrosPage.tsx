// ============================================================================
// CobrosPage.tsx — Centro de cobros del tenant
// ============================================================================
// Lista de Payments con filtros (estado, cliente, rango temporal).
// Acción "Generar cobros del mes" para suscripciones (POST /payments/roll).
// Marcar pagado/parcial reutilizando PaymentMarkModal.
// ============================================================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Wallet, AlertCircle, RefreshCw, Receipt, CheckCircle2,
  Repeat, Clock, Search,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { fmt, fmtCurrency, fmtDate, toNum } from '@/lib/format';
import type { Payment, PaymentStatus } from '@/types';
import Card             from '@/components/ui/Card';
import Badge            from '@/components/ui/Badge';
import Button           from '@/components/ui/Button';
import SegmentedControl from '@/components/ui/SegmentedControl';
import DemoBadge        from '@/components/ui/DemoBadge';
import { useToast }    from '@/components/ui/Toast';
import { useConfirm }  from '@/components/ui/ConfirmDialog';
import PaymentMarkModal from '@/components/payments/PaymentMarkModal';

// ---------------------------------------------------------------------------
// Constantes visuales
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagado',
};
const STATUS_BADGE: Record<PaymentStatus, 'orange' | 'blue' | 'green'> = {
  PENDING: 'orange', PARTIAL: 'blue', PAID: 'green',
};

type StatusFilter = 'ALL' | PaymentStatus;

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function CobrosPage() {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const navigate    = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [rolling,  setRolling]  = useState(false);

  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');

  const [markTarget, setMarkTarget] = useState<Payment | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    api.get<Payment[]>('/v1/payments')
      .then(setPayments)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRoll() {
    const ok = await confirm({
      title:       'Generar cobros del mes',
      message:     'Se creará un Payment PENDING para cada suscripción activa que aún no tenga uno este periodo.',
      confirmText: 'Generar',
    });
    if (!ok) return;
    setRolling(true);
    try {
      const res = await api.post<{ created: number; skipped: number; totalActiveSubscriptions: number }>(
        '/v1/payments/roll', {},
      );
      if (res.created > 0)      toast('success', `${res.created} pago(s) generado(s)`);
      else if (res.skipped > 0) toast('success', `Sin novedades · ${res.skipped} ya existían`);
      else                      toast('success', 'No hay suscripciones activas todavía');
      load(true);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al generar cobros');
    } finally {
      setRolling(false);
    }
  }

  // Derivados ---------------------------------------------------------------

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (filter !== 'ALL' && p.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cName = p.contract?.client?.name?.toLowerCase()  ?? '';
        const pName = p.contract?.project?.name?.toLowerCase() ?? '';
        if (!cName.includes(q) && !pName.includes(q)) return false;
      }
      return true;
    });
  }, [payments, filter, search]);

  const counts = useMemo(() => ({
    ALL:     payments.length,
    PENDING: payments.filter((p) => p.status === 'PENDING').length,
    PARTIAL: payments.filter((p) => p.status === 'PARTIAL').length,
    PAID:    payments.filter((p) => p.status === 'PAID').length,
  }), [payments]);

  /**
   * Totales separados por modo:
   *   GROSS = lo que el cliente paga en caja (amountDue/Paid del Payment).
   *   NET   = base imponible (amountNet) — ingreso real del negocio sin IVA.
   * El usuario elige cuál ver desde un toggle en el hero.
   */
  const totals = useMemo(() => {
    let dueGross = 0, paidGross = 0, pendingGross = 0;
    let dueNet   = 0, paidNet   = 0, pendingNet   = 0;
    for (const p of payments) {
      const dGross = toNum(p.amountDue);
      const pGross = toNum(p.amountPaid);
      const dNet   = toNum(p.amountNet);
      // Para NET cobrado: proporcionar amountNet según fracción ya pagada.
      const fraction = dGross > 0 ? Math.min(1, pGross / dGross) : 0;
      const pNet     = dNet * fraction;

      dueGross  += dGross;
      paidGross += pGross;
      dueNet    += dNet;
      paidNet   += pNet;
      if (p.status !== 'PAID') {
        pendingGross += dGross - pGross;
        pendingNet   += dNet   - pNet;
      }
    }
    return { dueGross, paidGross, pendingGross, dueNet, paidNet, pendingNet };
  }, [payments]);

  const [amountMode, setAmountMode] = useState<'NET' | 'GROSS'>('NET');

  // Estados de carga --------------------------------------------------------

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1100px] mx-auto">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="skeleton h-28 rounded-[16px] mb-6" />
        <div className="space-y-2">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-20 rounded-[14px]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-8 h-8 text-[var(--color-red)]" strokeWidth={1.5} />
        <p className="text-[15px] font-medium text-[var(--color-text)]">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => load()} icon={<RefreshCw className="w-4 h-4" />}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1100px] mx-auto">
      <header className="flex items-start justify-between mb-6 animate-fade-up flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--color-text)] tracking-tight">Cobros</h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
            {payments.length} pago{payments.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Repeat className="w-4 h-4" strokeWidth={2.4} />}
          loading={rolling}
          onClick={handleRoll}
        >
          Generar cobros del mes
        </Button>
      </header>

      {/* Hero resumen */}
      <div
        className="relative overflow-hidden rounded-[20px] mb-6 animate-fade-up p-5 sm:p-6"
        style={{
          background:
            'linear-gradient(135deg, rgba(48,209,88,0.10) 0%, rgba(10,132,255,0.06) 60%, rgba(191,90,242,0.04) 100%)',
          border: '1px solid var(--color-border-subtle)',
          boxShadow: 'var(--shadow-card)',
          animationDelay: '50ms',
          animationFillMode: 'both',
        } as React.CSSProperties}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(48,209,88,0.30) 0%, transparent 70%)' }}
        />
        {/* Toggle NET/GROSS en esquina superior derecha */}
        <div className="absolute top-3 right-3 z-10">
          <div className="flex bg-[rgba(255,255,255,0.65)] dark:bg-[rgba(28,28,30,0.65)] backdrop-blur-md rounded-[10px] p-0.5 border border-[var(--color-border-subtle)]">
            <button
              onClick={() => setAmountMode('NET')}
              className={clsx(
                'px-2.5 py-1 text-[11px] font-semibold rounded-[8px] transition-all',
                amountMode === 'NET'
                  ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
              )}
              title="Sin IVA — ingreso real del negocio"
            >
              Neto
            </button>
            <button
              onClick={() => setAmountMode('GROSS')}
              className={clsx(
                'px-2.5 py-1 text-[11px] font-semibold rounded-[8px] transition-all',
                amountMode === 'GROSS'
                  ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
              )}
              title="Con IVA — lo que cobras al cliente"
            >
              Bruto
            </button>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-4 sm:gap-6">
          <HeroBlock
            label={amountMode === 'NET' ? 'Cobrado (neto)' : 'Cobrado (bruto)'}
            value={fmtCurrency(amountMode === 'NET' ? totals.paidNet : totals.paidGross, 0)}
            color="#30D158"
          />
          <HeroBlock
            label="Pendiente de cobro"
            value={fmtCurrency(amountMode === 'NET' ? totals.pendingNet : totals.pendingGross, 0)}
            color="#FF9F0A"
          />
          <HeroBlock
            label={amountMode === 'NET' ? 'Total emitido (neto)' : 'Total emitido (bruto)'}
            value={fmtCurrency(amountMode === 'NET' ? totals.dueNet : totals.dueGross, 0)}
            color="#0A84FF"
          />
        </div>
      </div>

      {/* Filtros */}
      {payments.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 animate-fade-up stagger-1">
          <div className="relative sm:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente o producto..."
              className="w-full h-10 pl-9 pr-3 text-[13.5px] text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border-medium)] rounded-[11px] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-blue)] focus:ring-[3px] focus:ring-[rgba(10,132,255,0.20)] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            />
          </div>
          <SegmentedControl<StatusFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'ALL',     label: 'Todos',      count: counts.ALL },
              { value: 'PENDING', label: 'Pendientes', count: counts.PENDING },
              { value: 'PARTIAL', label: 'Parciales',  count: counts.PARTIAL },
              { value: 'PAID',    label: 'Pagados',    count: counts.PAID },
            ]}
          />
        </div>
      )}

      {/* Lista */}
      {payments.length === 0 ? (
        <Card padding="lg" className="flex flex-col items-center py-12 text-center animate-fade-up">
          <div className="w-16 h-16 rounded-[20px] bg-[var(--color-blue-subtle)] flex items-center justify-center mb-4 animate-float">
            <Wallet className="w-7 h-7 text-[var(--color-blue)]" strokeWidth={1.6} />
          </div>
          <p className="text-[18px] font-semibold text-[var(--color-text)] tracking-tight">
            Tus cobros aparecerán aquí
          </p>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-1.5 max-w-[440px] leading-relaxed">
            Un cobro = cada cantidad que un cliente te tiene que pagar. Las suscripciones
            generan cobros solas. Los proyectos cerrados los puedes crear a mano.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-6">
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleRoll}>
              Generar cobros del mes
            </Button>
            <a
              href="/ayuda?a=que-es-cobro"
              className="text-[12.5px] font-semibold text-[var(--color-blue)] hover:underline"
            >
              ¿Cómo funcionan los cobros?
            </a>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="lg" className="text-center py-10">
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            No hay pagos que coincidan con los filtros.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, i) => (
            <PaymentRow
              key={p.id}
              payment={p}
              index={i}
              onMark={() => setMarkTarget(p)}
              onOpen={() => p.contract && navigate(`/contratos/${p.contract.id}`)}
            />
          ))}
        </div>
      )}

      <PaymentMarkModal
        payment={markTarget}
        onClose={() => setMarkTarget(null)}
        onSuccess={() => load(true)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeroBlock
// ---------------------------------------------------------------------------

function HeroBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] sm:text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-[0.08em]">
        {label}
      </p>
      <p
        className="text-[22px] sm:text-[28px] font-semibold tabular-nums mt-1 leading-none tracking-tight"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PaymentRow
// ---------------------------------------------------------------------------

function PaymentRow({ payment, index, onMark, onOpen }: {
  payment: Payment; index: number; onMark: () => void; onOpen: () => void;
}) {
  const due  = toNum(payment.amountDue);
  const paid = toNum(payment.amountPaid);
  const isPaid = payment.status === 'PAID';
  const pct  = due > 0 ? Math.min(100, (paid / due) * 100) : 0;

  return (
    <Card
      padding="md"
      className="animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 30, 240)}ms`, animationFillMode: 'both' } as React.CSSProperties}
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

        <button
          onClick={onOpen}
          className="flex-1 min-w-0 text-left group"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-[var(--color-text)] truncate group-hover:text-[var(--color-blue)] transition-colors">
              {payment.contract?.client?.name ?? 'Cliente eliminado'}
            </p>
            <Badge variant={STATUS_BADGE[payment.status]} size="sm">
              {STATUS_LABEL[payment.status]}
            </Badge>
            <DemoBadge show={payment.contract?.isDemo} />
          </div>
          <p className="text-[12px] text-[var(--color-text-tertiary)] truncate mt-0.5">
            {payment.contract?.project?.name ?? '—'} · <Clock className="w-3 h-3 inline -mt-0.5" />{' '}
            {fmtDate(payment.periodStart)} → {fmtDate(payment.periodEnd)}
          </p>
          <div className="mt-1.5 h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: isPaid ? 'var(--color-green)' : pct > 0 ? 'var(--color-blue)' : 'var(--color-orange)',
              }}
            />
          </div>
        </button>

        <div className="text-right shrink-0">
          <p className="text-[14.5px] font-semibold text-[var(--color-text)] tabular-nums leading-tight">
            {fmtCurrency(due, 2)}
          </p>
          <p className="text-[10.5px] text-[var(--color-text-tertiary)] tabular-nums uppercase tracking-wide">
            con IVA {fmt(toNum(payment.vatRate), 0)}%
          </p>
        </div>

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
    </Card>
  );
}
