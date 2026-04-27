// ============================================================================
// PaymentMarkModal.tsx — Modal compartido para registrar cobro de un Payment
// ============================================================================
// Usado en ContractDetailPage y CobrosPage. Llama a PATCH /payments/:id con
// amountPaid y paidAt — el backend deriva el status (PENDING/PARTIAL/PAID).
// ============================================================================

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmt, fmtCurrency, fmtDate, toNum } from '@/lib/format';
import type { Payment } from '@/types';
import Button     from '@/components/ui/Button';
import Modal      from '@/components/ui/Modal';
import Input      from '@/components/ui/Input';
import DatePicker from '@/components/ui/DatePicker';
import { useToast } from '@/components/ui/Toast';

interface Props {
  payment:   Payment | null;
  onClose:   () => void;
  onSuccess: () => void;
}

export default function PaymentMarkModal({ payment, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [amountPaid, setAmountPaid] = useState('');
  const [paidAt,     setPaidAt]     = useState('');
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (!payment) return;
    setAmountPaid(payment.amountPaid ?? payment.amountDue);
    setPaidAt(payment.paidAt ? payment.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
  }, [payment]);

  async function handleSave() {
    if (!payment) return;
    setSaving(true);
    try {
      await api.patch(`/v1/payments/${payment.id}`, {
        amountPaid: parseFloat(amountPaid),
        paidAt:     paidAt || null,
      });
      toast('success', 'Pago actualizado');
      onSuccess();
      onClose();
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!payment) return null;

  return (
    <Modal
      open={!!payment}
      onClose={onClose}
      title="Registrar cobro"
      subtitle={`Periodo ${fmtDate(payment.periodStart)} → ${fmtDate(payment.periodEnd)}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>Guardar</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-[12px] bg-[var(--color-surface-alt)] border border-[var(--color-border-subtle)] p-3 space-y-1.5">
          <RowMini label="Importe a cobrar (con IVA)" value={fmtCurrency(toNum(payment.amountDue), 2)} bold />
          <RowMini
            label={`Base imponible (sin IVA ${fmt(toNum(payment.vatRate), 0)}%)`}
            value={fmtCurrency(toNum(payment.amountNet), 2)}
          />
          {payment.contract && (
            <RowMini
              label="Cliente"
              value={`${payment.contract.client.name} · ${payment.contract.project.name}`}
            />
          )}
        </div>
        <Input
          label="Importe cobrado"
          type="number"
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          min="0" step="0.01" prefix="€"
          hint="Si es menor al total, el estado quedará como Parcial"
        />
        <DatePicker
          label="Fecha de cobro"
          value={paidAt}
          onChange={setPaidAt}
        />
      </div>
    </Modal>
  );
}

function RowMini({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12.5px] gap-3">
      <span className="text-[var(--color-text-secondary)] truncate">{label}</span>
      <span className={`tabular-nums text-[var(--color-text)] shrink-0 ${bold ? 'font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  );
}
