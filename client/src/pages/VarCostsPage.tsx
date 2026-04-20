// ============================================================================
// VarCostsPage.tsx — CRUD de costes variables
// ============================================================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, TrendingDown, Trash2, Pencil, AlertCircle, RefreshCw, Download, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { api }       from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { fmt, fmtCurrency, fmtDate, toNum } from '@/lib/format';
import { partBreakdown } from '@/lib/profitability';
import type { VarCost, Project } from '@/types';
import Card       from '@/components/ui/Card';
import Badge      from '@/components/ui/Badge';
import Button     from '@/components/ui/Button';
import Modal      from '@/components/ui/Modal';
import Input      from '@/components/ui/Input';
import Select     from '@/components/ui/Select';
import Toggle     from '@/components/ui/Toggle';
import DatePicker from '@/components/ui/DatePicker';
import { useToast }    from '@/components/ui/Toast';
import { useConfirm }  from '@/components/ui/ConfirmDialog';
import { useAuth }     from '@/context/AuthContext';

// ---------------------------------------------------------------------------
// Tipos del form
// ---------------------------------------------------------------------------

interface FormState {
  projectId:        string;
  name:             string;
  amount:           string;
  quantity:         string;
  priceIncludesVat: boolean;
  vatRate:          string;
  markupPct:        string;
  date:             string;
  category:         string;
}

