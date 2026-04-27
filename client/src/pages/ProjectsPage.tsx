// ============================================================================
// ProjectsPage.tsx — CRUD de proyectos
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FolderKanban, AlertCircle, RefreshCw,
  MoreHorizontal, Pencil, Trash2, Clock, Search, Download,
  ClipboardList, Timer, Layers,
} from 'lucide-react';
import clsx from 'clsx';
import { api }       from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { fmt, toNum } from '@/lib/format';
import type { Project, ProjectStatus, BillingMode } from '@/types';

// SUBSCRIPTION queda fuera del nivel Project: las cuotas recurrentes viven
// en Contract. Forzamos que el form solo permita modos directos de trabajo.
type ProjectBillingMode = Exclude<BillingMode, 'SUBSCRIPTION'>;
function toProjectBillingMode(mode: BillingMode | null | undefined): ProjectBillingMode {
  return mode === 'SUBSCRIPTION' || !mode ? 'FIXED' : mode;
}
import { BILLING_MODE_LABEL, BILLING_MODE_DESCRIPTION } from '@/lib/profitability';
import { buildDeleteSummary, type DeletePreview } from '@/lib/projects';
import Card             from '@/components/ui/Card';
import Badge            from '@/components/ui/Badge';
import Button           from '@/components/ui/Button';
import Modal            from '@/components/ui/Modal';
import Input            from '@/components/ui/Input';
import Select           from '@/components/ui/Select';
import Textarea         from '@/components/ui/Textarea';
import DatePicker       from '@/components/ui/DatePicker';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useToast }     from '@/components/ui/Toast';
import { useConfirm }   from '@/components/ui/ConfirmDialog';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT:     'Borrador',
  ACTIVE:    'Activo',
  PAUSED:    'Pausado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

const STATUS_BADGE: Record<ProjectStatus, 'gray' | 'green' | 'orange' | 'blue' | 'red'> = {
  DRAFT:     'gray',
  ACTIVE:    'green',
  PAUSED:    'orange',
  COMPLETED: 'blue',
  CANCELLED: 'red',
};

type Filter = ProjectStatus | 'ALL';
const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------

interface ProjectFormState {
  name:           string;
  clientName:     string;
  description:    string;
  status:         ProjectStatus;
  billingMode:    ProjectBillingMode;
  budgetHours:    string;
  budgetAmount:   string;
  hourlyRate:     string;
  partsMarkupPct: string;
  startDate:      string;
  endDate:        string;
}

const EMPTY_FORM: ProjectFormState = {
  name: '', clientName: '', description: '', status: 'DRAFT',
  billingMode: 'FIXED',
  budgetHours: '', budgetAmount: '', hourlyRate: '', partsMarkupPct: '',
  startDate: '', endDate: '',
};

