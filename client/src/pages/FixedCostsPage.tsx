// ============================================================================
// FixedCostsPage.tsx — CRUD de costes fijos
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { Plus, Receipt, Trash2, Pencil, AlertCircle, RefreshCw, Download } from 'lucide-react';
import clsx from 'clsx';
import { api }       from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import type { FixedCost, CostFrequency } from '@/types';
import Card      from '@/components/ui/Card';
import Badge     from '@/components/ui/Badge';
import Button    from '@/components/ui/Button';
import Modal     from '@/components/ui/Modal';
import Input     from '@/components/ui/Input';
import Select    from '@/components/ui/Select';
import Toggle       from '@/components/ui/Toggle';
import { useToast }    from '@/components/ui/Toast';
import { useConfirm }  from '@/components/ui/ConfirmDialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: string | number) { return typeof v === 'number' ? v : parseFloat(v) || 0; }

function normalizeMonthly(amount: number, freq: CostFrequency) {
  if (freq === 'QUARTERLY') return amount / 3;
  if (freq === 'YEARLY')    return amount / 12;
  return amount;
}

const FREQ_LABEL: Record<CostFrequency, string>  = { MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', YEARLY: 'Anual' };
const FREQ_BADGE: Record<CostFrequency, 'blue' | 'purple' | 'orange'> = { MONTHLY: 'blue', QUARTERLY: 'purple', YEARLY: 'orange' };
const FREQ_OPTIONS = Object.entries(FREQ_LABEL).map(([value, label]) => ({ value, label }));

interface FormState {
  name:      string;
  amount:    string;
  frequency: CostFrequency;
  category:  string;
  isActive:  boolean;
}

const EMPTY_FORM: FormState = { name: '', amount: '', frequency: 'MONTHLY', category: '', isActive: true };

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function FixedCostsPage() {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const [costs,    setCosts]    = useState<FixedCost[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FixedCost | null>(null);
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get<FixedCost[]>('/v1/fixed-costs')
      .then(setCosts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalMonthly = costs
    .filter((c) => c.isActive)
    .reduce((sum, c) => sum + normalizeMonthly(toNum(c.amount), c.frequency), 0);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(c: FixedCost) {
    setEditTarget(c);
    setForm({
      name:      c.name,
      amount:    c.amount,
      frequency: c.frequency,
      category:  c.category ?? '',
      isActive:  c.isActive,
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
        name:      form.name.trim(),
        amount:    parseFloat(form.amount),
        frequency: form.frequency,
        category:  form.category.trim() || null,
        isActive:  form.isActive,
      };
      if (editTarget) {
        await api.patch(`/v1/fixed-costs/${editTarget.id}`, payload);
        toast('success', 'Coste fijo actualizado');
      } else {
        await api.post('/v1/fixed-costs', payload);
        toast('success', 'Coste fijo creado');
      }
      setModalOpen(false);
      load();
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
      load();
    } catch {
      toast('error', 'Error al eliminar el coste fijo');
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[800px] mx-auto">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="skeleton h-20 rounded-[16px] mb-6" />
        <div className="space-y-3">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-16 rounded-[12px]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-8 h-8 text-[#FF453A]" strokeWidth={1.5} />
        <p className="text-[15px] font-medium">{error}</p>
        <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCw className="w-4 h-4" />}>
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
          <h1 className="text-[28px] font-semibold text-[#1D1D1F]">Costes fijos</h1>
          <p className="text-[14px] text-[#6E6E73] mt-0.5">{costs.length} coste{costs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {costs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="w-4 h-4" strokeWidth={2} />}
              onClick={() => {
                exportCsv('costes-fijos-horaspro', [
                  { header: 'Nombre',     value: (c: FixedCost) => c.name },
                  { header: 'Importe',    value: (c: FixedCost) => c.amount },
                  { header: 'Frecuencia', value: (c: FixedCost) => FREQ_LABEL[c.frequency] },
                  { header: 'Categoría',  value: (c: FixedCost) => c.category ?? '' },
                  { header: 'Activo',     value: (c: FixedCost) => c.isActive ? 'Sí' : 'No' },
                ], costs);
                toast('success', `${costs.length} costes exportados`);
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
      <Card padding="md" className="mb-6 animate-fade-up" style={{ animationDelay: '50ms', animationFillMode: 'both' } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-[#6E6E73] uppercase tracking-[0.06em]">
              Total costes fijos activos / mes
            </p>
            <p className="text-[32px] font-semibold text-[#1D1D1F] tabular-nums mt-0.5">
              {totalMonthly.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </p>
          </div>
          <div className="w-12 h-12 rounded-[14px] bg-[rgba(255,69,58,0.08)] flex items-center justify-center">
            <Receipt className="w-6 h-6 text-[#FF453A]" strokeWidth={1.5} />
          </div>
        </div>
      </Card>

      {/* Lista */}
      {costs.length === 0 ? (
        <EmptyCosts onNew={openCreate} />
      ) : (
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' } as React.CSSProperties}>
          {costs.map((cost, i) => (
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
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Importe (€) *"
              type="number"
              value={form.amount}
              onChange={handleField('amount')}
              min="0"
            />
            <Select
              label="Frecuencia"
              value={form.frequency}
              onChange={handleField('frequency')}
              options={FREQ_OPTIONS}
            />
          </div>
          <Input
            label="Categoría"
            type="text"
            value={form.category}
            onChange={handleField('category')}
            placeholder="Ej: Software, Oficina, Personal..."
          />
          <div className="flex items-center gap-3 px-1">
            <Toggle
              checked={form.isActive}
              onChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))}
            />
            <span className="text-[14px] text-[#1D1D1F]">Activo (incluido en el cálculo)</span>
          </div>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[rgba(255,69,58,0.08)] border border-[rgba(255,69,58,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A] shrink-0" />
              <p className="text-[13px] text-[#D93025]">{formError}</p>
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
        'flex items-center gap-3 bg-white border border-[rgba(0,0,0,0.06)] rounded-[12px] px-4 py-3',
        'hover:border-[rgba(0,0,0,0.10)] transition-colors duration-150 group',
        !cost.isActive && 'opacity-50',
      )}
      style={{ animationDelay: `${index * 40}ms` } as React.CSSProperties}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-medium text-[#1D1D1F]">{cost.name}</span>
          <Badge variant={FREQ_BADGE[cost.frequency]}>{FREQ_LABEL[cost.frequency]}</Badge>
          {cost.category && (
            <Badge variant="gray">{cost.category}</Badge>
          )}
          {!cost.isActive && <Badge variant="gray">Inactivo</Badge>}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[14px] font-semibold text-[#1D1D1F] tabular-nums">
          {toNum(cost.amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </p>
        {cost.frequency !== 'MONTHLY' && (
          <p className="text-[11px] text-[#86868B]">
            ≈ {monthly.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mes
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-[7px] text-[#86868B] hover:text-[#0A84FF] hover:bg-[rgba(10,132,255,0.08)] transition-colors duration-150"
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-[7px] text-[#86868B] hover:text-[#FF453A] hover:bg-[rgba(255,69,58,0.08)] transition-colors duration-150"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

function EmptyCosts({ onNew }: { onNew: () => void }) {
  return (
    <Card padding="lg" className="flex flex-col items-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-[rgba(255,69,58,0.08)] flex items-center justify-center mb-4">
        <Receipt className="w-6 h-6 text-[#FF453A]" strokeWidth={1.5} />
      </div>
      <p className="text-[16px] font-semibold text-[#1D1D1F]">Sin costes fijos</p>
      <p className="text-[14px] text-[#6E6E73] mt-1 max-w-[260px] mb-5">
        Añade tus gastos recurrentes (software, alquiler, sueldos...) para calcular la rentabilidad real.
      </p>
      <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onNew}>
        Nuevo coste
      </Button>
    </Card>
  );
}
