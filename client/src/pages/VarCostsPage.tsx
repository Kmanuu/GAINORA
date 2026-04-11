// ============================================================================
// VarCostsPage.tsx — CRUD de costes variables
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { Plus, TrendingDown, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { api }    from '@/lib/api';
import type { VarCost, Project } from '@/types';
import Card       from '@/components/ui/Card';
import Badge      from '@/components/ui/Badge';
import Button     from '@/components/ui/Button';
import Modal      from '@/components/ui/Modal';
import Input      from '@/components/ui/Input';
import Select       from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: string | number) { return typeof v === 'number' ? v : parseFloat(v) || 0; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface FormState {
  projectId:  string;
  name:       string;
  amount:     string;
  date:       string;
  category:   string;
}

const EMPTY_FORM: FormState = {
  projectId: '',
  name:      '',
  amount:    '',
  date:      new Date().toISOString().slice(0, 10),
  category:  '',
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function VarCostsPage() {
  const { toast } = useToast();
  const [costs,    setCosts]    = useState<VarCost[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<VarCost[]>('/v1/variable-costs'),
      api.get<Project[]>('/v1/projects'),
    ])
      .then(([c, p]) => {
        setCosts(c);
        setProjects(p);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = costs.reduce((sum, c) => sum + toNum(c.amount), 0);

  function handleField(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFormError('');
    };
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.amount || !form.date) {
      setFormError('Nombre, importe y fecha son obligatorios');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('/v1/variable-costs', {
        projectId: form.projectId || null,
        name:      form.name.trim(),
        amount:    parseFloat(form.amount),
        date:      form.date,
        category:  form.category.trim() || null,
      });
      setModalOpen(false);
      toast('success', 'Coste variable añadido');
      load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este coste variable?')) return;
    try {
      await api.delete(`/v1/variable-costs/${id}`);
      toast('success', 'Coste variable eliminado');
      load();
    } catch {
      toast('error', 'Error al eliminar el coste variable');
    }
  }

  const projectOptions = [
    { value: '', label: 'Sin proyecto (coste general)' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[800px] mx-auto">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="skeleton h-20 rounded-[16px] mb-6" />
        <div className="space-y-3">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-14 rounded-[12px]" />)}
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
          <h1 className="text-[28px] font-semibold text-[#1D1D1F]">Costes variables</h1>
          <p className="text-[14px] text-[#6E6E73] mt-0.5">{costs.length} registro{costs.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" strokeWidth={2.5} />} onClick={openCreate}>
          Añadir coste
        </Button>
      </header>

      {/* Resumen */}
      <Card padding="md" className="mb-6 animate-fade-up" style={{ animationDelay: '50ms', animationFillMode: 'both' } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-[#6E6E73] uppercase tracking-[0.06em]">
              Total costes variables
            </p>
            <p className="text-[32px] font-semibold text-[#1D1D1F] tabular-nums mt-0.5">
              {total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </p>
          </div>
          <div className="w-12 h-12 rounded-[14px] bg-[rgba(191,90,242,0.08)] flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-[#BF5AF2]" strokeWidth={1.5} />
          </div>
        </div>
      </Card>

      {/* Lista */}
      {costs.length === 0 ? (
        <EmptyCosts onNew={openCreate} />
      ) : (
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' } as React.CSSProperties}>
          {costs.map((cost) => (
            <CostRow
              key={cost.id}
              cost={cost}
              onDelete={() => handleDelete(cost.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Añadir coste variable"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>Guardar</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nombre del coste *"
            type="text"
            value={form.name}
            onChange={handleField('name')}
          />
          <Select
            label="Proyecto asociado"
            value={form.projectId}
            onChange={handleField('projectId')}
            options={projectOptions}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Importe (€) *"
              type="number"
              value={form.amount}
              onChange={handleField('amount')}
              min="0"
            />
            <Input
              label="Fecha *"
              type="date"
              value={form.date}
              onChange={handleField('date')}
            />
          </div>
          <Input
            label="Categoría"
            type="text"
            value={form.category}
            onChange={handleField('category')}
            placeholder="Ej: Herramientas, Subcontratación..."
          />
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

function CostRow({ cost, onDelete }: { cost: VarCost; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[rgba(0,0,0,0.06)] rounded-[12px] px-4 py-3 hover:border-[rgba(0,0,0,0.10)] transition-colors duration-150 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-medium text-[#1D1D1F]">{cost.name}</span>
          {cost.project && <Badge variant="blue">{cost.project.name}</Badge>}
          {cost.category && <Badge variant="gray">{cost.category}</Badge>}
        </div>
        <p className="text-[11px] text-[#86868B] mt-0.5">{fmtDate(cost.date)}</p>
      </div>

      <span className="text-[14px] font-semibold text-[#1D1D1F] tabular-nums shrink-0">
        {toNum(cost.amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </span>

      <button
        onClick={onDelete}
        className="p-1.5 rounded-[7px] text-[#C7C7CC] hover:text-[#FF453A] hover:bg-[rgba(255,69,58,0.08)] opacity-0 group-hover:opacity-100 transition-all duration-150"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
}

function EmptyCosts({ onNew }: { onNew: () => void }) {
  return (
    <Card padding="lg" className="flex flex-col items-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-[rgba(191,90,242,0.08)] flex items-center justify-center mb-4">
        <TrendingDown className="w-6 h-6 text-[#BF5AF2]" strokeWidth={1.5} />
      </div>
      <p className="text-[16px] font-semibold text-[#1D1D1F]">Sin costes variables</p>
      <p className="text-[14px] text-[#6E6E73] mt-1 max-w-[260px] mb-5">
        Registra gastos específicos asociados a proyectos concretos.
      </p>
      <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onNew}>
        Añadir coste
      </Button>
    </Card>
  );
}