function projectToForm(p: Project): ProjectFormState {
  return {
    name:           p.name,
    clientName:     p.clientName ?? '',
    description:    p.description ?? '',
    status:         p.status,
    billingMode:    toProjectBillingMode(p.billingMode),
    budgetHours:    p.budgetHours != null ? String(p.budgetHours) : '',
    budgetAmount:   p.budgetAmount != null ? String(p.budgetAmount) : '',
    hourlyRate:     p.hourlyRate != null ? String(p.hourlyRate) : '',
    partsMarkupPct: p.partsMarkupPct != null ? String(p.partsMarkupPct) : '',
    startDate:      p.startDate ? p.startDate.slice(0, 10) : '',
    endDate:        p.endDate   ? p.endDate.slice(0, 10)   : '',
  };
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const navigate    = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [filter,   setFilter]   = useState<Filter>('ALL');
  const [search,   setSearch]   = useState('');

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [form,       setForm]       = useState<ProjectFormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    api.get<Project[]>('/v1/projects')
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Apertura automática desde Command Palette (⌘K → "Nuevo proyecto")
  useEffect(() => {
    if (sessionStorage.getItem('hp_cmd_action') === 'new-project') {
      sessionStorage.removeItem('hp_cmd_action');
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function openEdit(p: Project) {
    setEditTarget(p);
    setForm(projectToForm(p));
    setFormError('');
    setModalOpen(true);
    setMenuOpen(null);
  }

  function handleField<K extends keyof ProjectFormState>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value } as ProjectFormState));
      setFormError('');
    };
  }

  function setDate(field: 'startDate' | 'endDate') {
    return (val: string) => {
      setForm((prev) => ({ ...prev, [field]: val }));
      setFormError('');
    };
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('El nombre del proyecto es obligatorio'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name:           form.name.trim(),
        clientName:     form.clientName.trim() || null,
        description:    form.description.trim() || null,
        status:         form.status,
        billingMode:    form.billingMode,
        budgetHours:    form.budgetHours  ? parseFloat(form.budgetHours)  : null,
        budgetAmount:   form.budgetAmount ? parseFloat(form.budgetAmount) : null,
        hourlyRate:     form.hourlyRate   ? parseFloat(form.hourlyRate)   : null,
        partsMarkupPct: form.partsMarkupPct ? parseFloat(form.partsMarkupPct) : null,
        startDate:      form.startDate || null,
        endDate:        form.endDate   || null,
      };
      if (editTarget) {
        await api.patch<Project>(`/v1/projects/${editTarget.id}`, payload);
        toast('success', 'Proyecto actualizado correctamente');
      } else {
        await api.post<Project>('/v1/projects', payload);
        toast('success', 'Proyecto creado correctamente');
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
    let preview: DeletePreview;
    try {
      preview = await api.get<DeletePreview>(`/v1/projects/${id}/delete-preview`);
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'No se pudo cargar el resumen del proyecto');
      return;
    }

    if (!preview.canDelete) {
      await confirm({
        title:       'No se puede eliminar este proyecto',
        message:     preview.blockReason ?? 'El proyecto tiene pagos cobrados. Cámbialo a estado "Cancelado" en lugar de borrarlo.',
        confirmText: 'Entendido',
        variant:     'danger',
      });
      return;
    }

    const lines = buildDeleteSummary(preview);
    const ok = await confirm({
      title:       `Eliminar "${preview.projectName}"`,
      message:     [
        'Se eliminarán de forma PERMANENTE:',
        ...lines.map((l) => `  • ${l}`),
        '',
        'Esta acción no se puede deshacer.',
      ].join('\n'),
      confirmText: 'Eliminar definitivamente',
      variant:     'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/v1/projects/${id}`);
      toast('success', 'Proyecto eliminado');
      load(true);
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Error al eliminar el proyecto');
    }
  }

  const visible = projects.filter((p) => {
    if (filter !== 'ALL' && p.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const nameMatch   = p.name.toLowerCase().includes(q);
      const clientMatch = p.clientName?.toLowerCase().includes(q);
      if (!nameMatch && !clientMatch) return false;
    }
    return true;
  });

  const counts = {
    ALL:       projects.length,
    ACTIVE:    projects.filter((p) => p.status === 'ACTIVE').length,
    PAUSED:    projects.filter((p) => p.status === 'PAUSED').length,
    DRAFT:     projects.filter((p) => p.status === 'DRAFT').length,
    COMPLETED: projects.filter((p) => p.status === 'COMPLETED').length,
  };

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
        <p className="text-[16px] font-semibold text-[var(--color-text)]">Error al cargar proyectos</p>
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
          <h1 className="text-[28px] font-semibold text-[var(--color-text)] tracking-tight">Proyectos</h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="w-4 h-4" strokeWidth={2} />}
              onClick={() => {
                exportCsv('proyectos-horaspro', [
                  { header: 'Nombre',       value: (p: Project) => p.name },
                  { header: 'Cliente',      value: (p: Project) => p.clientName ?? '' },
                  { header: 'Estado',       value: (p: Project) => STATUS_LABEL[p.status] },
                  { header: 'Presupuesto €', value: (p: Project) => p.budgetAmount ?? '' },
                  { header: 'Horas pres.',  value: (p: Project) => p.budgetHours ?? '' },
                  { header: 'Inicio',       value: (p: Project) => p.startDate?.slice(0, 10) ?? '' },
                  { header: 'Fin',          value: (p: Project) => p.endDate?.slice(0, 10) ?? '' },
                ], visible);
                toast('success', `${visible.length} proyectos exportados`);
              }}
            >
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
          <Button variant="primary" icon={<Plus className="w-4 h-4" strokeWidth={2.4} />} onClick={openCreate}>
            Nuevo proyecto
          </Button>
        </div>
      </header>

      {/* Búsqueda + Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 animate-fade-up stagger-1">
        <div className="relative sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proyecto o cliente..."
            className="w-full h-10 pl-9 pr-3 text-[13.5px] text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border-medium)] rounded-[11px] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-blue)] focus:ring-[3px] focus:ring-[rgba(10,132,255,0.20)] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          />
        </div>
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL',       label: 'Todos',       count: counts.ALL },
            { value: 'ACTIVE',    label: 'Activos',     count: counts.ACTIVE },
            { value: 'PAUSED',    label: 'Pausados',    count: counts.PAUSED },
            { value: 'DRAFT',     label: 'Borrador',    count: counts.DRAFT },
            { value: 'COMPLETED', label: 'Completados', count: counts.COMPLETED },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyProjects onNew={openCreate} hasAny={projects.length > 0} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((p, i) => (
            <ProjectCard
              key={p.id}
              project={p}
              index={i}
              menuOpen={menuOpen === p.id}
              onMenuToggle={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
              onClick={() => navigate(`/proyectos/${p.id}`)}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar proyecto' : 'Nuevo proyecto'}
        subtitle={editTarget ? editTarget.name : 'Rellena los datos del proyecto'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editTarget ? 'Guardar cambios' : 'Crear proyecto'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nombre del proyecto *"
            type="text"
            value={form.name}
            onChange={handleField('name')}
          />
          <Input
            label="Cliente"
            type="text"
            value={form.clientName}
            onChange={handleField('clientName')}
          />
          <Select
            label="Estado"
            value={form.status}
            onChange={handleField('status')}
            options={STATUS_OPTIONS}
          />

          {/* ═══ Configurador de rentabilidad ═══ */}
          <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] p-3.5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                  ¿Cómo vas a cobrar este trabajo?
                </p>
                <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5 leading-relaxed">
                  {BILLING_MODE_DESCRIPTION[form.billingMode]}
                </p>
              </div>
            </div>
            <BillingModePicker
              value={form.billingMode}
              onChange={(m) => setForm((p) => ({ ...p, billingMode: m }))}
            />

            {(form.billingMode === 'FIXED' || form.billingMode === 'HYBRID') && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Presupuesto cerrado"
                  type="number"
                  value={form.budgetAmount}
                  onChange={handleField('budgetAmount')}
                  min="0"
                  prefix="€"
                  hint={form.billingMode === 'HYBRID' ? 'Parte fija pactada' : 'Lo que cobrarás'}
                />
                <Input
                  label="Horas presupuestadas"
                  type="number"
                  value={form.budgetHours}
                  onChange={handleField('budgetHours')}
                  min="0"
                  hint="Opcional · solo para tracking"
                />
              </div>
            )}

            {(form.billingMode === 'HOURLY' || form.billingMode === 'HYBRID') && (
              <Input
                label="Tarifa por hora (mano de obra)"
                type="number"
                value={form.hourlyRate}
                onChange={handleField('hourlyRate')}
                min="0"
                step="0.5"
                prefix="€"
                hint="Se aplicará a las horas reales registradas con el timer"
              />
            )}

            <div>
              <Input
                label="Margen sobre piezas/materiales"
                type="number"
                value={form.partsMarkupPct}
                onChange={handleField('partsMarkupPct')}
                min="0"
                step="1"
                suffix="%"
                hint="Se añade encima de los costes variables cuando los factures al cliente. Déjalo vacío si cobras las piezas a precio de coste."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Fecha inicio"
              value={form.startDate}
              onChange={setDate('startDate')}
            />
            <DatePicker
              label="Fecha fin"
              value={form.endDate}
              onChange={setDate('endDate')}
              min={form.startDate || undefined}
            />
          </div>

          <Textarea
            label="Descripción"
            value={form.description}
            onChange={handleField('description')}
            placeholder="Descripción opcional..."
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
// ProjectCard
// ---------------------------------------------------------------------------

