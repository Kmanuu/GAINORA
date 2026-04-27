// ============================================================================
// ContractsTab.tsx — Pestaña "Contratos" dentro de ProjectDetailPage
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FileText, ChevronRight, Users, Sparkles,
} from 'lucide-react';
import { api }       from '@/lib/api';
import { fmtCurrency, toNum, fmtDate } from '@/lib/format';
import type {
  Contract, Client, Plan, ContractTier, ContractStatus, ExtendedBillingMode,
} from '@/types';
import Card        from '@/components/ui/Card';
import Badge       from '@/components/ui/Badge';
import Button      from '@/components/ui/Button';
import Modal       from '@/components/ui/Modal';
import Input       from '@/components/ui/Input';
import Select      from '@/components/ui/Select';
import DatePicker  from '@/components/ui/DatePicker';
import EmptyState  from '@/components/ui/EmptyState';
import { useToast }   from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Constantes visuales (compartidas con ContractDetailPage)
// ---------------------------------------------------------------------------

export const TIER_LABEL: Record<ContractTier, string> = {
  FREE: 'Básico', PRO: 'Pro', MAX: 'Élite',
};
export const TIER_BADGE: Record<ContractTier, 'gray' | 'blue' | 'purple'> = {
  FREE: 'gray', PRO: 'blue', MAX: 'purple',
};

export const BILLING_LABEL: Record<ExtendedBillingMode, string> = {
  FIXED: 'Cerrado', HOURLY: 'Por horas', HYBRID: 'Mixto', SUBSCRIPTION: 'Suscripción',
};
export const BILLING_BADGE: Record<ExtendedBillingMode, 'blue' | 'orange' | 'green' | 'purple'> = {
  FIXED: 'blue', HOURLY: 'orange', HYBRID: 'green', SUBSCRIPTION: 'purple',
};

export const STATUS_LABEL: Record<ContractStatus, string> = {
  ACTIVE: 'Activo', PAUSED: 'Pausado', CANCELLED: 'Cancelado',
};
export const STATUS_BADGE: Record<ContractStatus, 'green' | 'orange' | 'red'> = {
  ACTIVE: 'green', PAUSED: 'orange', CANCELLED: 'red',
};

const TIER_OPTIONS    = [{ value: 'FREE', label: 'Básico' }, { value: 'PRO', label: 'Pro' }, { value: 'MAX', label: 'Élite' }];
const BILLING_OPTIONS = [
  { value: 'SUBSCRIPTION', label: 'Suscripción (cuota recurrente)' },
  { value: 'FIXED',        label: 'Precio cerrado' },
  { value: 'HOURLY',       label: 'Por horas' },
  { value: 'HYBRID',       label: 'Mixto (presupuesto + horas)' },
];

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

type BillingFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

const FREQUENCY_OPTIONS = [
  { value: 'MONTHLY',   label: 'Mensual'    },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'YEARLY',    label: 'Anual'      },
];

interface ContractFormState {
  clientId:         string;
  planId:           string;
  tier:             ContractTier;
  billingMode:      ExtendedBillingMode;
  price:            string;
  setupFee:         string;
  billingFrequency: BillingFrequency;
  billingDay:       string;
  startedAt:        string;
}

