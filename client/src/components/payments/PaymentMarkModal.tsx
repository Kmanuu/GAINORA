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
import Toggle     from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';

interface Props {
  payment:   Payment | null;
  onClose:   () => void;
  onSuccess: () => void;
}

export default function PaymentMarkModal({ payment, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [amountPaid,    setAmountPaid]    = useState('');
  const [paidAt,        setPaidAt]        = useState('');
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    if (!payment) return;
    setAmountPaid(payment.amountPaid ?? payment.amountDue);
    setPaidAt(payment.paidAt ? payment.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setGenerateInvoice(true);
  }, [payment]);

  async function handleSave() {
    if (!payment) return;
    const paid = parseFloat(amountPaid);
    const due  = toNum(payment.amountDue);
    setSaving(true);
    try {
      await api.patch(`/v1/payments/${payment.id}`, {
        amountPaid: paid,
        paidAt:     paidAt || null,
      });
      // Si está totalmente pagado y el usuario lo eligió, generar factura.
      const willBeFullyPaid = paid + 0.001 >= due;
      if (generateInvoice && willBeFullyPaid) {
        try {
          await api.post(`/v1/invoices/from-payment/${payment.id}`, {});
          toast('success', 'Pago registrado y factura generada');
        } catch (invErr: unknown) {
          // No bloqueamos el flujo si la factura falla (p.ej. ya tenía una).
          const msg = invErr instanceof Error ? invErr.message : 'Error desconocido';
          toast('info', `Pago guardado. Factura no generada: ${msg}`);
        }
      } else {
        toast('success', 'Pago actualizado');
      }
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
        <Toggle
          checked={generateInvoice}
          onChange={setGenerateInvoice}
          label="Generar factura al marcar como pagado"
        />
        <p className="text-[11.5px] text-[var(--color-text-tertiary)] -mt-1.5 leading-relaxed">
          Solo si el importe cubre el total. La factura se emite con número
          correlativo de tu serie por defecto.
        </p>
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