function ProjectCard({
  project, index, menuOpen, onMenuToggle, onClick, onEdit, onDelete,
}: {
  project:      Project;
  index:        number;
  menuOpen:     boolean;
  onMenuToggle: (e: React.MouseEvent) => void;
  onClick:      () => void;
  onEdit:       () => void;
  onDelete:     () => void;
}) {
  const budget  = toNum(project.budgetAmount);
  const entries = project._count?.timeEntries ?? 0;

  return (
    <Card
      hover
      padding="md"
      className="animate-fade-up relative"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <Badge variant={STATUS_BADGE[project.status]} dot>
            {STATUS_LABEL[project.status]}
          </Badge>
          <h3 className="text-[16px] font-semibold text-[var(--color-text)] mt-1.5 leading-tight tracking-tight">
            {project.name}
          </h3>
          {project.clientName && (
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5">{project.clientName}</p>
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
              className="absolute right-0 top-8 z-20 w-40 bg-[var(--color-surface)] rounded-[12px] border border-[var(--color-border-medium)] py-1.5"
              style={{ boxShadow: 'var(--shadow-floating)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuBtn icon={<Pencil className="w-3.5 h-3.5" />} label="Editar" onClick={onEdit} />
              <MenuBtn icon={<Trash2 className="w-3.5 h-3.5" />} label="Eliminar" onClick={onDelete} danger />
            </div>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-[12.5px] text-[var(--color-text-secondary)] mb-3 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-tertiary)] border-t border-[var(--color-border)] pt-3 mt-2">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" strokeWidth={2} />
          {entries} entrada{entries !== 1 ? 's' : ''}
        </span>
        {budget > 0 && (
          <span className="flex items-center gap-1 ml-auto font-medium text-[var(--color-text)] tabular-nums">
            {fmt(budget, 0)} €
          </span>
        )}
      </div>
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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
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
// Selector visual de modo de facturación — estilo Apple, tres tarjetas
// ---------------------------------------------------------------------------

function BillingModePicker({ value, onChange }: {
  value:    ProjectBillingMode;
  onChange: (m: ProjectBillingMode) => void;
}) {
  const opts: { mode: ProjectBillingMode; icon: React.ReactNode; title: string; caption: string }[] = [
    { mode: 'FIXED',  icon: <ClipboardList className="w-4 h-4" strokeWidth={1.9} />, title: 'Cerrado',   caption: 'Precio pactado' },
    { mode: 'HOURLY', icon: <Timer         className="w-4 h-4" strokeWidth={1.9} />, title: 'Por horas', caption: 'Según tiempo real' },
    { mode: 'HYBRID', icon: <Layers        className="w-4 h-4" strokeWidth={1.9} />, title: 'Mixto',     caption: 'Fijo + horas' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {opts.map((o) => {
        const active = value === o.mode;
        return (
          <button
            type="button"
            key={o.mode}
            onClick={() => onChange(o.mode)}
            className={clsx(
              'flex flex-col items-start gap-1.5 px-3 py-2.5 rounded-[11px] text-left',
              'border transition-all duration-150',
              active
                ? 'border-[var(--color-blue)] bg-[var(--color-blue-subtle)] ring-[3px] ring-[rgba(10,132,255,0.15)]'
                : 'border-[var(--color-border-medium)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]',
            )}
          >
            <span className={clsx(
              'w-7 h-7 rounded-[9px] flex items-center justify-center',
              active ? 'bg-white text-[var(--color-blue)]' : 'bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.06)] text-[var(--color-text-secondary)]',
            )}>
              {o.icon}
            </span>
            <span className="text-[12.5px] font-semibold text-[var(--color-text)]">{o.title}</span>
            <span className="text-[10.5px] text-[var(--color-text-tertiary)] leading-tight">{o.caption}</span>
          </button>
        );
      })}
    </div>
  );
}

// Evitar el warning de import sin usar
void BILLING_MODE_LABEL;

function EmptyProjects({ onNew, hasAny }: { onNew: () => void; hasAny: boolean }) {
  return (
    <Card padding="lg" className="flex flex-col items-center py-14 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-[20px] bg-[var(--color-blue-subtle)] flex items-center justify-center mb-5 animate-float">
        <FolderKanban className="w-7 h-7 text-[var(--color-blue)]" strokeWidth={1.6} />
      </div>
      <p className="text-[17px] font-semibold text-[var(--color-text)] tracking-tight mb-1">
        {hasAny ? 'Ningún proyecto en este filtro' : 'Sin proyectos'}
      </p>
      <p className="text-[14px] text-[var(--color-text-secondary)] max-w-[280px] mb-5 leading-relaxed">
        {hasAny
          ? 'Prueba con otro filtro o crea un proyecto nuevo.'
          : 'Crea tu primer proyecto para empezar a registrar horas y medir rentabilidad.'}
      </p>
      <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onNew}>
        Nuevo proyecto
      </Button>
    </Card>
  );
}