const EMPTY_FORM: FormState = {
  projectId:        '',
  name:             '',
  amount:           '',
  quantity:         '1',
  priceIncludesVat: false,
  vatRate:          '21',
  markupPct:        '',
  date:             new Date().toISOString().slice(0, 10),
  category:         '',
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function VarCostsPage() {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const { tenant }  = useAuth();
  const [costs,    setCosts]    = useState<VarCost[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<VarCost | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');
  const [searchQ,    setSearchQ]    = useState('');
  const [filterProj, setFilterProj] = useState('');

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
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

  // Apertura automática desde Command Palette (⌘K → "Nuevo coste variable")
  useEffect(() => {
    if (sessionStorage.getItem('hp_cmd_action') === 'new-var') {
      sessionStorage.removeItem('hp_cmd_action');
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total      = costs.reduce((sum, c) => sum + toNum(c.amount), 0);
  const totalMonth = useMemo(() => {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return costs
      .filter((c) => c.date.startsWith(yyyymm))
      .reduce((sum, c) => sum + toNum(c.amount), 0);
  }, [costs]);

  const filteredCosts = costs.filter((c) => {
    if (filterProj && c.projectId !== filterProj) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !(c.category ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function handleField(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFormError('');
    };
  }

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(cost: VarCost) {
    setEditTarget(cost);
    setForm({
      projectId:        cost.projectId ?? '',
      name:             cost.name,
      amount:           String(cost.amount),
      quantity:         cost.quantity != null ? String(cost.quantity) : '1',
      priceIncludesVat: cost.priceIncludesVat ?? false,
      vatRate:          cost.vatRate != null ? String(cost.vatRate) : '21',
      markupPct:        cost.markupPct != null ? String(cost.markupPct) : '',
      date:             cost.date.slice(0, 10),
      category:         cost.category ?? '',
    });
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
      const payload = {
        projectId:        form.projectId || null,
        name:             form.name.trim(),
        amount:           parseFloat(form.amount),
        quantity:         form.quantity ? parseFloat(form.quantity) : 1,
        priceIncludesVat: form.priceIncludesVat,
        vatRate:          form.vatRate ? parseFloat(form.vatRate) : 21,
        markupPct:        form.markupPct ? parseFloat(form.markupPct) : null,
        date:             form.date,
        category:         form.category.trim() || null,
      };
      if (editTarget) {
        await api.patch(`/v1/variable-costs/${editTarget.id}`, payload);
        toast('success', 'Coste variable actualizado');
      } else {
        await api.post('/v1/variable-costs', payload);
        toast('success', 'Coste variable añadido');
      }
      setModalOpen(false);
      setEditTarget(null);
      load(true);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title:       'Eliminar coste variable',
      message:     'Este coste variable se eliminará permanentemente.',
      confirmText: 'Eliminar',
      variant:     'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/v1/variable-costs/${id}`);
      toast('success', 'Coste variable eliminado');
      load(true);
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
        <div className="skeleton h-24 rounded-[16px] mb-6" />
        <div className="space-y-3">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-14 rounded-[12px]" />)}
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
          <h1 className="text-[28px] font-semibold text-[var(--color-text)] tracking-[-0.02em]">Costes variables</h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
            {costs.length} registro{costs.length !== 1 ? 's' : ''}
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
                exportCsv(`${prefix}costes-variables-horaspro`, [
                  { header: 'Nombre',    value: (c: VarCost) => c.name },
                  { header: 'Importe',   value: (c: VarCost) => c.amount },
                  { header: 'Fecha',     value: (c: VarCost) => c.date.slice(0, 10) },
                  { header: 'Proyecto',  value: (c: VarCost) => c.project?.name ?? '' },
                  { header: 'Categoría', value: (c: VarCost) => c.category ?? '' },
                ], filteredCosts);
                toast('success', `${filteredCosts.length} costes exportados`);
              }}
            >
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
          <Button variant="primary" icon={<Plus className="w-4 h-4" strokeWidth={2.5} />} onClick={openCreate}>
            Añadir coste
          </Button>
        </div>
      </header>

      {/* Resumen */}
      <div
        className="relative overflow-hidden rounded-[20px] mb-6 animate-fade-up p-5 sm:p-6"
        style={{
          background:
            'linear-gradient(135deg, rgba(191,90,242,0.10) 0%, rgba(10,132,255,0.06) 60%, rgba(48,209,88,0.04) 100%)',
          border: '1px solid var(--color-border-subtle)',
          boxShadow: 'var(--shadow-card)',
          animationDelay: '50ms',
          animationFillMode: 'both',
        } as React.CSSProperties}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full blur-3xl opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(191,90,242,0.30) 0%, transparent 70%)' }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.08em]">
              Total costes variables
            </p>
            <p className="text-[40px] sm:text-[44px] font-semibold text-[var(--color-text)] tabular-nums mt-1 leading-none tracking-[-0.02em]">
              {fmt(total)} €
            </p>
            {totalMonth > 0 && (
              <p className="text-[12.5px] text-[var(--color-text-tertiary)] mt-2 tabular-nums">
                {fmtCurrency(totalMonth)} este mes
              </p>
            )}
          </div>
          <div
            className="w-14 h-14 rounded-[16px] flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(180deg, rgba(191,90,242,0.18) 0%, rgba(191,90,242,0.10) 100%)',
              border: '1px solid rgba(191,90,242,0.20)',
            }}
          >
            <TrendingDown className="w-6 h-6 text-[var(--color-purple)]" strokeWidth={1.7} />
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
          <div className="sm:flex-1 sm:max-w-[280px]">
            <Select
              label="Filtrar por proyecto"
              value={filterProj}
              onChange={(e) => setFilterProj(e.target.value)}
              options={projectOptions}
            />
          </div>
          {(searchQ || filterProj) && (
            <Button
              variant="ghost"
              size="sm"
              icon={<X className="w-3.5 h-3.5" />}
              onClick={() => { setSearchQ(''); setFilterProj(''); }}
            >
              Limpiar
            </Button>
          )}
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
        title={editTarget ? 'Editar coste variable' : 'Añadir coste variable'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editTarget ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nombre del coste *"
            type="text"
            value={form.name}
            onChange={handleField('name')}
            placeholder="Ej: Turbo, pastillas de freno, licencia..."
          />
          <Select
            label="Proyecto asociado"
            value={form.projectId}
            onChange={handleField('projectId')}
            options={projectOptions}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Importe *"
              type="number"
              value={form.amount}
              onChange={handleField('amount')}
              min="0"
              step="0.01"
              prefix="€"
            />
            <Input
              label="Cantidad"
              type="number"
              value={form.quantity}
              onChange={handleField('quantity')}
              min="0.01"
              step="1"
              hint="Por defecto 1"
            />
            <DatePicker
              label="Fecha *"
              value={form.date}
              onChange={(v) => { setForm((prev) => ({ ...prev, date: v })); setFormError(''); }}
            />
          </div>

          {/* ═══ IVA ═══ */}
          <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-[var(--color-text)]">El importe ya incluye el IVA</p>
                <p className="text-[11.5px] text-[var(--color-text-tertiary)] leading-relaxed mt-0.5">
                  {form.priceIncludesVat
                    ? `Lo que pones es lo que pagas. Se descompone automáticamente el ${form.vatRate || 21}% de IVA.`
                    : `El IVA se añadirá encima. Si el importe ya lo incluye, activa este toggle.`}
                </p>
              </div>
              <Toggle
                checked={form.priceIncludesVat}
                onChange={(v) => setForm((p) => ({ ...p, priceIncludesVat: v }))}
              />
            </div>
            <div className="mt-3">
              <Input
                label="Tipo de IVA"
                type="number"
                value={form.vatRate}
                onChange={handleField('vatRate')}
                min="0"
                step="1"
                suffix="%"
                hint="21 estándar · 10 reducido · 4 superreducido · 0 exento"
              />
            </div>
          </div>

          {/* ═══ Margen sobre esta pieza ═══ */}
          <Input
            label="Margen al cobrar al cliente"
            type="number"
            value={form.markupPct}
            onChange={handleField('markupPct')}
            min="0"
            step="1"
            suffix="%"
            hint="Opcional. Si lo dejas vacío se usa el margen del proyecto (o 0 si no hay)."
          />

          <Input
            label="Categoría"
            type="text"
            value={form.category}
            onChange={handleField('category')}
            placeholder="Ej: Piezas, Consumibles, Subcontratación..."
          />

          {/* ═══ Desglose en tiempo real ═══ */}
          {form.amount && (
            <CostBreakdownPreview
              amount={parseFloat(form.amount) || 0}
              quantity={parseFloat(form.quantity) || 1}
              vatRate={parseFloat(form.vatRate) || 0}
              priceIncludesVat={form.priceIncludesVat}
              markupPct={form.markupPct ? parseFloat(form.markupPct) : 0}
            />
          )}

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

function CostRow({ cost, index, onEdit, onDelete }: { cost: VarCost; index: number; onEdit: () => void; onDelete: () => void }) {
  return (
    <div
      className={clsx(
        'group flex items-center gap-3 rounded-[14px] px-4 py-3',
        'bg-[var(--color-surface)] border border-[var(--color-border-subtle)]',
        'hover:border-[var(--color-border-medium)] transition-all duration-150',
        'animate-fade-up',
      )}
      style={{ animationDelay: `${Math.min(index * 35, 240)}ms`, animationFillMode: 'both' } as React.CSSProperties}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-semibold text-[var(--color-text)]">{cost.name}</span>
          {cost.project && <Badge variant="blue" size="sm">{cost.project.name}</Badge>}
          {cost.category && <Badge variant="gray" size="sm">{cost.category}</Badge>}
        </div>
        <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">{fmtDate(cost.date)}</p>
      </div>

      <span className="text-[14px] font-semibold text-[var(--color-text)] tabular-nums shrink-0">
        {fmtCurrency(toNum(cost.amount))}
      </span>

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

// ---------------------------------------------------------------------------
// Previsualización en vivo del desglose económico del coste
// ---------------------------------------------------------------------------

function CostBreakdownPreview({
  amount, quantity, vatRate, priceIncludesVat, markupPct,
}: {
  amount: number; quantity: number; vatRate: number; priceIncludesVat: boolean; markupPct: number;
}) {
  // Reutiliza partBreakdown construyendo un VarCost mínimo
  const br = partBreakdown({
    id: '', tenantId: '', projectId: null, name: '',
    amount: String(amount),
    quantity: String(quantity),
    priceIncludesVat,
    vatRate: String(vatRate),
    markupPct: String(markupPct),
    date: '', category: null,
  }, 0);

  const hasMarkup = markupPct > 0;

  return (
    <div className="rounded-[12px] bg-[var(--color-blue-subtle)] border border-[rgba(10,132,255,0.20)] p-3 text-[12.5px]">
      <p className="font-semibold text-[var(--color-text)] mb-2">Desglose</p>
      <div className="grid grid-cols-2 gap-y-1">
        <span className="text-[var(--color-text-secondary)]">Base (sin IVA)</span>
        <span className="text-right font-medium text-[var(--color-text)] tabular-nums">{fmtCurrency(br.netBase)}</span>

        <span className="text-[var(--color-text-secondary)]">IVA ({vatRate}%)</span>
        <span className="text-right font-medium text-[var(--color-text)] tabular-nums">{fmtCurrency(br.vatAmount)}</span>

        <span className="text-[var(--color-text-secondary)]">Coste real (con IVA)</span>
        <span className="text-right font-semibold text-[var(--color-text)] tabular-nums">{fmtCurrency(br.realCost)}</span>

        {hasMarkup && (
          <>
            <span className="text-[var(--color-text-secondary)]">Margen ({markupPct}%)</span>
            <span className="text-right font-medium text-[var(--color-green)] tabular-nums">+{fmtCurrency(br.markupAmount)}</span>
            <span className="text-[var(--color-text-secondary)] col-span-2 border-t border-[rgba(10,132,255,0.15)] my-1" />
            <span className="font-semibold text-[var(--color-text)]">Precio al cliente</span>
            <span className="text-right font-semibold text-[var(--color-blue)] tabular-nums">{fmtCurrency(br.clientPrice)}</span>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyCosts({ onNew }: { onNew: () => void }) {
  return (
    <Card padding="lg" className="flex flex-col items-center py-12 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{
          background: 'linear-gradient(180deg, rgba(191,90,242,0.14) 0%, rgba(191,90,242,0.08) 100%)',
          border: '1px solid rgba(191,90,242,0.18)',
        }}
      >
        <TrendingDown className="w-7 h-7 text-[var(--color-purple)]" strokeWidth={1.6} />
      </div>
      <p className="text-[16px] font-semibold text-[var(--color-text)]">Sin costes variables</p>
      <p className="text-[14px] text-[var(--color-text-secondary)] mt-1 max-w-[300px] mb-5">
        Registra gastos específicos asociados a proyectos concretos.
      </p>
      <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onNew}>
        Añadir coste
      </Button>
    </Card>
  );
}
