// ============================================================================
// PlansPage.tsx — CRUD del catálogo de Planes
// ============================================================================
// El Plan es una plantilla reutilizable: cuando creas un Contract para un
// cliente, eliges un Plan y todos sus campos (precio, tarifa, IVA, modo de
// mantenimiento) se autorrellenan en el contrato. Cualquier cliente puede
// sobreescribir cualquier campo a nivel Contract.
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Sparkles, AlertCircle, RefreshCw,
  MoreHorizontal, Pencil, Archive, Trash2, RotateCcw,
  ChevronDown, X as XIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { api }   from '@/lib/api';
import { fmt }   from '@/lib/format';
import type { Plan, ContractTier, MaintenanceMode, BillingMode } from '@/types';
import Card             from '@/components/ui/Card';
import Badge            from '@/components/ui/Badge';
import Button           from '@/components/ui/Button';
import Modal            from '@/components/ui/Modal';
import Input            from '@/components/ui/Input';
import Select           from '@/components/ui/Select';
import Textarea         from '@/components/ui/Textarea';
import Toggle           from '@/components/ui/Toggle';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useToast }     from '@/components/ui/Toast';
import { useConfirm }   from '@/components/ui/ConfirmDialog';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const TIER_LABEL: Record<ContractTier, string> = {
  FREE: 'Básico',
  PRO:  'Pro',
  MAX:  'Élite',
};

const TIER_BADGE: Record<ContractTier, 'gray' | 'blue' | 'purple'> = {
  FREE: 'gray',
  PRO:  'blue',
  MAX:  'purple',
};

const TIER_OPTIONS = [
  { value: 'FREE', label: TIER_LABEL.FREE },
  { value: 'PRO',  label: TIER_LABEL.PRO  },
  { value: 'MAX',  label: TIER_LABEL.MAX  },
];

const BILLING_LABEL: Record<BillingMode, string> = {
  FIXED:        'Cerrado',
  HOURLY:       'Por horas',
  HYBRID:       'Mixto',
  SUBSCRIPTION: 'Suscripción',
};

const BILLING_OPTIONS = [
  { value: 'SUBSCRIPTION', label: BILLING_LABEL.SUBSCRIPTION },
  { value: 'FIXED',        label: BILLING_LABEL.FIXED },
  { value: 'HOURLY',       label: BILLING_LABEL.HOURLY },
  { value: 'HYBRID',       label: BILLING_LABEL.HYBRID },
];

const MAINT_LABEL: Record<MaintenanceMode, string> = {
  NONE:   'Sin mantenimiento',
  SHARED: 'Compartido entre contratos',
  CUSTOM: 'Cuota fija propia',
};

const MAINT_OPTIONS = [
  { value: 'NONE',   label: MAINT_LABEL.NONE   },
  { value: 'SHARED', label: MAINT_LABEL.SHARED },
  { value: 'CUSTOM', label: MAINT_LABEL.CUSTOM },
];

type Filter = 'ACTIVE' | 'ARCHIVED' | 'ALL';

// ---------------------------------------------------------------------------
// Estado del formulario
// ---------------------------------------------------------------------------

interface PlanFormState {
  name:                string;
  tier:                ContractTier;
  description:         string;
  billingMode:         BillingMode;
  price:               string;
  priceIncludesVat:    boolean;
  vatRate:             string;
  setupFee:            string;
  hourlyRate:          string;
  partsMarkupPct:      string;
  maintenanceMode:     MaintenanceMode;
  maintenanceExtraPct: string;
  features:            string[];
  limitsJson:          string;
  isActive:            boolean;
}

const EMPTY_FORM: PlanFormState = {
  name: '', tier: 'FREE', description: '',
  billingMode: 'SUBSCRIPTION',
  price: '', priceIncludesVat: false, vatRate: '21',
  setupFee: '', hourlyRate: '', partsMarkupPct: '',
  maintenanceMode: 'NONE', maintenanceExtraPct: '',
  features: [],
  limitsJson: '{}',
  isActive: true,
};

