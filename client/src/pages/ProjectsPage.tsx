// ============================================================================
// ProjectsPage.tsx — CRUD de proyectos
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, FolderKanban, AlertCircle, RefreshCw,
  MoreHorizontal, Pencil, Trash2, Clock, DollarSign,
} from 'lucide-react';
import clsx from 'clsx';
import { api }      from '@/lib/api';
import type { Project, ProjectStatus } from '@/types';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import Modal        from '@/components/ui/Modal';
import Input        from '@/components/ui/Input';
import Select       from '@/components/ui/Select';
import Textarea     from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: string | number | null | undefined) {
  if (v == null) return 0;
  return typeof v === 'number' ? v : parseFloat(v) || 0;
}

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

const FILTER_TABS: { label: string; value: ProjectStatus | 'ALL' }[] = [
  { label: 'Todos',      value: 'ALL'       },
  { label: 'Activos',    value: 'ACTIVE'    },
  { label: 'Pausados',   value: 'PAUSED'    },
  { label: 'Borrador',   value: 'DRAFT'     },
  { label: 'Completados',value: 'COMPLETED' },
];

const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

// ---------------------------------------------------------------------------
// Formulario de proyecto
// ---------------------------------------------------------------------------

interface ProjectFormState {
  name:         string;
  clientName:   string;
  description:  string;
  status:       ProjectStatus;
  budgetHours:  string;
  budgetAmount: string;
  startDate:    string;
  endDate:      string;
}

const EMPTY_FORM: ProjectFormState = {
  name:         '',
  clientName:   '',
  description:  '',
  status:       'DRAFT',
  budgetHours:  '',
  budgetAmount: '',
  startDate:    '',
  endDate:      '',
};

