// ============================================================================
// FixedCostsPage.tsx — CRUD de costes fijos
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { Plus, Receipt, Trash2, Pencil, AlertCircle, RefreshCw, Download, Search } from 'lucide-react';
import clsx from 'clsx';
import { api }       from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { fmt, fmtCurrency, toNum } from '@/lib/format';
import type { FixedCost, CostFrequency } from '@/types';
import Card             from '@/components/ui/Card';
import Badge            from '@/components/ui/Badge';
import Button           from '@/components/ui/Button';
import Modal            from '@/components/ui/Modal';
import Input            from '@/components/ui/Input';
import Select           from '@/components/ui/Select';
import Toggle           from '@/components/ui/Toggle';
import SegmentedControl from '@/components/ui/SegmentedControl';
import DemoBadge        from '@/components/ui/DemoBadge';
import { useToast }     from '@/components/ui/Toast';
import { useConfirm }   from '@/components/ui/ConfirmDialog';
import { useAuth }      from '@/context/AuthContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeMonthly(amount: number, freq: CostFrequency) {
  if (freq === 'QUARTERLY') return amount / 3;
  if (freq === 'YEARLY')    return amount / 12;
  return amount;
}

const FREQ_LABEL: Record<CostFrequency, string>  = { MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', YEARLY: 'Anual' };
const FREQ_BADGE: Record<CostFrequency, 'blue' | 'purple' | 'orange'> = { MONTHLY: 'blue', QUARTERLY: 'purple', YEARLY: 'orange' };
const FREQ_OPTIONS = Object.entries(FREQ_LABEL).map(([value, label]) => ({ value, label }));

type Filter = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface FormState {
  name:         string;
  amount:       string;
  frequency:    CostFrequency;
  category:     string;
  isActive:     boolean;
  isInvestment: boolean;
}

const EMPTY_FORM: FormState = {
  name: '', amount: '', frequency: 'MONTHLY', category: '',
  isActive: true, isInvestment: false,
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function FixedCostsPage() {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const { tenant }  = useAuth();
  const [costs,    setCosts]    = useState<FixedCost[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [searchQ,  setSearchQ]  = useState('');
  const [showFilter, setShowFilter] = useState<Filter>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FixedCost | null>(null);
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    api.get<FixedCost[]>('/v1/fixed-costs')
      .then(setCosts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Apertura automática desde Command Palette (⌘K → "Nuevo coste fijo")
  useEffect(() => {
    if (sessionStorage.getItem('hp_cmd_action') === 'new-fixed') {
      sessionStorage.removeItem('hp_cmd_action');
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount   = costs.filter((c) =>  c.isActive).length;
  const inactiveCount = costs.filter((c) => !c.isActive).length;

  const filteredCosts = costs.filter((c) => {
    if (showFilter === 'ACTIVE' && !c.isActive) return false;
    if (showFilter === 'INACTIVE' && c.isActive) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !(c.category ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalMonthly = costs
    .filter((c) => c.isActive)
    .reduce((sum, c) => sum + normalizeMonthly(toNum(c.amount), c.frequency), 0);
  const totalYearly = totalMonthly * 12;

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(c: FixedCost) {
    setEditTarget(c);
    setForm({
      name:         c.name,
      amount:       c.amount,
      frequency:    c.frequency,
      category:     c.category ?? '',
      isActive:     c.isActive,
      isInvestment: c.isInvestment ?? false,
    });
    setFormError('');
    setModalOpen(true);
  }

  function handleField(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFormError('');
    };
  }

  async function handleSave() {
    if (!form.name.trim() || !form.amount) { setFormError('Nombre e importe son obligatorios'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name:         form.name.trim(),
        amount:       parseFloat(form.amount),
        frequency:    form.frequency,
        category:     form.category.trim() || null,
        isActive:     form.isActive,
        isInvestment: form.isInvestment,
      };
      if (editTarget) {
        await api.patch(`/v1/fixed-costs/${editTarget.id}`, payload);
        toast('success', 'Coste fijo actualizado');
      } else {
        await api.post('/v1/fixed-costs', payload);
        toast('success', 'Coste fijo creado');
      }
      setModalOpen(false);
      load(true);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title:       'Eliminar coste fijo',
      message:     'Este coste fijo se eliminará permanentemente del cálculo de rentabilidad.',
      confirmText: 'Eliminar',
      variant:     'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/v1/fixed-costs/${id}`);
      toast('success', 'Coste fijo eliminado');
      load(true);
    } catch {
      toast('error', 'Error al eliminar el coste fijo');
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[800px] mx-auto">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="skeleton h-24 rounded-[16px] mb-6" />
        <div className="space-y-3">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-16 rounded-[12px]" />)}
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
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[800px] mx-auto">

      {/* Header */}
      <header className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--color-text)] tracking-[-0.02em]">Costes fijos</h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
            {costs.length} coste{costs.length !== 1 ? 's' : ''}
            {activeCount > 0 && <span className="ml-1">· {activeCount} activo{activeCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {costs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="w-4 h-4" strokeWidth={2} />}
              onClick={() => {
                const prefix = tenant?.name ? `${tenant.name.toLowerCase().replace(/\s+/g, '-')}-` : '';
                exportCsv(`${prefix}costes-fijos-horaspro`, [
                  { header: 'Nombre',     value: (c: FixedCost) => c.name },
                  { header: 'Importe',    value: (c: FixedCost) => c.amount },
                  { header: 'Frecuencia', value: (c: FixedCost) => FREQ_LABEL[c.frequency] },
                  { header: 'Categoría',  value: (c: FixedCost) => c.category ?? '' },
                  { header: 'Activo',     value: (c: FixedCost) => c.isActive ? 'Sí' : 'No' },
                ], filteredCosts);
                toast('success', `${filteredCosts.length} costes exportados`);
              }}
            >
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
          <Button variant="primary" icon={<Plus className="w-4 h-4" strokeWidth={2.5} />} onClick={openCreate}>
            Nuevo coste
          </Button>
        </div>
      </header>

      {/* Resumen mensual */}
      <div
        className="relative overflow-hidden rounded-[20px] mb-6 animate-fade-up p-5 sm:p-6"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,159,10,0.10) 0%, rgba(255,69,58,0.08) 60%, rgba(191,90,242,0.06) 100%)',
          border: '1px solid var(--color-border-subtle)',
          boxShadow: 'var(--shadow-card)',
          animationDelay: '50ms',
          animationFillMode: 'both',
        } as React.CSSProperties}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full blur-3xl opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(255,159,10,0.35) 0%, transparent 70%)' }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.08em]">
              Total activo · mes
            </p>
            <p className="text-[40px] sm:text-[44px] font-semibold text-[var(--color-text)] tabular-nums mt-1 leading-none tracking-[-0.02em]">
              {fmt(totalMonthly)} €
            </p>
            <p className="text-[12.5px] text-[var(--color-text-tertiary)] mt-2 tabular-nums">
              ≈ {fmtCurrency(totalYearly)} al año
            </p>
          </div>
          <div
            className="w-14 h-14 rounded-[16px] flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(180deg, rgba(255,159,10,0.18) 0%, rgba(255,69,58,0.12) 100%)',
              border: '1px solid rgba(255,159,10,0.20)',
            }}
          >
            <Receipt className="w-6 h-6 text-[var(--color-orange)]" strokeWidth={1.7} />
          </div>
        </div>
      </div>

      {/* Búsqueda y filtro */}
      {costs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 animate-fade-up" style={{ animationDelay: '80ms', animationFillMode: 'both' } as React.CSSProperties}>
          <div className="relative sm:flex-1 sm:max-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" strokeWidth={1.8} />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Buscar coste..."
              className="w-full pl-9 pr-3 py-2 text-[13px] text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border-medium)] rounded-[10px] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-blue)] focus:ring-[3px] focus:ring-[rgba(10,132,255,0.20)] transition-all"
            />
          </div>
          <SegmentedControl<Filter>
            value={showFilter}
            onChange={setShowFilter}
            size="sm"
            options={[
              { value: 'ALL',      label: 'Todos',     count: costs.length },
              { value: 'ACTIVE',   label: 'Activos',   count: activeCount },
              { value: 'INACTIVE', label: 'Inactivos', count: inactiveCount },
            ]}
          />
        </div>
      )}

      {/* Lista */}
      {costs.length === 0 ? (
        <EmptyCosts onNew={openCreate} />
      ) : filteredCosts.length === 0 ? (
        <Card padding="md" className="text-center py-8">
          <p className="text-[14px] text-[var(--color-text-secondary)]">No hay costes con los filtros seleccionados</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCosts.map((cost, i) => (
            <CostRow
              key={cost.id}
              cost={cost}
              index={i}
              onEdit={() => openEdit(cost)}
              onDelete={() => handleDelete(cost.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar coste fijo' : 'Nuevo coste fijo'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editTarget ? 'Guardar cambios' : 'Crear coste'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nombre *"
            type="text"
            value={form.name}
            onChange={handleField('name')}
            placeholder="Ej: Adobe Creative Cloud"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Importe *"
              type="number"
              value={form.amount}
              onChange={handleField('amount')}
              min="0"
              step="0.01"
              prefix="€"
            />
            <Select
              label="Frecuencia"
              value={form.frequency}
              onChange={handleField('frequency')}
              options={FREQ_OPTIONS}
            />
          </div>
          {form.amount && form.frequency !== 'MONTHLY' && (
            <div className="px-3 py-2 rounded-[10px] bg-[var(--color-blue-subtle)] border border-[rgba(10,132,255,0.15)]">
              <p className="text-[12px] text-[var(--color-blue)] tabular-nums">
                Equivale a <strong>{fmtCurrency(normalizeMonthly(toNum(form.amount), form.frequency))}</strong> al mes
              </p>
            </div>
          )}
          <Input
            label="Categoría"
            type="text"
            value={form.category}
            onChange={handleField('category')}
            placeholder="Ej: Software, Oficina, Personal..."
          />
          <div className="flex items-center gap-3 px-1 pt-1">
            <Toggle
              checked={form.isActive}
              onChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))}
            />
            <span className="text-[13.5px] text-[var(--color-text)]">Activo (incluido en el cálculo)</span>
          </div>
          <div className="flex items-start gap-3 px-1">
            <Toggle
              checked={form.isInvestment}
              onChange={(v) => setForm((prev) => ({ ...prev, isInvestment: v }))}
            />
            <div>
              <p className="text-[13.5px] text-[var(--color-text)]">Bien de inversión</p>
              <p className="text-[11.5px] text-[var(--color-text-tertiary)] leading-snug">
                Ordenador, mobiliario, vehículo… Su IVA va a las casillas 30/31 del modelo 303.
              </p>
            </div>
          </div>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.18)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
              <p className="text-[13px] text-[var(--color-red)]">{formError}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function CostRow({ cost, index, onEdit, onDelete }: {
  cost:     FixedCost;
  index:    number;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const monthly = normalizeMonthly(toNum(cost.amount), cost.frequency);
  return (
    <div
      className={clsx(
        'group flex items-center gap-3 rounded-[14px] px-4 py-3',
        'bg-[var(--color-surface)] border border-[var(--color-border-subtle)]',
        'hover:border-[var(--color-border-medium)] transition-all duration-150',
        'animate-fade-up',
        !cost.isActive && 'opacity-55',
      )}
      style={{ animationDelay: `${Math.min(index * 35, 240)}ms`, animationFillMode: 'both' } as React.CSSProperties}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-semibold text-[var(--color-text)]">{cost.name}</span>
          <Badge variant={FREQ_BADGE[cost.frequency]} size="sm">{FREQ_LABEL[cost.frequency]}</Badge>
          {cost.category && (
            <Badge variant="gray" size="sm">{cost.category}</Badge>
          )}
          {cost.isInvestment && <Badge variant="purple" size="sm">Inversión</Badge>}
          {!cost.isActive && <Badge variant="gray" size="sm">Inactivo</Badge>}
          <DemoBadge show={cost.isDemo} />
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[14px] font-semibold text-[var(--color-text)] tabular-nums">
          {fmtCurrency(toNum(cost.amount))}
        </p>
        {cost.frequency !== 'MONTHLY' && (
          <p className="text-[11px] text-[var(--color-text-tertiary)] tabular-nums">
            ≈ {fmtCurrency(monthly)}/mes
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={onEdit}
          aria-label="Editar"
          className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:text-[var(--color-blue)] hover:bg-[var(--color-blue-subtle)] transition-colors duration-150"
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Eliminar"
          className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-subtle)] transition-colors duration-150"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

function EmptyCosts({ onNew }: { onNew: () => void }) {
  const examples = [
    { name: 'Alquiler de oficina', amount: 450, freq: 'mes' },
    { name: 'Adobe Creative Cloud', amount: 60, freq: 'mes' },
    { name: 'Gestoría',             amount: 90, freq: 'mes' },
    { name: 'Seguro responsabilidad civil', amount: 250, freq: 'año' },
  ];
  return (
    <Card padding="lg" className="flex flex-col items-center py-10 text-center">
      <div
        className="relative w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{
          background: 'linear-gradient(180deg, rgba(255,159,10,0.14) 0%, rgba(255,69,58,0.10) 100%)',
          border: '1px solid rgba(255,159,10,0.18)',
        }}
      >
        <Receipt className="w-7 h-7 text-[var(--color-orange)]" strokeWidth={1.6} />
      </div>
      <p className="text-[18px] font-semibold text-[var(--color-text)] tracking-tight">
        Empieza por aquí: tus costes fijos
      </p>
      <p className="text-[14px] text-[var(--color-text-secondary)] mt-1.5 max-w-[420px] leading-relaxed">
        Sin esto, el dashboard no puede calcular tu coste real por hora. No tiene
        por qué ser exacto: una aproximación es 100 veces mejor que dejarlo vacío.
      </p>

      {/* Ejemplos clicables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-[420px] w-full">
        {examples.map((e) => (
          <div
            key={e.name}
            className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-[var(--color-surface-alt)] border border-[var(--color-border-subtle)]"
          >
            <span className="text-[12.5px] text-[var(--color-text-secondary)] truncate">{e.name}</span>
            <span className="text-[12px] font-semibold text-[var(--color-text)] tabular-nums shrink-0 ml-2">
              {e.amount}€/{e.freq}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-6">
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onNew}>
          Añadir mi primer coste
        </Button>
        <a
          href="/ayuda?a=primeros-pasos"
          className="text-[12.5px] font-semibold text-[var(--color-blue)] hover:underline"
        >
          ¿Por dónde empiezo?
        </a>
      </div>
    </Card>
  );
}