const EMPTY_FORM: ContractFormState = {
  clientId: '', planId: '', tier: 'PRO', billingMode: 'SUBSCRIPTION',
  price: '', setupFee: '', billingFrequency: 'MONTHLY', billingDay: '1',
  startedAt: new Date().toISOString().slice(0, 10),
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ContractsTab({
  projectId,
  projectName,
}: {
  projectId:   string;
  projectName: string;
}) {
  const { toast }    = useToast();
  const navigate     = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [plans,     setPlans]     = useState<Plan[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form,      setForm]      = useState<ContractFormState>(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  const loadAll = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      api.get<Contract[]>(`/v1/contracts?projectId=${projectId}`),
      api.get<Client[]>('/v1/clients'),
      api.get<Plan[]>('/v1/plans?isActive=true'),
    ])
      .then(([cs, cls, pls]) => {
        setContracts(cs);
        setClients(cls);
        setPlans(pls);
      })
      .catch((e: Error) => toast('error', e.message))
      .finally(() => setLoading(false));
  }, [projectId, toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function applyPlan(planId: string) {
    setForm((prev) => {
      if (!planId) return { ...prev, planId: '' };
      const p = plans.find((x) => x.id === planId);
      if (!p) return { ...prev, planId };
      return {
        ...prev,
        planId,
        tier:        p.tier,
        billingMode: p.billingMode,
        price:       p.price,
        setupFee:    p.setupFee ?? '',
      };
    });
    setFormError('');
  }

  async function handleSave() {
    if (!form.clientId)        { setFormError('Elige un cliente'); return; }
    if (!form.price.trim() || parseFloat(form.price) < 0) { setFormError('Indica un precio válido'); return; }
    setSaving(true);
    setFormError('');
    try {
      const isSubscription = form.billingMode === 'SUBSCRIPTION';
      await api.post<Contract>('/v1/contracts', {
        projectId,
        clientId:         form.clientId,
        planId:           form.planId || null,
        tier:             form.tier,
        billingMode:      form.billingMode,
        price:            parseFloat(form.price),
        setupFee:         form.setupFee ? parseFloat(form.setupFee) : null,
        billingFrequency: isSubscription ? form.billingFrequency : undefined,
        billingDay:       isSubscription && form.billingDay ? parseInt(form.billingDay, 10) : null,
        startedAt:        form.startedAt,
      });
      toast('success', 'Contrato creado');
      setModalOpen(false);
      loadAll(true);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al crear contrato');
    } finally {
      setSaving(false);
    }
  }

  const noClients = clients.length === 0;

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => <div key={i} className="skeleton h-24 rounded-[16px]" />)}
      </div>
    );
  }

  return (
    <div>
      {contracts.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7 text-[var(--color-blue)]" strokeWidth={1.6} />}
          title="Sin contratos en este producto"
          description={
            noClients
              ? 'Primero crea un cliente desde el menú lateral, luego podrás contratar este producto.'
              : `Asigna "${projectName}" a uno o más clientes para empezar a facturar.`
          }
          actionLabel={noClients ? undefined : 'Nuevo contrato'}
          actionIcon={<Plus className="w-4 h-4" />}
          onAction={noClients ? undefined : openCreate}
        />
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <Button
              variant="primary" size="sm"
              icon={<Plus className="w-4 h-4" strokeWidth={2.4} />}
              onClick={openCreate}
              disabled={noClients}
            >
              Nuevo contrato
            </Button>
          </div>
          <div className="space-y-3">
            {contracts.map((c, i) => (
              <ContractRow
                key={c.id}
                contract={c}
                index={i}
                onClick={() => navigate(`/contratos/${c.id}`)}
              />
            ))}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo contrato"
        subtitle={`Asignar "${projectName}" a un cliente`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>Crear contrato</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label="Cliente *"
            value={form.clientId}
            onChange={(e) => { setForm((p) => ({ ...p, clientId: e.target.value })); setFormError(''); }}
            options={[{ value: '', label: 'Selecciona un cliente...' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />

          {plans.length > 0 && (
            <div className="rounded-[14px] bg-[rgba(10,132,255,0.04)] dark:bg-[rgba(10,132,255,0.06)] border border-[rgba(10,132,255,0.18)] p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-blue)]" strokeWidth={2} />
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-blue)]">
                  Plantilla del catálogo (opcional)
                </p>
              </div>
              <Select
                label="Aplicar plan"
                value={form.planId}
                onChange={(e) => applyPlan(e.target.value)}
                options={[
                  { value: '', label: 'Sin plantilla — configurar manualmente' },
                  ...plans.map((p) => ({ value: p.id, label: `${p.name} · ${TIER_LABEL[p.tier]} · ${fmtCurrency(toNum(p.price), 2)}` })),
                ]}
              />
              <p className="text-[11.5px] text-[var(--color-text-tertiary)] leading-relaxed">
                Al elegir un plan, se autorrellenan tier, modo y precio. Puedes seguir editándolos abajo.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Plan / Tier"
              value={form.tier}
              onChange={(e) => setForm((p) => ({ ...p, tier: e.target.value as ContractTier }))}
              options={TIER_OPTIONS}
            />
            <Select
              label="Modo de cobro"
              value={form.billingMode}
              onChange={(e) => setForm((p) => ({ ...p, billingMode: e.target.value as ExtendedBillingMode }))}
              options={BILLING_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={form.billingMode === 'SUBSCRIPTION' ? 'Precio mensual *' : 'Precio *'}
              type="number"
              value={form.price}
              onChange={(e) => { setForm((p) => ({ ...p, price: e.target.value })); setFormError(''); }}
              min="0" step="0.01" prefix="€"
            />
            <Input
              label="Cuota de alta"
              type="number"
              value={form.setupFee}
              onChange={(e) => setForm((p) => ({ ...p, setupFee: e.target.value }))}
              min="0" step="0.01" prefix="€"
              hint="One-shot al iniciar"
            />
          </div>

          {form.billingMode === 'SUBSCRIPTION' && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Frecuencia de cobro"
                value={form.billingFrequency}
                onChange={(e) => setForm((p) => ({ ...p, billingFrequency: e.target.value as BillingFrequency }))}
                options={FREQUENCY_OPTIONS}
              />
              <Input
                label="Día de cobro"
                type="number"
                value={form.billingDay}
                onChange={(e) => setForm((p) => ({ ...p, billingDay: e.target.value }))}
                min="1"
                max="28"
                hint="Día del mes en que se emite la cuota (1–28)."
              />
            </div>
          )}

          <DatePicker
            label="Fecha de inicio *"
            value={form.startedAt}
            onChange={(val) => setForm((p) => ({ ...p, startedAt: val }))}
          />

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.20)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
              <p className="text-[13px] text-[#D93025] dark:text-[#FF6961]">{formError}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fila de contrato (clickable)
// ---------------------------------------------------------------------------

function ContractRow({ contract, index, onClick }: {
  contract: Contract; index: number; onClick: () => void;
}) {
  const price       = toNum(contract.price);
  const isRecurring = contract.billingMode === 'SUBSCRIPTION';

  return (
    <Card
      hover
      padding="md"
      onClick={onClick}
      className="animate-fade-up flex items-center gap-3"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' } as React.CSSProperties}
    >
      <div
        className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 text-[14px] font-semibold"
        style={{ background: 'var(--color-blue-subtle)', color: 'var(--color-blue)' }}
      >
        {contract.client?.name[0]?.toUpperCase() ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14.5px] font-semibold text-[var(--color-text)] tracking-tight truncate">
            {contract.client?.name ?? 'Cliente eliminado'}
          </p>
          <Badge variant={STATUS_BADGE[contract.status]} dot pulse={contract.status === 'ACTIVE'}>
            {STATUS_LABEL[contract.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge variant={TIER_BADGE[contract.tier]} size="sm">{TIER_LABEL[contract.tier]}</Badge>
          <Badge variant={BILLING_BADGE[contract.billingMode]} size="sm">{BILLING_LABEL[contract.billingMode]}</Badge>
          <span className="text-[11.5px] text-[var(--color-text-tertiary)] tabular-nums">
            desde {fmtDate(contract.startedAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-[15px] font-semibold text-[var(--color-text)] tabular-nums leading-tight">
            {fmtCurrency(price, 2)}
          </p>
          {isRecurring && (
            <p className="text-[10.5px] text-[var(--color-text-tertiary)] uppercase tracking-wide">/ mes</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" strokeWidth={2} />
      </div>
    </Card>
  );
}

// Marcador de uso para evitar warning si se importan helpers desde fuera:
void FileText;