function projectToForm(p: Project): ProjectFormState {
  return {
    name:         p.name,
    clientName:   p.clientName ?? '',
    description:  p.description ?? '',
    status:       p.status,
    budgetHours:  p.budgetHours != null ? String(p.budgetHours) : '',
    budgetAmount: p.budgetAmount != null ? String(p.budgetAmount) : '',
    startDate:    p.startDate ? p.startDate.slice(0, 10) : '',
    endDate:      p.endDate   ? p.endDate.slice(0, 10)   : '',
  };
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [filter,   setFilter]   = useState<ProjectStatus | 'ALL'>('ALL');

  // Modal estado
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<Project | null>(null);
  const [form,         setForm]         = useState<ProjectFormState>(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState('');

  // Menú contextual
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get<Project[]>('/v1/projects')
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Cerrar menú al click fuera
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

  function handleField(field: keyof ProjectFormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFormError('');
    };
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('El nombre del proyecto es obligatorio'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name:         form.name.trim(),
        clientName:   form.clientName.trim() || null,
        description:  form.description.trim() || null,
        status:       form.status,
        budgetHours:  form.budgetHours  ? parseFloat(form.budgetHours)  : null,
        budgetAmount: form.budgetAmount ? parseFloat(form.budgetAmount) : null,
        startDate:    form.startDate || null,
        endDate:      form.endDate   || null,
      };
      if (editTarget) {
        await api.patch<Project>(`/v1/projects/${editTarget.id}`, payload);
        toast('success', 'Proyecto actualizado correctamente');
      } else {
        await api.post<Project>('/v1/projects', payload);
        toast('success', 'Proyecto creado correctamente');
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
    if (!window.confirm('¿Cancelar este proyecto? Se marcará como cancelado.')) return;
    try {
      await api.delete(`/v1/projects/${id}`);
      toast('success', 'Proyecto cancelado');
      load();
    } catch {
      toast('error', 'Error al cancelar el proyecto');
    }
  }

  const visible = filter === 'ALL'
    ? projects
    : projects.filter((p) => p.status === filter);

  // ---- Loading ----
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

  // ---- Error ----
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full bg-[rgba(255,69,58,0.10)] flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-[#FF453A]" strokeWidth={1.8} />
        </div>
        <p className="text-[16px] font-semibold text-[#1D1D1F]">Error al cargar proyectos</p>
        <p className="text-[14px] text-[#6E6E73]">{error}</p>
        <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCw className="w-4 h-4" />}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto">

      {/* Header */}
      <header className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1D1D1F]">Proyectos</h1>
          <p className="text-[14px] text-[#6E6E73] mt-0.5">
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" strokeWidth={2.5} />} onClick={openCreate}>
          Nuevo proyecto
        </Button>
      </header>

      {/* Filtros */}
      <div className="flex gap-1.5 mb-6 flex-wrap animate-fade-up" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={clsx(
              'px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150',
              filter === tab.value
                ? 'bg-[#1D1D1F] text-white'
                : 'bg-white border border-[rgba(0,0,0,0.08)] text-[#6E6E73] hover:text-[#1D1D1F] hover:border-[rgba(0,0,0,0.16)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid de proyectos */}
      {visible.length === 0 ? (
        <EmptyProjects onNew={openCreate} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((p, i) => (
            <ProjectCard
              key={p.id}
              project={p}
              index={i}
              menuOpen={menuOpen === p.id}
              onMenuToggle={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}

      {/* Modal formulario */}
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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Presupuesto (€)"
              type="number"
              value={form.budgetAmount}
              onChange={handleField('budgetAmount')}
              min="0"
            />
            <Input
              label="Horas presupuestadas"
              type="number"
              value={form.budgetHours}
              onChange={handleField('budgetHours')}
              min="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha inicio"
              type="date"
              value={form.startDate}
              onChange={handleField('startDate')}
            />
            <Input
              label="Fecha fin"
              type="date"
              value={form.endDate}
              onChange={handleField('endDate')}
            />
          </div>

          <Textarea
            label="Descripción"
            value={form.description}
            onChange={handleField('description')}
            placeholder="Descripción opcional..."
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
// ProjectCard
// ---------------------------------------------------------------------------

function ProjectCard({
  project, index, menuOpen, onMenuToggle, onEdit, onDelete,
}: {
  project:      Project;
  index:        number;
  menuOpen:     boolean;
  onMenuToggle: (e: React.MouseEvent) => void;
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
    >
      {/* Header de la card */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={STATUS_BADGE[project.status]} dot>
              {STATUS_LABEL[project.status]}
            </Badge>
          </div>
          <h3 className="text-[15px] font-semibold text-[#1D1D1F] mt-1.5 leading-tight">
            {project.name}
          </h3>
          {project.clientName && (
            <p className="text-[12px] text-[#6E6E73] mt-0.5">{project.clientName}</p>
          )}
        </div>

        {/* Menú de acciones */}
        <div className="relative">
          <button
            onClick={onMenuToggle}
            className="p-1.5 rounded-[7px] text-[#86868B] hover:bg-[rgba(0,0,0,0.06)] hover:text-[#1D1D1F] transition-colors duration-150"
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.8} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-20 w-40 bg-white rounded-[12px] border border-[rgba(0,0,0,0.08)] py-1.5"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.04)' }}
            >
              <MenuBtn icon={<Pencil className="w-3.5 h-3.5" />} label="Editar" onClick={onEdit} />
              <MenuBtn icon={<Trash2 className="w-3.5 h-3.5" />} label="Cancelar" onClick={onDelete} danger />
            </div>
          )}
        </div>
      </div>

      {/* Descripción */}
      {project.description && (
        <p className="text-[12px] text-[#6E6E73] mb-3 line-clamp-2">{project.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 text-[12px] text-[#86868B] border-t border-[rgba(0,0,0,0.05)] pt-3 mt-2">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />
          {entries} entrada{entries !== 1 ? 's' : ''}
        </span>
        {budget > 0 && (
          <span className="flex items-center gap-1 ml-auto font-medium text-[#1D1D1F]">
            <DollarSign className="w-3.5 h-3.5" strokeWidth={1.8} />
            {budget.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
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
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-2 px-3 py-1.5 text-[13px]',
        'transition-colors duration-100',
        danger
          ? 'text-[#FF453A] hover:bg-[rgba(255,69,58,0.06)]'
          : 'text-[#1D1D1F] hover:bg-[rgba(0,0,0,0.04)]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyProjects({ onNew }: { onNew: () => void }) {
  return (
    <Card padding="lg" className="flex flex-col items-center py-14 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-[20px] bg-[rgba(10,132,255,0.08)] flex items-center justify-center mb-5">
        <FolderKanban className="w-7 h-7 text-[#0A84FF]" strokeWidth={1.5} />
      </div>
      <p className="text-[17px] font-semibold text-[#1D1D1F] mb-1">Sin proyectos</p>
      <p className="text-[14px] text-[#6E6E73] max-w-[260px] mb-5">
        Crea tu primer proyecto para empezar a registrar horas y medir rentabilidad.
      </p>
      <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onNew}>
        Nuevo proyecto
      </Button>
    </Card>
  );
}
