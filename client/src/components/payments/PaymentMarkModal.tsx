// ============================================================================
// PaymentMarkModal.tsx — Registrar un abono sobre un Payment
// ============================================================================
// S9: en lugar de "actualizar amountPaid total", el modal registra una
// PaymentTransaction (abono individual con method/reference). El backend
// recalcula amountPaid sumando todas las transacciones y deriva el status.
// Se muestra histórico debajo del form.
//
// Toggle "Generar factura al cobrar" sigue disponible: dispara
// POST /invoices/from-payment SI tras el abono el pago queda PAID.
// ============================================================================

import { useEffect, useState } from 'react';
import { Trash2, ArrowDownToLine, CreditCard, Banknote, Wallet, MoreHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { fmt, fmtCurrency, fmtDate, toNum } from '@/lib/format';
import type { Payment, PaymentMethod, PaymentTransaction } from '@/types';
import Button     from '@/components/ui/Button';
import Modal      from '@/components/ui/Modal';
import Input      from '@/components/ui/Input';
import Select     from '@/components/ui/Select';
import DatePicker from '@/components/ui/DatePicker';
import Toggle     from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';

interface Props {
  payment:   Payment | null;
  onClose:   () => void;
  onSuccess: () => void;
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  TRANSFER: 'Transferencia',
  CARD:     'Tarjeta',
  CASH:     'Efectivo',
  OTHER:    'Otro',
};

const METHOD_OPTIONS = (Object.keys(METHOD_LABEL) as PaymentMethod[])
  .map((k) => ({ value: k, label: METHOD_LABEL[k] }));

export default function PaymentMarkModal({ payment, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [amount,    setAmount]    = useState('');
  const [paidAt,    setPaidAt]    = useState('');
  const [method,    setMethod]    = useState<PaymentMethod>('TRANSFER');
  const [reference, setReference] = useState('');
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [saving,    setSaving]    = useState(false);

  // Cargar transacciones al abrir
  useEffect(() => {
    if (!payment) return;
    setReference(''); setMethod('TRANSFER'); setGenerateInvoice(true);
    setPaidAt(new Date().toISOString().slice(0, 10));
    api.get<Payment>(`/v1/payments/${payment.id}`)
      .then((p) => {
        setTransactions(p.transactions ?? []);
        // Sugerir como importe el restante
        const due  = toNum(p.amountDue);
        const paid = toNum(p.amountPaid);
        const remaining = Math.max(0, due - paid);
        setAmount(remaining > 0 ? remaining.toFixed(2) : '');
      })
      .catch(() => setTransactions([]));
  }, [payment]);

  if (!payment) return null;

  const totalPaid = transactions.reduce((s, t) => s + toNum(t.amount), 0);
  const due       = toNum(payment.amountDue);
  const remaining = Math.max(0, due - totalPaid);

  async function handleAddTransaction() {
    if (!payment) return;
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast('error', 'Indica un importe válido mayor que 0');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/v1/payments/${payment.id}/transactions`, {
        amount:    amt,
        paidAt:    paidAt || new Date().toISOString().slice(0, 10),
        method,
        reference: reference.trim() || null,
      });
      // Recargar para obtener nuevo estado
      const refreshed = await api.get<Payment>(`/v1/payments/${payment.id}`);
      setTransactions(refreshed.transactions ?? []);
      const isPaidNow = refreshed.status === 'PAID';
      const newRemaining = Math.max(0, toNum(refreshed.amountDue) - toNum(refreshed.amountPaid));

      if (isPaidNow && generateInvoice) {
        try {
          await api.post(`/v1/invoices/from-payment/${payment.id}`, {});
          toast('success', 'Abono registrado y factura generada');
        } catch (invErr: unknown) {
          const msg = invErr instanceof Error ? invErr.message : 'desconocido';
          toast('info', `Abono registrado. Factura: ${msg}`);
        }
      } else {
        toast('success', 'Abono registrado');
      }

      // Reset del form para siguiente abono
      setReference('');
      setAmount(newRemaining > 0 ? newRemaining.toFixed(2) : '');
      onSuccess();

      if (newRemaining === 0) {
        // Ya está pagado al completo, cerrar
        setTimeout(onClose, 150);
      }
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al registrar abono');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTransaction(trxId: string) {
    if (!confirm('¿Eliminar este abono? El total cobrado y el estado del pago se recalcularán.')) return;
    try {
      await api.delete(`/v1/payments/transactions/${trxId}`);
      const refreshed = await api.get<Payment>(`/v1/payments/${payment!.id}`);
      setTransactions(refreshed.transactions ?? []);
      const newRemaining = Math.max(0, toNum(refreshed.amountDue) - toNum(refreshed.amountPaid));
      setAmount(newRemaining > 0 ? newRemaining.toFixed(2) : '');
      toast('success', 'Abono eliminado');
      onSuccess();
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  const isPaid = remaining === 0;

  return (
    <Modal
      open={!!payment}
      onClose={onClose}
      title="Registrar cobro"
      subtitle={`Periodo ${fmtDate(payment.periodStart)} → ${fmtDate(payment.periodEnd)}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          {!isPaid && (
            <Button variant="primary" loading={saving} onClick={handleAddTransaction}>
              Registrar abono
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Resumen del pago */}
        <div className="rounded-[12px] bg-[var(--color-surface-alt)] border border-[var(--color-border-subtle)] p-3 space-y-1.5">
          <RowMini label="Importe a cobrar (con IVA)" value={fmtCurrency(due, 2)} bold />
          <RowMini
            label={`Base imponible (sin IVA ${fmt(toNum(payment.vatRate), 0)}%)`}
            value={fmtCurrency(toNum(payment.amountNet), 2)}
          />
          {toNum(payment.irpfAmount) > 0 && (
            <RowMini label="Retención IRPF aplicada" value={`-${fmtCurrency(toNum(payment.irpfAmount), 2)}`} danger />
          )}
          <RowMini label="Cobrado" value={fmtCurrency(totalPaid, 2)} />
          <div className="pt-1.5 border-t border-[var(--color-border)]">
            <RowMini
              label={isPaid ? 'PAGADO COMPLETO' : 'Pendiente'}
              value={fmtCurrency(remaining, 2)}
              bold
              danger={!isPaid}
              success={isPaid}
            />
          </div>
        </div>

        {/* Form para nuevo abono */}
        {!isPaid && (
          <div className="rounded-[12px] border border-[var(--color-border-medium)] p-3 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
              Nuevo abono
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Importe"
                type="number" min="0" step="0.01" prefix="€"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                hint={remaining > 0 ? `Pendiente: ${fmtCurrency(remaining, 2)}` : undefined}
              />
              <DatePicker
                label="Fecha"
                value={paidAt}
                onChange={setPaidAt}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Método"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                options={METHOD_OPTIONS}
              />
              <Input
                label="Referencia"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Nº transferencia, BIZUM…"
              />
            </div>
            <Toggle
              checked={generateInvoice}
              onChange={setGenerateInvoice}
              label="Generar factura si queda totalmente pagado"
            />
          </div>
        )}

        {/* Histórico de transacciones */}
        {transactions.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-2">
              Histórico de abonos
            </p>
            <div className="space-y-1.5">
              {transactions.map((t) => (
                <TrxRow key={t.id} trx={t} onDelete={() => handleDeleteTransaction(t.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function TrxRow({ trx, onDelete }: { trx: PaymentTransaction; onDelete: () => void }) {
  const Icon = trx.method === 'CARD'
    ? CreditCard
    : trx.method === 'CASH'
      ? Banknote
      : trx.method === 'OTHER'
        ? Wallet
        : ArrowDownToLine;
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-[var(--color-green-subtle)] text-[var(--color-green)] shrink-0">
        <Icon className="w-4 h-4" strokeWidth={1.9} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--color-text)] tabular-nums">
          {fmtCurrency(toNum(trx.amount), 2)}
          <span className="text-[11.5px] font-normal text-[var(--color-text-tertiary)] ml-2">
            {METHOD_LABEL[trx.method]}
          </span>
        </p>
        <p className="text-[11px] text-[var(--color-text-tertiary)]">
          {fmtDate(trx.paidAt)}
          {trx.reference && <> · ref: {trx.reference}</>}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-red-subtle)] hover:text-[var(--color-red)] transition-colors"
        title="Eliminar abono"
        aria-label="Eliminar abono"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function RowMini({
  label, value, bold = false, danger = false, success = false,
}: {
  label: string; value: string; bold?: boolean; danger?: boolean; success?: boolean;
}) {
  const valueClass = success
    ? 'text-[var(--color-green)]'
    : danger
      ? 'text-[var(--color-orange)]'
      : 'text-[var(--color-text)]';
  return (
    <div className="flex items-center justify-between text-[12.5px] gap-3">
      <span className="text-[var(--color-text-secondary)] truncate">{label}</span>
      <span className={`tabular-nums shrink-0 ${valueClass} ${bold ? 'font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// Suprimir warning import no usado
void MoreHorizontal;
