// ============================================================================
// ContractEditModal.tsx — Edición avanzada de un contrato existente
// ============================================================================
// Reemplaza el toast "próximamente" en ContractDetailPage. Permite tocar
// todos los campos relevantes del contrato y limpia los no aplicables al
// cambiar billingMode (defensivo).
// ============================================================================

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Contract, ContractTier, ContractStatus, ExtendedBillingMode, MaintenanceMode } from '@/types';
import Modal      from '@/components/ui/Modal';
import Button     from '@/components/ui/Button';
import Input      from '@/components/ui/Input';
import Select     from '@/components/ui/Select';
import Toggle     from '@/components/ui/Toggle';
import Textarea   from '@/components/ui/Textarea';
import DatePicker from '@/components/ui/DatePicker';
import { useToast } from '@/components/ui/Toast';
import { TIER_LABEL, BILLING_LABEL, STATUS_LABEL } from './ContractsTab';

type BillingFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

const TIER_OPTIONS    = (Object.keys(TIER_LABEL)    as ContractTier[]).map((k)        => ({ value: k, label: TIER_LABEL[k] }));
const BILLING_OPTIONS = (Object.keys(BILLING_LABEL) as ExtendedBillingMode[]).map((k) => ({ value: k, label: BILLING_LABEL[k] }));
const STATUS_OPTIONS  = (Object.keys(STATUS_LABEL)  as ContractStatus[]).map((k)      => ({ value: k, label: STATUS_LABEL[k] }));

const FREQ_OPTIONS    = [
  { value: 'MONTHLY',   label: 'Mensual' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'YEARLY',    label: 'Anual' },
];

const MAINT_OPTIONS = [
  { value: 'NONE',   label: 'Sin mantenimiento' },
  { value: 'SHARED', label: 'Compartido entre contratos' },
  { value: 'CUSTOM', label: 'Cuota fija propia' },
];

interface FormState {
  tier:                ContractTier;
  billingMode:         ExtendedBillingMode;
  billingFrequency:    BillingFrequency;
  billingDay:          string;
  price:               string;
  setupFee:            string;
  hourlyRate:          string;
  partsMarkupPct:      string;
  vatRate:             string;
  priceIncludesVat:    boolean;
  irpfRate:            string;
  maintenanceMode:     MaintenanceMode;
  maintenanceExtraPct: string;
  status:              ContractStatus;
  endedAt:             string;
  notes:               string;
}

function contractToForm(c: Contract): FormState {
  return {
    tier:                c.tier,
    billingMode:         c.billingMode,
    billingFrequency:    c.billingFrequency ?? 'MONTHLY',
    billingDay:          c.billingDay != null ? String(c.billingDay) : '',
    price:               c.price ?? '',
    setupFee:            c.setupFee ?? '',
    hourlyRate:          c.hourlyRate ?? '',
    partsMarkupPct:      c.partsMarkupPct ?? '',
    vatRate:             c.vatRate ?? '21',
    priceIncludesVat:    c.priceIncludesVat,
    irpfRate:            (c as { irpfRate?: string | null }).irpfRate ?? '',
    maintenanceMode:     c.maintenanceMode,
    maintenanceExtraPct: c.maintenanceExtraPct ?? '',
    status:              c.status,
    endedAt:             c.endedAt ? c.endedAt.slice(0, 10) : '',
    notes:               c.notes ?? '',
  };
}