function planToForm(p: Plan): PlanFormState {
  return {
    name:                p.name,
    tier:                p.tier,
    description:         p.description ?? '',
    billingMode:         p.billingMode,
    price:               p.price ?? '',
    priceIncludesVat:    p.priceIncludesVat,
    vatRate:             p.vatRate ?? '21',
    setupFee:            p.setupFee ?? '',
    hourlyRate:          p.hourlyRate ?? '',
    partsMarkupPct:      p.partsMarkupPct ?? '',
    maintenanceMode:     p.maintenanceMode,
    maintenanceExtraPct: p.maintenanceExtraPct ?? '',
    features:            Array.isArray(p.features) ? p.features : [],
    limitsJson:          JSON.stringify(p.limits ?? {}, null, 2),
    isActive:            p.isActive,
  };
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function PlansPage() {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const [plans,   setPlans]   = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState<Filter>('ACTIVE');

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [form,       setForm]       = useState<PlanFormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    api.get<Plan[]>('/v1/plans')
      .then(setPlans)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(p: Plan) {
    setEditTarget(p);
    setForm(planToForm(p));
    setFormError('');
    setModalOpen(true);
    setMenuOpen(null);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('El nombre del plan es obligatorio'); return; }
    if (!form.price.trim() || parseFloat(form.price) < 0) {
      setFormError('El precio es obligatorio y no puede ser negativo'); return;
    }

    let limits: Record<string, unknown> = {};
    try {
      limits = form.limitsJson.trim() ? JSON.parse(form.limitsJson) : {};
      if (typeof limits !== 'object' || Array.isArray(limits)) {
        throw new Error('Debe ser un objeto JSON');
      }
    } catch {
      setFormError('El campo "Límites" debe ser JSON válido (un objeto). Déjalo en {} si no lo usas.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name:                form.name.trim(),
        tier:                form.tier,
        description:         form.description.trim() || null,
        billingMode:         form.billingMode,
        price:               parseFloat(form.price),
        priceIncludesVat:    form.priceIncludesVat,
        vatRate:             form.vatRate ? parseFloat(form.vatRate) : 21,
        setupFee:            form.setupFee   ? parseFloat(form.setupFee)   : null,
        hourlyRate:          form.hourlyRate ? parseFloat(form.hourlyRate) : null,
        partsMarkupPct:      form.partsMarkupPct ? parseFloat(form.partsMarkupPct) : null,
        maintenanceMode:     form.maintenanceMode,
        maintenanceExtraPct: form.maintenanceExtraPct ? parseFloat(form.maintenanceExtraPct) : null,
        features:            form.features,
        limits,
        isActive:            form.isActive,
      };
      if (editTarget) {
        await api.patch<Plan>(`/v1/plans/${editTarget.id}`, payload);
        toast('success', 'Plan actualizado');
      } else {
        await api.post<Plan>('/v1/plans', payload);
        toast('success', 'Plan creado');
      }
      setModalOpen(false);
      load(true);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(p: Plan) {
    setMenuOpen(null);
    const ok = await confirm({
      title:       `Archivar "${p.name}"`,
      message:     'El plan dejará de aparecer al crear contratos nuevos. Los contratos que ya lo usan no se ven afectados. Puedes reactivarlo en cualquier momento.',
      confirmText: 'Archivar',
      variant:     'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/v1/plans/${p.id}`);
      toast('success', 'Plan archivado');
      load(true);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al archivar');
    }
  }

  async function handleReactivate(p: Plan) {
    setMenuOpen(null);
    try {
      await api.patch<Plan>(`/v1/plans/${p.id}`, { isActive: true });
      toast('success', 'Plan reactivado');
      load(true);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al reactivar');
    }
  }

  async function handleHardDelete(p: Plan) {
    setMenuOpen(null);
    if ((p._count?.contracts ?? 0) > 0) {
      await confirm({
        title:       'No se puede eliminar definitivamente',
        message:     `"${p.name}" tiene ${p._count?.contracts} contrato(s) asociado(s). Solo puedes archivarlo. Si quieres eliminarlo del todo, primero migra esos contratos a otro plan.`,
        confirmText: 'Entendido',
        variant:     'danger',
      });
      return;
    }
    const ok = await confirm({
      title:       `Eliminar "${p.name}" definitivamente`,
      message:     'Esta acción no se puede deshacer. El plan se borra de la base de datos.',
      confirmText: 'Eliminar definitivamente',
      variant:     'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/v1/plans/${p.id}?hard=true`);
      toast('success', 'Plan eliminado');
      load(true);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  const counts = {
    ACTIVE:   plans.filter((p) => p.isActive).length,
    ARCHIVED: plans.filter((p) => !p.isActive).length,
    ALL:      plans.length,
  };
  const visible = plans.filter((p) => {
    if (filter === 'ACTIVE')   return p.isActive;
    if (filter === 'ARCHIVED') return !p.isActive;
    return true;
  });

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-48 rounded-[16px]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full bg-[var(--color-red-subtle)] flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-[var(--color-red)]" strokeWidth={1.8} />
        </div>
        <p className="text-[16px] font-semibold text-[var(--color-text)]">Error al cargar el catálogo</p>
        <p className="text-[14px] text-[var(--color-text-secondary)]">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => load()} icon={<RefreshCw className="w-4 h-4" />}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto">
      <header className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--color-text)] tracking-tight">Catálogo de planes</h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
            Plantillas reutilizables. Al crear un contrato eliges un plan y se autorrellenan precio, IVA, modo de cobro y mantenimiento.
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" strokeWidth={2.4} />} onClick={openCreate}>
          Nuevo plan
        </Button>
      </header>

      <div className="mb-6 animate-fade-up stagger-1">
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ACTIVE',   label: 'Activos',     count: counts.ACTIVE   },
            { value: 'ARCHIVED', label: 'Archivados',  count: counts.ARCHIVED },
            { value: 'ALL',      label: 'Todos',       count: counts.ALL      },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyPlans onNew={openCreate} hasAny={plans.length > 0} filter={filter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((p, i) => (
            <PlanCard
              key={p.id}
              plan={p}
              index={i}
              menuOpen={menuOpen === p.id}
              onMenuToggle={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
              onEdit={() => openEdit(p)}
              onArchive={() => handleArchive(p)}
              onReactivate={() => handleReactivate(p)}
              onDelete={() => handleHardDelete(p)}
            />
          ))}
        </div>
      )}

      <PlanFormModal
        open={modalOpen}
        editTarget={editTarget}
        form={form}
        setForm={setForm}
        formError={formError}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanCard
// ---------------------------------------------------------------------------

function PlanCard({
  plan, index, menuOpen, onMenuToggle, onEdit, onArchive, onReactivate, onDelete,
}: {
  plan:         Plan;
  index:        number;
  menuOpen:     boolean;
  onMenuToggle: (e: React.MouseEvent) => void;
  onEdit:       () => void;
  onArchive:    () => void;
  onReactivate: () => void;
  onDelete:     () => void;
}) {
  const price = parseFloat(plan.price ?? '0');
  const contractCount = plan._count?.contracts ?? 0;

  return (
    <Card
      padding="md"
      className={clsx(
        'animate-fade-up relative',
        !plan.isActive && 'opacity-65',
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' } as React.CSSProperties}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={TIER_BADGE[plan.tier]} dot>{TIER_LABEL[plan.tier]}</Badge>
            <Badge variant="gray" size="sm">{BILLING_LABEL[plan.billingMode]}</Badge>
            {!plan.isActive && <Badge variant="orange" size="sm">Archivado</Badge>}
          </div>
          <h3 className="text-[16px] font-semibold text-[var(--color-text)] mt-1.5 leading-tight tracking-tight">
            {plan.name}
          </h3>
          {plan.description && (
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-1 line-clamp-2 leading-relaxed">
              {plan.description}
            </p>
          )}
        </div>

        <div className="relative">
          <button
            onClick={onMenuToggle}
            className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--color-text)] transition-colors duration-150"
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-20 w-44 bg-[var(--color-surface)] rounded-[12px] border border-[var(--color-border-medium)] py-1.5"
              style={{ boxShadow: 'var(--shadow-floating)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuBtn icon={<Pencil   className="w-3.5 h-3.5" />} label="Editar"           onClick={onEdit} />
              {plan.isActive ? (
                <MenuBtn icon={<Archive  className="w-3.5 h-3.5" />} label="Archivar"        onClick={onArchive} />
              ) : (
                <MenuBtn icon={<RotateCcw className="w-3.5 h-3.5" />} label="Reactivar"      onClick={onReactivate} />
              )}
              <MenuBtn icon={<Trash2   className="w-3.5 h-3.5" />} label="Eliminar"         onClick={onDelete} danger />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between border-t border-[var(--color-border)] pt-3 mt-2">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] font-semibold">
            {plan.billingMode === 'SUBSCRIPTION' ? 'Cuota mensual' : 'Precio'}
          </p>
          <p className="text-[20px] font-semibold text-[var(--color-text)] tabular-nums mt-0.5 leading-none">
            {fmt(price, price % 1 === 0 ? 0 : 2)} €
            <span className="text-[12px] font-normal text-[var(--color-text-tertiary)] ml-1">
              {plan.priceIncludesVat ? 'IVA incl.' : `+ ${fmt(parseFloat(plan.vatRate), 0)}% IVA`}
            </span>
          </p>
        </div>
        <span className="text-[11.5px] text-[var(--color-text-tertiary)] font-medium">
          {contractCount} contrato{contractCount !== 1 ? 's' : ''}
        </span>
      </div>

      {plan.features.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {plan.features.slice(0, 4).map((f, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-blue-subtle)] text-[var(--color-blue)] font-medium"
            >
              {f}
            </span>
          ))}
          {plan.features.length > 4 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-border)] text-[var(--color-text-tertiary)] font-medium">
              +{plan.features.length - 4}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

function MenuBtn({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={clsx(
        'w-full flex items-center gap-2 px-3 py-1.5 text-[13px]',
        'transition-colors duration-100',
        danger
          ? 'text-[var(--color-red)] hover:bg-[var(--color-red-subtle)]'
          : 'text-[var(--color-text)] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// PlanFormModal — formulario completo en secciones
// ---------------------------------------------------------------------------

function PlanFormModal({
  open, editTarget, form, setForm, formError, saving, onClose, onSave,
}: {
  open:       boolean;
  editTarget: Plan | null;
  form:       PlanFormState;
  setForm:    React.Dispatch<React.SetStateAction<PlanFormState>>;
  formError:  string;
  saving:     boolean;
  onClose:    () => void;
  onSave:     () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function set<K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editTarget ? 'Editar plan' : 'Nuevo plan'}
      subtitle={editTarget ? editTarget.name : 'Plantilla de tarifa que reutilizarás en futuros contratos'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={onSave}>
            {editTarget ? 'Guardar cambios' : 'Crear plan'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Sección 1: Identidad */}
        <FormSection title="Identidad">
          <Input
            label="Nombre del plan *"
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: Mantenimiento web mensual"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Nivel"
              value={form.tier}
              onChange={(e) => set('tier', e.target.value as ContractTier)}
              options={TIER_OPTIONS}
            />
            <Select
              label="Estado"
              value={form.isActive ? 'active' : 'archived'}
              onChange={(e) => set('isActive', e.target.value === 'active')}
              options={[
                { value: 'active',   label: 'Activo'    },
                { value: 'archived', label: 'Archivado' },
              ]}
            />
          </div>
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Qué incluye este plan, a quién va dirigido…"
          />
        </FormSection>

        {/* Sección 2: Cobro */}
        <FormSection title="Cómo se cobra">
          <Select
            label="Modo de facturación"
            value={form.billingMode}
            onChange={(e) => set('billingMode', e.target.value as BillingMode)}
            options={BILLING_OPTIONS}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={form.billingMode === 'SUBSCRIPTION' ? 'Cuota *' : 'Precio *'}
              type="number"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              prefix="€"
              min="0"
              step="0.01"
            />
            <Input
              label="IVA"
              type="number"
              value={form.vatRate}
              onChange={(e) => set('vatRate', e.target.value)}
              suffix="%"
              min="0"
              max="100"
            />
          </div>
          <Toggle
            checked={form.priceIncludesVat}
            onChange={(v) => set('priceIncludesVat', v)}
            label="El precio ya incluye IVA"
          />

          {(form.billingMode === 'FIXED' || form.billingMode === 'HYBRID' || form.billingMode === 'SUBSCRIPTION') && (
            <Input
              label="Cuota de alta (setup)"
              type="number"
              value={form.setupFee}
              onChange={(e) => set('setupFee', e.target.value)}
              prefix="€"
              min="0"
              hint="Opcional. Cobrado una sola vez al iniciar el contrato."
            />
          )}
          {(form.billingMode === 'HOURLY' || form.billingMode === 'HYBRID') && (
            <Input
              label="Tarifa por hora"
              type="number"
              value={form.hourlyRate}
              onChange={(e) => set('hourlyRate', e.target.value)}
              prefix="€"
              min="0"
              step="0.5"
            />
          )}
          <Input
            label="Margen sobre piezas/materiales"
            type="number"
            value={form.partsMarkupPct}
            onChange={(e) => set('partsMarkupPct', e.target.value)}
            suffix="%"
            min="0"
            hint="Markup que añadirás al cliente sobre el coste real de las piezas."
          />
        </FormSection>

        {/* Sección 3: Mantenimiento (solo si SUBSCRIPTION) */}
        {form.billingMode === 'SUBSCRIPTION' && (
          <FormSection title="Mantenimiento">
            <Select
              label="Modo"
              value={form.maintenanceMode}
              onChange={(e) => set('maintenanceMode', e.target.value as MaintenanceMode)}
              options={MAINT_OPTIONS}
            />
            {form.maintenanceMode === 'SHARED' && (
              <Input
                label="Margen sobre el coste compartido"
                type="number"
                value={form.maintenanceExtraPct}
                onChange={(e) => set('maintenanceExtraPct', e.target.value)}
                suffix="%"
                min="0"
                hint="Se aplica encima del coste real del producto repartido entre contratos activos."
              />
            )}
          </FormSection>
        )}

        {/* Sección 4: Características */}
        <FormSection title="Características">
          <FeaturesEditor
            value={form.features}
            onChange={(features) => set('features', features)}
          />
        </FormSection>

        {/* Avanzado: limits JSON */}
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', advancedOpen && 'rotate-180')} strokeWidth={2.2} />
          Avanzado
        </button>
        {advancedOpen && (
          <div className="rounded-[12px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] p-3 space-y-2">
            <p className="text-[11.5px] text-[var(--color-text-tertiary)] leading-relaxed">
              Límites del plan en formato JSON. Se usan para validar reglas a nivel de contrato. Ejemplo: <code className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[10.5px]">{'{ "max_contracts": 5 }'}</code>
            </p>
            <Textarea
              label="Límites (JSON)"
              value={form.limitsJson}
              onChange={(e) => set('limitsJson', e.target.value)}
              rows={4}
              placeholder='{ "max_contracts": 5 }'
            />
          </div>
        )}

        {formError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.20)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
            <p className="text-[13px] text-[#D93025] dark:text-[#FF6961]">{formError}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeaturesEditor — chips editables con input para añadir
// ---------------------------------------------------------------------------

function FeaturesEditor({
  value, onChange,
}: {
  value:    string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) { setDraft(''); return; }
    onChange([...value, trimmed]);
    setDraft('');
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          // Safety net: si el usuario teclea una feature y hace click en
          // "Crear plan" sin pasar antes por "Añadir" o Enter, el blur
          // flushea el draft para que no se pierda en el submit.
          onBlur={() => { if (draft.trim()) add(); }}
          placeholder="Añade una característica y pulsa Enter…"
          className="flex-1 h-10 px-3 text-[13.5px] text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border-medium)] rounded-[11px] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-blue)] focus:ring-[3px] focus:ring-[rgba(10,132,255,0.20)] transition-all"
        />
        <Button variant="secondary" size="sm" onClick={add} disabled={!draft.trim()}>
          Añadir
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-full bg-[var(--color-blue-subtle)] text-[var(--color-blue)] font-medium"
            >
              {f}
              <button
                type="button"
                onClick={() => remove(i)}
                className="hover:bg-[rgba(10,132,255,0.18)] rounded-full p-0.5 transition-colors"
                aria-label={`Eliminar característica ${f}`}
              >
                <XIcon className="w-3 h-3" strokeWidth={2.4} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyPlans({ onNew, hasAny, filter }: { onNew: () => void; hasAny: boolean; filter: Filter }) {
  const isFilteredOut = hasAny && filter !== 'ALL';
  return (
    <Card padding="lg" className="flex flex-col items-center py-14 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-[20px] bg-[var(--color-blue-subtle)] flex items-center justify-center mb-5 animate-float">
        <Sparkles className="w-7 h-7 text-[var(--color-blue)]" strokeWidth={1.6} />
      </div>
      <p className="text-[17px] font-semibold text-[var(--color-text)] tracking-tight mb-1">
        {isFilteredOut
          ? filter === 'ARCHIVED' ? 'Sin planes archivados' : 'Sin planes activos'
          : 'Aún no tienes planes'}
      </p>
      <p className="text-[14px] text-[var(--color-text-secondary)] max-w-[320px] mb-5 leading-relaxed">
        {isFilteredOut
          ? 'Cambia de filtro para ver el resto del catálogo.'
          : 'Crea plantillas reutilizables (Básico, Pro, Élite…) para que cada cliente nuevo herede precio, IVA y modo de cobro automáticamente.'}
      </p>
      <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onNew}>
        Nuevo plan
      </Button>
    </Card>
  );
}