export default function ContractEditModal({
  contract, open, onClose, onSaved,
}: {
  contract: Contract | null;
  open:     boolean;
  onClose:  () => void;
  onSaved:  () => void;
}) {
  const { toast } = useToast();
  const [form,    setForm]    = useState<FormState | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    if (open && contract) { setForm(contractToForm(contract)); setErr(''); }
  }, [open, contract]);

  if (!form || !contract) return null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => p && ({ ...p, [key]: value }));
  }

  /**
   * Cambio de billingMode: limpiar campos no aplicables al nuevo modo.
   * Esto evita arrastrar un setupFee de un FIXED cuando ahora es HOURLY,
   * o un billingDay de cuando era SUBSCRIPTION.
   */
  function changeBillingMode(next: ExtendedBillingMode) {
    setForm((p) => p && ({
      ...p,
      billingMode: next,
      // HOURLY no usa setupFee ni billingDay (no es recurrente)
      setupFee:         next === 'HOURLY' ? '' : p.setupFee,
      hourlyRate:       (next === 'HOURLY' || next === 'HYBRID') ? p.hourlyRate : '',
      billingFrequency: next === 'SUBSCRIPTION' ? p.billingFrequency : 'MONTHLY',
      billingDay:       next === 'SUBSCRIPTION' ? p.billingDay : '',
      maintenanceMode:  next === 'SUBSCRIPTION' ? p.maintenanceMode : 'NONE',
      maintenanceExtraPct: next === 'SUBSCRIPTION' ? p.maintenanceExtraPct : '',
    }));
  }

  async function submit() {
    if (!form) return;
    if (!form.price.trim() || parseFloat(form.price) < 0) {
      setErr('Indica un precio válido (no negativo)'); return;
    }
    setSaving(true);
    setErr('');
    try {
      const isSubscription = form.billingMode === 'SUBSCRIPTION';
      await api.patch(`/v1/contracts/${contract.id}`, {
        tier:                form.tier,
        billingMode:         form.billingMode,
        price:               parseFloat(form.price),
        setupFee:            form.setupFee   ? parseFloat(form.setupFee)   : null,
        hourlyRate:          form.hourlyRate ? parseFloat(form.hourlyRate) : null,
        partsMarkupPct:      form.partsMarkupPct ? parseFloat(form.partsMarkupPct) : null,
        vatRate:             form.vatRate ? parseFloat(form.vatRate) : 21,
        priceIncludesVat:    form.priceIncludesVat,
        irpfRate:            form.irpfRate ? parseFloat(form.irpfRate) : null,
        maintenanceMode:     form.maintenanceMode,
        maintenanceExtraPct: form.maintenanceExtraPct ? parseFloat(form.maintenanceExtraPct) : null,
        billingFrequency:    isSubscription ? form.billingFrequency : undefined,
        billingDay:          isSubscription && form.billingDay ? parseInt(form.billingDay, 10) : null,
        status:              form.status,
        endedAt:             form.endedAt || null,
        notes:               form.notes.trim() || null,
      });
      toast('success', 'Contrato actualizado');
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar contrato"
      subtitle={contract.client?.name ?? ''}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Guardar cambios</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[10px] bg-[var(--color-blue-subtle)] border border-[rgba(10,132,255,0.16)] px-3 py-2">
          <p className="text-[12px] text-[var(--color-blue)] leading-relaxed">
            Los pagos ya generados no se actualizan automáticamente. Si cambias el precio, usa
            <strong> Regenerar pago</strong> en cada pago PENDIENTE para recalcularlo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Nivel"   value={form.tier}   onChange={(e) => set('tier',   e.target.value as ContractTier)}   options={TIER_OPTIONS} />
          <Select label="Estado" value={form.status} onChange={(e) => set('status', e.target.value as ContractStatus)} options={STATUS_OPTIONS} />
        </div>

        <Select
          label="Modo de cobro"
          value={form.billingMode}
          onChange={(e) => changeBillingMode(e.target.value as ExtendedBillingMode)}
          options={BILLING_OPTIONS}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={form.billingMode === 'SUBSCRIPTION' ? 'Cuota *' : 'Precio *'}
            type="number" prefix="€" min="0" step="0.01"
            value={form.price}
            onChange={(e) => { set('price', e.target.value); setErr(''); }}
          />
          <Input
            label="IVA" type="number" suffix="%" min="0" max="100"
            value={form.vatRate}
            onChange={(e) => set('vatRate', e.target.value)}
          />
        </div>
        <Toggle
          checked={form.priceIncludesVat}
          onChange={(v) => set('priceIncludesVat', v)}
          label="El precio ya incluye IVA"
        />

        <Input
          label="Retención IRPF"
          type="number" suffix="%" min="0" max="100" step="0.5"
          value={form.irpfRate}
          onChange={(e) => set('irpfRate', e.target.value)}
          hint="España: 15% profesionales, 7% nuevos autónomos primer año. Déjalo vacío si no aplica."
        />

        {(form.billingMode === 'FIXED' || form.billingMode === 'HYBRID' || form.billingMode === 'SUBSCRIPTION') && (
          <Input
            label="Cuota de alta (setup)" type="number" prefix="€" min="0"
            value={form.setupFee}
            onChange={(e) => set('setupFee', e.target.value)}
            hint="One-shot al iniciar el contrato. Opcional."
          />
        )}
        {(form.billingMode === 'HOURLY' || form.billingMode === 'HYBRID') && (
          <Input
            label="Tarifa por hora" type="number" prefix="€" min="0" step="0.5"
            value={form.hourlyRate}
            onChange={(e) => set('hourlyRate', e.target.value)}
          />
        )}
        <Input
          label="Margen sobre piezas" type="number" suffix="%" min="0"
          value={form.partsMarkupPct}
          onChange={(e) => set('partsMarkupPct', e.target.value)}
        />

        {form.billingMode === 'SUBSCRIPTION' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Frecuencia"
                value={form.billingFrequency}
                onChange={(e) => set('billingFrequency', e.target.value as BillingFrequency)}
                options={FREQ_OPTIONS}
              />
              <Input
                label="Día de cobro" type="number" min="1" max="28"
                value={form.billingDay}
                onChange={(e) => set('billingDay', e.target.value)}
                hint="1–28"
              />
            </div>
            <Select
              label="Mantenimiento"
              value={form.maintenanceMode}
              onChange={(e) => set('maintenanceMode', e.target.value as MaintenanceMode)}
              options={MAINT_OPTIONS}
            />
            {form.maintenanceMode === 'SHARED' && (
              <Input
                label="Margen sobre coste compartido" type="number" suffix="%" min="0"
                value={form.maintenanceExtraPct}
                onChange={(e) => set('maintenanceExtraPct', e.target.value)}
              />
            )}
          </>
        )}

        <DatePicker
          label="Fecha de fin"
          value={form.endedAt}
          onChange={(v) => set('endedAt', v)}
        />

        <Textarea
          label="Notas"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Anotaciones internas, condiciones especiales…"
        />

        {err && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.20)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
            <p className="text-[13px] text-[#D93025] dark:text-[#FF6961]">{err}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
