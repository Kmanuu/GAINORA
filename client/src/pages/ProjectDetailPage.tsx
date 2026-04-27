// ============================================================================
// ProjectDetailPage.tsx — Vista de detalle de un proyecto con métricas
// ============================================================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, DollarSign, TrendingUp,
  AlertCircle, RefreshCw, FileText, Receipt, Pencil,
  Plus, Timer, ClipboardList, Layers, Trash2, Info,
} from 'lucide-react';
import clsx from 'clsx';
import { api }       from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { fmt, fmtCurrency, fmtDuration, fmtDate, toNum } from '@/lib/format';
import {
  partBreakdown, computeProjectMetrics,
  BILLING_MODE_LABEL, BILLING_MODE_DESCRIPTION,
} from '@/lib/profitability';
import { buildDeleteSummary, type DeletePreview } from '@/lib/projects';
import type { Project, TimeEntry, VarCost, BillingMode } from '@/types';
import Card             from '@/components/ui/Card';
import Badge            from '@/components/ui/Badge';
import Button           from '@/components/ui/Button';
import Modal            from '@/components/ui/Modal';
import Input            from '@/components/ui/Input';
import Select           from '@/components/ui/Select';
import Toggle           from '@/components/ui/Toggle';
import DatePicker       from '@/components/ui/DatePicker';
import TimeInput        from '@/components/ui/TimeInput';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useToast }     from '@/components/ui/Toast';
import { useConfirm }   from '@/components/ui/ConfirmDialog';
import ContractsTab     from '@/components/contracts/ContractsTab';

// ---------------------------------------------------------------------------
// Tipos / etiquetas
// ---------------------------------------------------------------------------

type ProjectStatus = Project['status'];

const STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: 'Borrador', ACTIVE: 'Activo', PAUSED: 'Pausado',
  COMPLETED: 'Completado', CANCELLED: 'Cancelado',
};
const STATUS_BADGE: Record<ProjectStatus, 'gray' | 'green' | 'orange' | 'blue' | 'red'> = {
  DRAFT: 'gray', ACTIVE: 'green', PAUSED: 'orange',
  COMPLETED: 'blue', CANCELLED: 'red',
};

type Tab = 'resumen' | 'horas' | 'costes' | 'contratos';

// SUBSCRIPTION queda fuera del Project: cuotas recurrentes viven en Contract.
type ProjectBillingMode = Exclude<BillingMode, 'SUBSCRIPTION'>;
function toProjectBillingMode(mode: BillingMode | null | undefined): ProjectBillingMode {
  return mode === 'SUBSCRIPTION' || !mode ? 'FIXED' : mode;
}

interface ProjectDetail extends Project {
  timeEntries: (TimeEntry & { user?: { fullName: string; hourlyCost?: string | number } })[];
  varCosts:    VarCost[];
}

type KpiColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'neutral';

const KPI_COLORS: Record<KpiColor, { bg: string; icon: string; border: string }> = {
  blue:    { bg: 'rgba(10,132,255,0.10)',  icon: 'var(--color-blue)',         border: 'rgba(10,132,255,0.16)' },
  green:   { bg: 'rgba(48,209,88,0.10)',   icon: 'var(--color-green)',        border: 'rgba(48,209,88,0.18)' },
  orange:  { bg: 'rgba(255,159,10,0.10)',  icon: 'var(--color-orange)',       border: 'rgba(255,159,10,0.18)' },
  red:     { bg: 'rgba(255,69,58,0.10)',   icon: 'var(--color-red)',          border: 'rgba(255,69,58,0.18)' },
  purple:  { bg: 'rgba(191,90,242,0.10)',  icon: 'var(--color-purple)',       border: 'rgba(191,90,242,0.18)' },
  neutral: { bg: 'var(--color-surface-alt)', icon: 'var(--color-text-secondary)', border: 'var(--color-border-subtle)' },
};

function marginColor(pct: number): KpiColor {
  if (pct >= 20) return 'green';
  if (pct >= 10) return 'orange';
  return 'red';
}

// ---------------------------------------------------------------------------
// Form editar proyecto
// ---------------------------------------------------------------------------

interface EditForm {
  name:           string;
  clientName:     string;
  description:    string;
  status:         Project['status'];
  billingMode:    ProjectBillingMode;
  budgetAmount:   string;
  budgetHours:    string;
  hourlyRate:     string;
  partsMarkupPct: string;
  startDate:      string;
  endDate:        string;
}

const STATUS_OPTIONS = [
  { value: 'DRAFT',     label: 'Borrador'   },
  { value: 'ACTIVE',    label: 'Activo'     },
  { value: 'PAUSED',    label: 'Pausado'    },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'CANCELLED', label: 'Cancelado'  },
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [project,    setProject]    = useState<ProjectDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [tab,        setTab]        = useState<Tab>('resumen');
  const [editOpen,   setEditOpen]   = useState(false);
  const [editForm,   setEditForm]   = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Modales de acción rápida (disparados por las KPI cards)
  const [quickHoursOpen, setQuickHoursOpen] = useState(false);
  const [quickCostOpen,  setQuickCostOpen]  = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    api.get<ProjectDetail>(`/v1/projects/${id}`)
      .then(setProject)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function openEdit() {
    if (!project) return;
    setEditForm({
      name:           project.name,
      clientName:     project.clientName ?? '',
      description:    project.description ?? '',
      status:         project.status,
      billingMode:    toProjectBillingMode(project.billingMode),
      budgetAmount:   project.budgetAmount != null ? String(project.budgetAmount) : '',
      budgetHours:    project.budgetHours  != null ? String(project.budgetHours)  : '',
      hourlyRate:     project.hourlyRate   != null ? String(project.hourlyRate)   : '',
      partsMarkupPct: project.partsMarkupPct != null ? String(project.partsMarkupPct) : '',
      startDate:      project.startDate?.slice(0, 10) ?? '',
      endDate:        project.endDate?.slice(0, 10)   ?? '',
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editForm || !id) return;
    if (!editForm.name.trim()) return;
    setEditSaving(true);
    try {
      await api.patch(`/v1/projects/${id}`, {
        name:           editForm.name.trim(),
        clientName:     editForm.clientName.trim()  || null,
        description:    editForm.description.trim() || null,
        status:         editForm.status,
        billingMode:    editForm.billingMode,
        budgetAmount:   editForm.budgetAmount ? parseFloat(editForm.budgetAmount) : null,
        budgetHours:    editForm.budgetHours  ? parseFloat(editForm.budgetHours)  : null,
        hourlyRate:     editForm.hourlyRate   ? parseFloat(editForm.hourlyRate)   : null,
        partsMarkupPct: editForm.partsMarkupPct ? parseFloat(editForm.partsMarkupPct) : null,
        startDate:      editForm.startDate || null,
        endDate:        editForm.endDate   || null,
      });
      toast('success', 'Proyecto actualizado');
      setEditOpen(false);
      load();
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setEditSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[900px] mx-auto">
        <div className="skeleton h-5 w-24 mb-4" />
        <div className="skeleton h-8 w-64 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[0,1,2,3].map((i) => <div key={i} className="skeleton h-24 rounded-[16px]" />)}
        </div>
        <div className="skeleton h-64 rounded-[16px]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-8 h-8 text-[var(--color-red)]" strokeWidth={1.5} />
        <p className="text-[15px] font-medium text-[var(--color-text)]">{error || 'Proyecto no encontrado'}</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/proyectos')}>
            Volver
          </Button>
          <Button variant="secondary" size="sm" onClick={() => load()} icon={<RefreshCw className="w-4 h-4" />}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // === Cálculos usando el módulo compartido ===
  const metrics    = computeProjectMetrics(project, project.timeEntries, project.varCosts);
  const budgetHours = toNum(project.budgetHours);
  const hoursUsedPct = budgetHours > 0 ? (metrics.totalHours / budgetHours) * 100 : 0;
  const showFixedMargin = project.billingMode === 'FIXED' || project.billingMode === 'HYBRID';
  const hasRevenue = metrics.revenue > 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[900px] mx-auto">

      {/* Navegación */}
      <button
        onClick={() => navigate('/proyectos')}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-blue)] hover:opacity-80 transition-opacity mb-4 animate-fade-up"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        Proyectos
      </button>

      {/* Header */}
      <header className="mb-6 animate-fade-up" style={{ animationDelay: '40ms', animationFillMode: 'both' } as React.CSSProperties}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant={STATUS_BADGE[project.status]} dot pulse={project.status === 'ACTIVE'}>
                {STATUS_LABEL[project.status]}
              </Badge>
              <Badge variant="blue" size="sm">
                <BillingModeIcon mode={project.billingMode} />
                <span className="ml-1">{BILLING_MODE_LABEL[project.billingMode]}</span>
              </Badge>
            </div>
            <h1 className="text-[26px] sm:text-[30px] font-semibold text-[var(--color-text)] leading-tight tracking-[-0.02em]">
              {project.name}
            </h1>
            {project.clientName && (
              <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">{project.clientName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary" size="sm"
              icon={<Pencil className="w-3.5 h-3.5" strokeWidth={2} />}
              onClick={openEdit}
            >
              Editar
            </Button>
            <Button
              variant="danger" size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" strokeWidth={2} />}
              onClick={async () => {
                if (!id) return;
                let preview: DeletePreview;
                try {
                  preview = await api.get<DeletePreview>(`/v1/projects/${id}/delete-preview`);
                } catch (err: unknown) {
                  toast('error', err instanceof Error ? err.message : 'No se pudo cargar el resumen');
                  return;
                }
                if (!preview.canDelete) {
                  await confirm({
                    title:       'No se puede eliminar este proyecto',
                    message:     preview.blockReason ?? 'Tiene pagos cobrados. Cámbialo a "Cancelado" para archivarlo.',
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
                  navigate('/proyectos');
                } catch (err: unknown) {
                  toast('error', err instanceof Error ? err.message : 'Error al eliminar el proyecto');
                }
              }}
            >
              Eliminar
            </Button>
          </div>
        </div>
        {project.description && (
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-3 leading-relaxed max-w-[680px]">{project.description}</p>
        )}
      </header>

      {/* KPI Cards — clicables (quick actions) */}
      <section
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 animate-fade-up"
        style={{ animationDelay: '80ms', animationFillMode: 'both' } as React.CSSProperties}
      >
        <MiniKpi
          label="Horas totales"
          value={fmtDuration(metrics.totalHours * 60)}
          sub={budgetHours > 0 ? `${fmt(hoursUsedPct, 0)}% del presupuesto` : `${fmt(metrics.billableHours, 1)}h facturables`}
          color="blue"
          icon={<Clock className="w-4 h-4" strokeWidth={1.9} />}
          onClick={() => setQuickHoursOpen(true)}
          action="Añadir entrada"
        />
        <MiniKpi
          label="Coste mano de obra"
          value={fmtCurrency(metrics.laborCost, 0)}
          sub={`${project.timeEntries.length} entrada${project.timeEntries.length !== 1 ? 's' : ''}`}
          color="orange"
          icon={<DollarSign className="w-4 h-4" strokeWidth={1.9} />}
          onClick={() => setTab('horas')}
          action="Ver detalle"
        />
        <MiniKpi
          label="Costes variables"
          value={fmtCurrency(metrics.partsCost, 0)}
          sub={`${project.varCosts.length} gasto${project.varCosts.length !== 1 ? 's' : ''}`}
          color="purple"
          icon={<Receipt className="w-4 h-4" strokeWidth={1.9} />}
          onClick={() => setQuickCostOpen(true)}
          action="Añadir coste"
        />
        <MiniKpi
          label={hasRevenue ? 'Margen neto' : 'Coste total'}
          value={hasRevenue ? `${metrics.netMargin >= 0 ? '+' : ''}${fmt(metrics.netMargin, 0)} €` : fmtCurrency(metrics.directCost, 0)}
          sub={hasRevenue ? `${fmt(metrics.profitabilityPct, 1)}% rentabilidad` : 'Sin ingresos definidos'}
          color={hasRevenue ? marginColor(metrics.profitabilityPct) : 'neutral'}
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.9} />}
        />
      </section>

      {/* Barra de progreso de horas */}
      {budgetHours > 0 && (
        <Card
          padding="none"
          className="p-4 mb-5 animate-fade-up"
          style={{ animationDelay: '120ms', animationFillMode: 'both' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Horas consumidas</span>
            <span className="text-[12px] font-semibold text-[var(--color-text)] tabular-nums">
              {fmt(metrics.totalHours, 1)} / {budgetHours}h
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, hoursUsedPct)}%`,
                background: hoursUsedPct > 100 ? 'var(--color-red)' : hoursUsedPct > 80 ? 'var(--color-orange)' : 'var(--color-blue)',
              }}
            />
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div
        className="mb-5 animate-fade-up"
        style={{ animationDelay: '160ms', animationFillMode: 'both' } as React.CSSProperties}
      >
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'resumen',   label: 'Resumen' },
            { value: 'contratos', label: 'Contratos' },
            { value: 'horas',     label: 'Horas',  count: project.timeEntries.length },
            { value: 'costes',    label: 'Costes', count: project.varCosts.length },
          ]}
        />
      </div>

      {/* Contenido por tab */}
      <div className="animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' } as React.CSSProperties}>
        {tab === 'resumen' && (
          <SummaryTab
            project={project}
            metrics={metrics}
            showFixedMargin={showFixedMargin}
            onQuickHours={() => setQuickHoursOpen(true)}
            onQuickCost={() => setQuickCostOpen(true)}
          />
        )}
        {tab === 'contratos' && (
          <ContractsTab projectId={project.id} projectName={project.name} />
        )}
        {tab === 'horas' && (
          <HoursTab
            entries={project.timeEntries}
            project={project}
            toast={toast}
            onAdd={() => setQuickHoursOpen(true)}
            onRefresh={load}
            confirm={confirm}
          />
        )}
        {tab === 'costes' && (
          <CostsTab
            costs={project.varCosts}
            project={project}
            toast={toast}
            onAdd={() => setQuickCostOpen(true)}
            onRefresh={load}
            confirm={confirm}
          />
        )}
      </div>

      {/* ═══ Modal editar proyecto ═══ */}
      {editForm && (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Editar proyecto"
          subtitle="Modifica los datos del proyecto"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button variant="primary" loading={editSaving} onClick={handleSaveEdit}>Guardar cambios</Button>
            </div>
          }
        >
          <div className="space-y-3">
            <Input
              label="Nombre *"
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((p) => p && ({ ...p, name: e.target.value }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Cliente"
                type="text"
                value={editForm.clientName}
                onChange={(e) => setEditForm((p) => p && ({ ...p, clientName: e.target.value }))}
              />
              <Select
                label="Estado"
                value={editForm.status}
                onChange={(e) => setEditForm((p) => p && ({ ...p, status: e.target.value as Project['status'] }))}
                options={STATUS_OPTIONS}
              />
            </div>
            <Input
              label="Descripción"
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm((p) => p && ({ ...p, description: e.target.value }))}
            />

            {/* Configurador de rentabilidad */}
            <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] p-3.5 space-y-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                  ¿Cómo cobras este trabajo?
                </p>
                <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5 leading-relaxed">
                  {BILLING_MODE_DESCRIPTION[editForm.billingMode]}
                </p>
              </div>
              <BillingModePicker
                value={editForm.billingMode}
                onChange={(m) => setEditForm((p) => p && ({ ...p, billingMode: m }))}
              />

              {(editForm.billingMode === 'FIXED' || editForm.billingMode === 'HYBRID') && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Presupuesto (€)"
                    type="number"
                    value={editForm.budgetAmount}
                    onChange={(e) => setEditForm((p) => p && ({ ...p, budgetAmount: e.target.value }))}
                    min="0"
                  />
                  <Input
                    label="Horas presupuestadas"
                    type="number"
                    value={editForm.budgetHours}
                    onChange={(e) => setEditForm((p) => p && ({ ...p, budgetHours: e.target.value }))}
                    min="0"
                  />
                </div>
              )}

              {(editForm.billingMode === 'HOURLY' || editForm.billingMode === 'HYBRID') && (
                <Input
                  label="Tarifa por hora"
                  type="number"
                  value={editForm.hourlyRate}
                  onChange={(e) => setEditForm((p) => p && ({ ...p, hourlyRate: e.target.value }))}
                  min="0"
                  step="0.5"
                  prefix="€"
                />
              )}

              <Input
                label="Margen sobre piezas"
                type="number"
                value={editForm.partsMarkupPct}
                onChange={(e) => setEditForm((p) => p && ({ ...p, partsMarkupPct: e.target.value }))}
                min="0"
                step="1"
                suffix="%"
                hint="Se aplica a todos los costes variables sin margen propio"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="Inicio"
                value={editForm.startDate}
                onChange={(v) => setEditForm((p) => p && ({ ...p, startDate: v }))}
              />
              <DatePicker
                label="Fin"
                value={editForm.endDate}
                onChange={(v) => setEditForm((p) => p && ({ ...p, endDate: v }))}
                min={editForm.startDate || undefined}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ═══ Modal acción rápida: añadir horas ═══ */}
      <QuickHoursModal
        open={quickHoursOpen}
        onClose={() => setQuickHoursOpen(false)}
        project={project}
        onSaved={() => { setQuickHoursOpen(false); load(); }}
      />

      {/* ═══ Modal acción rápida: añadir coste variable ═══ */}
      <QuickCostModal
        open={quickCostOpen}
        onClose={() => setQuickCostOpen(false)}
        project={project}
        onSaved={() => { setQuickCostOpen(false); load(); }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icono según modo de facturación
// ---------------------------------------------------------------------------
function BillingModeIcon({ mode }: { mode: BillingMode }) {
  if (mode === 'HOURLY') return <Timer className="w-3 h-3" strokeWidth={2.2} />;
  if (mode === 'HYBRID') return <Layers className="w-3 h-3" strokeWidth={2.2} />;
  return <ClipboardList className="w-3 h-3" strokeWidth={2.2} />;
}

// ---------------------------------------------------------------------------
// Billing mode picker (reutilizado del ProjectsPage)
// ---------------------------------------------------------------------------
function BillingModePicker({ value, onChange }: { value: ProjectBillingMode; onChange: (m: ProjectBillingMode) => void }) {
  const opts: { mode: ProjectBillingMode; icon: React.ReactNode; title: string; caption: string }[] = [
    { mode: 'FIXED',  icon: <ClipboardList className="w-4 h-4" strokeWidth={1.9} />, title: 'Cerrado',   caption: 'Precio pactado' },
    { mode: 'HOURLY', icon: <Timer         className="w-4 h-4" strokeWidth={1.9} />, title: 'Por horas', caption: 'Según tiempo' },
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

// ---------------------------------------------------------------------------
// Mini KPI Card (clicable)
// ---------------------------------------------------------------------------

function MiniKpi({ label, value, sub, color, icon, onClick, action }: {
  label: string; value: string; sub: string; color: KpiColor; icon: React.ReactNode;
  onClick?: () => void; action?: string;
}) {
  const c = KPI_COLORS[color];
  const interactive = !!onClick;
  return (
    <Card
      padding="none"
      hover={interactive}
      className={clsx('p-3.5 group relative transition-transform duration-150', interactive && 'cursor-pointer')}
      onClick={onClick}
    >
      <div
        className="w-8 h-8 rounded-[9px] flex items-center justify-center mb-2.5"
        style={{ background: c.bg, color: c.icon, border: `1px solid ${c.border}` }}
      >
        {icon}
      </div>
      <p className="text-[19px] font-semibold text-[var(--color-text)] tabular-nums leading-none tracking-[-0.01em]">{value}</p>
      <p className="text-[11.5px] font-semibold text-[var(--color-text)] mt-1.5">{label}</p>
      <p className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">{sub}</p>
      {interactive && action && (
        <span
          className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--color-blue)] opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden
        >
          <Plus className="w-3 h-3" strokeWidth={2.4} />
          {action}
        </span>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab: Resumen
// ---------------------------------------------------------------------------

function SummaryTab({
  project, metrics, showFixedMargin, onQuickHours, onQuickCost,
}: {
  project:  ProjectDetail;
  metrics:  ReturnType<typeof computeProjectMetrics>;
  showFixedMargin: boolean;
  onQuickHours: () => void;
  onQuickCost:  () => void;
}) {
  const budget = toNum(project.budgetAmount);
  const rate   = toNum(project.hourlyRate);

  return (
    <div className="space-y-4">
      {/* Información del proyecto */}
      <Card padding="md">
        <h3 className="text-[14px] font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--color-text-secondary)]" strokeWidth={1.8} />
          Información
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]">
          {project.clientName && (
            <>
              <span className="text-[var(--color-text-secondary)]">Cliente</span>
              <span className="font-medium text-[var(--color-text)]">{project.clientName}</span>
            </>
          )}
          <span className="text-[var(--color-text-secondary)]">Modo de facturación</span>
          <span className="font-medium text-[var(--color-text)]">{BILLING_MODE_LABEL[project.billingMode]}</span>
          {showFixedMargin && budget > 0 && (
            <>
              <span className="text-[var(--color-text-secondary)]">Presupuesto</span>
              <span className="font-medium text-[var(--color-text)] tabular-nums">{fmtCurrency(budget, 0)}</span>
            </>
          )}
          {rate > 0 && (
            <>
              <span className="text-[var(--color-text-secondary)]">Tarifa mano de obra</span>
              <span className="font-medium text-[var(--color-text)] tabular-nums">{fmtCurrency(rate, 2)}/h</span>
            </>
          )}
          {toNum(project.partsMarkupPct) > 0 && (
            <>
              <span className="text-[var(--color-text-secondary)]">Margen en piezas</span>
              <span className="font-medium text-[var(--color-text)] tabular-nums">{fmt(toNum(project.partsMarkupPct), 0)}%</span>
            </>
          )}
          {project.budgetHours && (
            <>
              <span className="text-[var(--color-text-secondary)]">Horas presupuestadas</span>
              <span className="font-medium text-[var(--color-text)] tabular-nums">{project.budgetHours}h</span>
            </>
          )}
          {project.startDate && (
            <>
              <span className="text-[var(--color-text-secondary)]">Inicio</span>
              <span className="font-medium text-[var(--color-text)]">{fmtDate(project.startDate)}</span>
            </>
          )}
          {project.endDate && (
            <>
              <span className="text-[var(--color-text-secondary)]">Fin</span>
              <span className="font-medium text-[var(--color-text)]">{fmtDate(project.endDate)}</span>
            </>
          )}
        </div>
      </Card>

      {/* Desglose financiero */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-[var(--color-text)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--color-text-secondary)]" strokeWidth={1.8} />
            Desglose financiero
          </h3>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" icon={<Clock className="w-3.5 h-3.5" />} onClick={onQuickHours}>
              Horas
            </Button>
            <Button variant="ghost" size="sm" icon={<Receipt className="w-3.5 h-3.5" />} onClick={onQuickCost}>
              Coste
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {metrics.revenue > 0 && (
            <>
              {project.billingMode !== 'HOURLY' && budget > 0 && (
                <FinRow label="Presupuesto cerrado"   value={budget} positive />
              )}
              {metrics.laborRevenue > 0 && (
                <FinRow
                  label={`Mano de obra facturada (${fmt(metrics.billableHours, 1)}h × ${fmtCurrency(rate, 2)})`}
                  value={metrics.laborRevenue}
                  positive
                />
              )}
              {metrics.partsRevenue > 0 && (
                <FinRow label="Piezas al cliente (con margen)"     value={metrics.partsRevenue} positive />
              )}
              <FinRow label="Coste interno mano de obra" value={-metrics.laborCost} />
              <FinRow label="Coste real piezas"          value={-metrics.partsCost} />
              <div className="border-t border-[var(--color-border-subtle)] pt-2 mt-2">
                <FinRow label="Margen neto" value={metrics.netMargin} bold positive={metrics.netMargin >= 0} />
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] tabular-nums pt-1">
                Coste total: {fmtCurrency(metrics.directCost, 0)} · Ingresos: {fmtCurrency(metrics.revenue, 0)}
              </div>
            </>
          )}

          {/* Nota aclaratoria sobre mano de obra en modo FIXED */}
          {metrics.revenue > 0 && project.billingMode === 'FIXED' && metrics.laborCost > 0 && (
            <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-blue-subtle)] border border-[rgba(10,132,255,0.15)]">
              <Info className="w-3.5 h-3.5 text-[var(--color-blue)] mt-0.5 shrink-0" strokeWidth={2} />
              <p className="text-[11.5px] text-[var(--color-text-secondary)] leading-relaxed">
                El presupuesto ya incluye la mano de obra. El <span className="font-medium text-[var(--color-text)]">coste interno de mano de obra</span> ({fmtCurrency(metrics.laborCost, 0)}) es lo que te costó al negocio — si quieres cobrarla aparte, cambia el modo a <span className="font-medium text-[var(--color-text)]">Por horas</span> o <span className="font-medium text-[var(--color-text)]">Mixto</span>.
              </p>
            </div>
          )}

          {/* Aviso sobre coste por hora no configurado */}
          {metrics.totalHours > 0 && metrics.laborCost === 0 && (
            <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-orange-subtle)] border border-[rgba(255,159,10,0.15)]">
              <AlertCircle className="w-3.5 h-3.5 text-[var(--color-orange)] mt-0.5 shrink-0" strokeWidth={2} />
              <p className="text-[11.5px] text-[var(--color-text-secondary)] leading-relaxed">
                El <span className="font-medium text-[var(--color-text)]">coste de mano de obra</span> es 0 € porque no tienes configurado tu coste por hora. Ve a <b>Ajustes</b> para configurarlo y ver datos reales.
              </p>
            </div>
          )}

          {metrics.revenue === 0 && (
            <div className="text-[12.5px] text-[var(--color-text-secondary)] leading-relaxed">
              Añade un presupuesto o una tarifa por hora para ver el margen de este proyecto.
              Mientras tanto, ya estamos contabilizando el coste interno ({fmtCurrency(metrics.directCost, 0)}).
            </div>
          )}
        </div>
        {metrics.revenue > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, metrics.profitabilityPct))}%`,
                  background: metrics.profitabilityPct >= 20 ? 'var(--color-green)' : metrics.profitabilityPct >= 10 ? 'var(--color-orange)' : 'var(--color-red)',
                }}
              />
            </div>
            <span
              className="text-[12px] font-semibold tabular-nums"
              style={{ color: metrics.profitabilityPct >= 20 ? 'var(--color-green)' : metrics.profitabilityPct >= 10 ? 'var(--color-orange)' : 'var(--color-red)' }}
            >
              {fmt(metrics.profitabilityPct, 1)}%
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}

function FinRow({ label, value, bold, positive }: {
  label: string; value: number; bold?: boolean; positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[13px] gap-3">
      <span className={clsx('min-w-0 truncate', bold ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]')}>{label}</span>
      <span className={clsx(
        'tabular-nums shrink-0',
        bold ? 'font-semibold' : 'font-medium',
        positive ? 'text-[var(--color-green)]' : value < 0 ? 'text-[var(--color-red)]' : 'text-[var(--color-text)]',
      )}>
        {value >= 0 ? '' : '-'}{fmtCurrency(Math.abs(value), 0)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Horas
// ---------------------------------------------------------------------------

function HoursTab({ entries, project, toast, onAdd, onRefresh, confirm }: {
  entries:  ProjectDetail['timeEntries'];
  project:  ProjectDetail;
  toast:    (type: 'success' | 'error' | 'info', msg: string) => void;
  onAdd:    () => void;
  onRefresh: () => void;
  confirm:  (opts: { title: string; message: string; confirmText: string; variant?: 'danger' }) => Promise<boolean>;
}) {
  const [editEntry, setEditEntry] = useState<ProjectDetail['timeEntries'][0] | null>(null);

  function splitISO(iso: string | null | undefined): { date: string; time: string } {
    if (!iso) return { date: '', time: '' };
    const d = new Date(iso);
    return {
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
    };
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Eliminar entrada',
      message: 'Esta entrada de tiempo se eliminará permanentemente.',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/v1/time-entries/${id}`);
      toast('success', 'Entrada eliminada');
      onRefresh();
    } catch {
      toast('error', 'Error al eliminar la entrada');
    }
  }

  if (entries.length === 0) {
    return (
      <Card padding="lg" className="text-center py-10">
        <Clock className="w-8 h-8 text-[var(--color-text-tertiary)] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">Sin entradas de tiempo registradas</p>
        <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onAdd}>
          Añadir entrada
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            {entries.length} entrada{entries.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onAdd}>
              Añadir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                exportCsv(`proyecto-${project.name}-horas`, [
                  { header: 'Fecha',          value: (e: typeof entries[0]) => e.startedAt.slice(0, 10) },
                  { header: 'Empleado',       value: (e: typeof entries[0]) => e.user?.fullName ?? '' },
                  { header: 'Descripción',    value: (e: typeof entries[0]) => e.description ?? '' },
                  { header: 'Duración (min)', value: (e: typeof entries[0]) => e.durationMin },
                  { header: 'Facturable',     value: (e: typeof entries[0]) => e.isBillable ? 'Sí' : 'No' },
                ], entries);
                toast('success', 'Horas exportadas');
              }}
            >
              CSV
            </Button>
          </div>
        </div>
        {entries.map((entry) => {
          const start = splitISO(entry.startedAt);
          const end   = splitISO(entry.endedAt ?? undefined);
          return (
            <div
              key={entry.id}
              className="group flex items-center gap-3 rounded-[14px] px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-medium)] transition-colors duration-150"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[var(--color-text)]">
                    {entry.user?.fullName ?? 'Sin asignar'}
                  </span>
                  {entry.isBillable && <Badge variant="blue" size="sm">Facturable</Badge>}
                </div>
                {entry.description && (
                  <p className="text-[12px] text-[var(--color-text-secondary)] truncate mt-0.5">{entry.description}</p>
                )}
                {start.time && end.time && (
                  <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5 tabular-nums">
                    {start.time} → {end.time}
                  </p>
                )}
              </div>
              <span className="text-[13px] font-semibold text-[var(--color-text)] tabular-nums shrink-0">
                {fmtDuration(entry.durationMin)}
              </span>
              <span className="text-[12px] text-[var(--color-text-tertiary)] shrink-0 hidden sm:block">
                {fmtDate(entry.startedAt)}
              </span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditEntry(entry)}
                  aria-label="Editar"
                  className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:text-[var(--color-blue)] hover:bg-[var(--color-blue-subtle)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  aria-label="Eliminar"
                  className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-subtle)] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal editar entrada de horas */}
      {editEntry && (
        <EditEntryModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={() => { setEditEntry(null); onRefresh(); }}
          toast={toast}
        />
      )}
    </>
  );
}

function EditEntryModal({ entry, onClose, onSaved, toast }: {
  entry: ProjectDetail['timeEntries'][0];
  onClose: () => void;
  onSaved: () => void;
  toast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  function splitISO(iso: string | null | undefined): { date: string; time: string } {
    if (!iso) return { date: '', time: '' };
    const d = new Date(iso);
    return {
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
    };
  }
  const startParsed = splitISO(entry.startedAt);
  const endParsed   = splitISO(entry.endedAt ?? undefined);

  const [startDate,    setStartDate]    = useState(startParsed.date);
  const [startTime,    setStartTime]    = useState(startParsed.time);
  const [endDate,      setEndDate]      = useState(endParsed.date || startParsed.date);
  const [endTime,      setEndTime]      = useState(endParsed.time);
  const [description,  setDescription]  = useState(entry.description ?? '');
  const [isBillable,   setIsBillable]   = useState(entry.isBillable);
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState('');

  async function save() {
    if (!startDate || !startTime || !endDate || !endTime) {
      setErr('Completa inicio y fin'); return;
    }
    const startISO = new Date(`${startDate}T${startTime}`).toISOString();
    const endISO   = new Date(`${endDate}T${endTime}`).toISOString();
    if (new Date(endISO) <= new Date(startISO)) {
      setErr('La hora de fin debe ser posterior al inicio'); return;
    }
    setSaving(true);
    try {
      await api.patch(`/v1/time-entries/${entry.id}`, {
        startedAt: startISO, endedAt: endISO, description: description.trim() || null, isBillable,
      });
      toast('success', 'Entrada actualizada');
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar entrada"
      subtitle="Modifica los datos de esta entrada de tiempo"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={save}>Guardar cambios</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          label="Descripción"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: cambio de turbo, revisión general..."
        />
        <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] p-3 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Inicio</p>
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Fecha" value={startDate} onChange={(v) => { setStartDate(v); setErr(''); }} />
            <TimeInput  label="Hora"  value={startTime} onChange={(e) => { setStartTime(e.target.value); setErr(''); }} />
          </div>
        </div>
        <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] p-3 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Fin</p>
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Fecha" value={endDate} onChange={(v) => { setEndDate(v); setErr(''); }} min={startDate || undefined} />
            <TimeInput  label="Hora"  value={endTime} onChange={(e) => { setEndTime(e.target.value); setErr(''); }} />
          </div>
        </div>
        <Toggle checked={isBillable} onChange={setIsBillable} label="Facturable al cliente" />
        {err && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.20)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
            <p className="text-[13px] text-[var(--color-red)]">{err}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Tab: Costes
// ---------------------------------------------------------------------------

function CostsTab({ costs, project, toast, onAdd, onRefresh, confirm }: {
  costs:    VarCost[];
  project:  ProjectDetail;
  toast:    (type: 'success' | 'error' | 'info', msg: string) => void;
  onAdd:    () => void;
  onRefresh: () => void;
  confirm:  (opts: { title: string; message: string; confirmText: string; variant?: 'danger' }) => Promise<boolean>;
}) {
  const [editCost, setEditCost] = useState<VarCost | null>(null);

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Eliminar coste',
      message: 'Este coste variable se eliminará permanentemente.',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/v1/variable-costs/${id}`);
      toast('success', 'Coste eliminado');
      onRefresh();
    } catch {
      toast('error', 'Error al eliminar el coste');
    }
  }

  if (costs.length === 0) {
    return (
      <Card padding="lg" className="text-center py-10">
        <Receipt className="w-8 h-8 text-[var(--color-text-tertiary)] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">Sin costes variables asociados</p>
        <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onAdd}>
          Añadir coste
        </Button>
      </Card>
    );
  }

  const defMarkup = toNum(project.partsMarkupPct);
  const total     = costs.reduce((s, c) => s + partBreakdown(c, defMarkup).realCost, 0);
  const totalClient = costs.reduce((s, c) => s + partBreakdown(c, defMarkup).clientPrice, 0);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[12px] text-[var(--color-text-secondary)]">
            Coste real: <span className="font-semibold text-[var(--color-text)]">{fmtCurrency(total)}</span>
            {totalClient > total && (
              <>
                {' · '}
                Al cliente: <span className="font-semibold text-[var(--color-blue)]">{fmtCurrency(totalClient)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onAdd}>
              Añadir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                exportCsv(`proyecto-${project.name}-costes`, [
                  { header: 'Nombre',    value: (c: VarCost) => c.name },
                  { header: 'Importe',   value: (c: VarCost) => c.amount },
                  { header: 'Cantidad',  value: (c: VarCost) => c.quantity ?? 1 },
                  { header: 'IVA %',     value: (c: VarCost) => c.vatRate ?? 21 },
                  { header: 'IVA inc.',  value: (c: VarCost) => c.priceIncludesVat ? 'Sí' : 'No' },
                  { header: 'Margen %',  value: (c: VarCost) => c.markupPct ?? '' },
                  { header: 'Fecha',     value: (c: VarCost) => c.date.slice(0, 10) },
                  { header: 'Categoría', value: (c: VarCost) => c.category ?? '' },
                ], costs);
                toast('success', 'Costes exportados');
              }}
            >
              CSV
            </Button>
          </div>
        </div>
        {costs.map((cost) => {
          const br = partBreakdown(cost, defMarkup);
          return (
            <div
              key={cost.id}
              className="group flex items-center gap-3 rounded-[14px] px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-medium)] transition-colors duration-150"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[var(--color-text)]">{cost.name}</span>
                  {cost.category && <Badge variant="gray" size="sm">{cost.category}</Badge>}
                  {toNum(cost.quantity) > 1 && <Badge variant="gray" size="sm">×{fmt(toNum(cost.quantity), 0)}</Badge>}
                  {cost.priceIncludesVat && <Badge variant="gray" size="sm">IVA inc.</Badge>}
                </div>
                <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                  {fmtDate(cost.date)} · Base {fmtCurrency(br.netBase)} + IVA {fmtCurrency(br.vatAmount)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[14px] font-semibold text-[var(--color-text)] tabular-nums">{fmtCurrency(br.realCost)}</div>
                {br.clientPrice > br.realCost && (
                  <div className="text-[11px] text-[var(--color-blue)] tabular-nums">→ {fmtCurrency(br.clientPrice)}</div>
                )}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditCost(cost)}
                  aria-label="Editar"
                  className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:text-[var(--color-blue)] hover:bg-[var(--color-blue-subtle)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
                <button
                  onClick={() => handleDelete(cost.id)}
                  aria-label="Eliminar"
                  className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-subtle)] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal editar coste */}
      {editCost && (
        <EditCostModal
          cost={editCost}
          project={project}
          onClose={() => setEditCost(null)}
          onSaved={() => { setEditCost(null); onRefresh(); }}
          toast={toast}
        />
      )}
    </>
  );
}

function EditCostModal({ cost, project, onClose, onSaved, toast }: {
  cost: VarCost;
  project: ProjectDetail;
  onClose: () => void;
  onSaved: () => void;
  toast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [name,    setName]    = useState(cost.name);
  const [amount,  setAmount]  = useState(String(cost.amount));
  const [quantity, setQuantity] = useState(String(cost.quantity ?? 1));
  const [priceIncludesVat, setPriceIncludesVat] = useState(cost.priceIncludesVat ?? false);
  const [vatRate, setVatRate] = useState(String(cost.vatRate ?? 21));
  const [markupPct, setMarkupPct] = useState(cost.markupPct != null ? String(cost.markupPct) : '');
  const [date,    setDate]    = useState(cost.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(cost.category ?? '');
  const [saving, setSaving]  = useState(false);
  const [err,    setErr]     = useState('');

  const preview = amount ? partBreakdown({
    id: '', tenantId: '', projectId: null, contractId: null, issueId: null, name: '',
    amount: amount || '0', quantity: quantity || '1',
    priceIncludesVat, vatRate: vatRate || '21',
    markupPct: markupPct || null, date: '', category: null,
  }, toNum(project.partsMarkupPct)) : null;

  async function save() {
    if (!name.trim() || !amount) { setErr('Nombre e importe son obligatorios'); return; }
    setSaving(true);
    try {
      await api.patch(`/v1/variable-costs/${cost.id}`, {
        name: name.trim(),
        amount: parseFloat(amount),
        quantity: quantity ? parseFloat(quantity) : 1,
        priceIncludesVat,
        vatRate: vatRate ? parseFloat(vatRate) : 21,
        markupPct: markupPct ? parseFloat(markupPct) : null,
        date,
        category: category.trim() || null,
      });
      toast('success', 'Coste actualizado');
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar coste"
      subtitle={cost.name}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={save}>Guardar cambios</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input label="Nombre *" type="text" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Importe *" type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(''); }} min="0" step="0.01" prefix="€" />
          <Input label="Cantidad" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0.01" step="1" />
          <DatePicker label="Fecha" value={date} onChange={setDate} />
        </div>
        <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-[var(--color-text)]">El importe incluye IVA</p>
              <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">
                {priceIncludesVat ? 'Se descompone el IVA desde el total.' : `Se añadirá el ${vatRate || 21}% encima.`}
              </p>
            </div>
            <Toggle checked={priceIncludesVat} onChange={setPriceIncludesVat} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input label="Tipo de IVA" type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} min="0" step="1" suffix="%" />
            <Input label="Margen cliente" type="number" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} min="0" step="1" suffix="%" hint="Deja vacío para usar el del proyecto" />
          </div>
        </div>
        <Input label="Categoría" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Piezas, consumibles..." />
        {preview && (
          <div className="rounded-[12px] bg-[var(--color-blue-subtle)] border border-[rgba(10,132,255,0.20)] p-3 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Coste real (con IVA)</span>
              <span className="font-semibold tabular-nums text-[var(--color-text)]">{fmtCurrency(preview.realCost)}</span>
            </div>
            {preview.clientPrice > preview.realCost && (
              <div className="flex justify-between mt-1">
                <span className="text-[var(--color-text-secondary)]">Precio al cliente</span>
                <span className="font-semibold tabular-nums text-[var(--color-blue)]">{fmtCurrency(preview.clientPrice)}</span>
              </div>
            )}
          </div>
        )}
        {err && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.20)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
            <p className="text-[13px] text-[var(--color-red)]">{err}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modal acción rápida: añadir horas al proyecto
// ---------------------------------------------------------------------------

type QuickHoursMode = 'range' | 'duration';

function QuickHoursModal({ open, onClose, project, onSaved }: {
  open: boolean; onClose: () => void; project: ProjectDetail; onSaved: () => void;
}) {
  const { toast } = useToast();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [mode,      setMode]      = useState<QuickHoursMode>('range');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [endTime,   setEndTime]   = useState('');
  const [durationH, setDurationH] = useState('');
  const [durationM, setDurationM] = useState('');
  const [description, setDescription] = useState('');
  const [isBillable,  setIsBillable]  = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(now.getMinutes()).padStart(2, '0');
    const hh1 = String((now.getHours() + 1) % 24).padStart(2, '0');
    setMode('range');
    setStartDate(today);
    setStartTime(`${hh}:${mm}`);
    setEndDate(today);
    setEndTime(`${hh1}:${mm}`);
    setDurationH(''); setDurationM('');
    setDescription('');
    setIsBillable(true);
    setErr('');
  }, [open, today]);

  async function save() {
    let startISO: string, endISO: string, durationMin: number | undefined;

    if (mode === 'duration') {
      const h = parseInt(durationH || '0', 10);
      const m = parseInt(durationM || '0', 10);
      const totalMin = h * 60 + m;
      if (totalMin <= 0) { setErr('Introduce al menos 1 minuto de duración'); return; }
      const now = new Date();
      endISO   = now.toISOString();
      startISO = new Date(now.getTime() - totalMin * 60 * 1000).toISOString();
      durationMin = totalMin;
    } else {
      if (!startDate || !startTime || !endDate || !endTime) {
        setErr('Completa inicio y fin'); return;
      }
      startISO = new Date(`${startDate}T${startTime}`).toISOString();
      endISO   = new Date(`${endDate}T${endTime}`).toISOString();
      if (new Date(endISO) <= new Date(startISO)) {
        setErr('La hora de fin debe ser posterior al inicio'); return;
      }
    }

    setSaving(true);
    try {
      await api.post('/v1/time-entries', {
        projectId:   project.id,
        description: description.trim() || null,
        startedAt:   startISO,
        endedAt:     endISO,
        ...(durationMin ? { durationMin } : {}),
        isBillable,
      });
      toast('success', 'Horas añadidas al proyecto');
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const totalPreviewMin = mode === 'duration'
    ? parseInt(durationH || '0', 10) * 60 + parseInt(durationM || '0', 10)
    : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Añadir horas al proyecto"
      subtitle={project.name}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={save}>Guardar</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          label="Descripción"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: cambio de turbo, revisión..."
        />

        <SegmentedControl<QuickHoursMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'range',    label: 'Hora de inicio y fin' },
            { value: 'duration', label: 'Solo la duración' },
          ]}
        />

        {mode === 'duration' ? (
          <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] p-4 space-y-3">
            <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              Escribe cuánto tiempo has trabajado. Se registrará hasta ahora mismo.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Horas" type="number" value={durationH} onChange={(e) => { setDurationH(e.target.value); setErr(''); }} min="0" step="1" placeholder="0" suffix="h" />
              <Input label="Minutos" type="number" value={durationM} onChange={(e) => { setDurationM(e.target.value); setErr(''); }} min="0" max="59" step="5" placeholder="0" suffix="min" />
            </div>
            {totalPreviewMin > 0 && (
              <p className="text-[12px] text-[var(--color-blue)] font-medium tabular-nums">
                Total: {Math.floor(totalPreviewMin / 60)}h {totalPreviewMin % 60}min
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Inicio</p>
              <div className="grid grid-cols-2 gap-3">
                <DatePicker label="Fecha" value={startDate} onChange={(v) => { setStartDate(v); setErr(''); }} />
                <TimeInput  label="Hora"  value={startTime} onChange={(e) => { setStartTime(e.target.value); setErr(''); }} />
              </div>
            </div>
            <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Fin</p>
              <div className="grid grid-cols-2 gap-3">
                <DatePicker label="Fecha" value={endDate} onChange={(v) => { setEndDate(v); setErr(''); }} min={startDate || undefined} />
                <TimeInput  label="Hora"  value={endTime} onChange={(e) => { setEndTime(e.target.value); setErr(''); }} />
              </div>
            </div>
          </>
        )}

        <Toggle checked={isBillable} onChange={setIsBillable} label="Facturable al cliente" />
        {err && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.20)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
            <p className="text-[13px] text-[var(--color-red)]">{err}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modal acción rápida: añadir coste variable al proyecto
// ---------------------------------------------------------------------------

function QuickCostModal({ open, onClose, project, onSaved }: {
  open: boolean; onClose: () => void; project: ProjectDetail; onSaved: () => void;
}) {
  const { toast } = useToast();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [name,   setName]   = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priceIncludesVat, setPriceIncludesVat] = useState(false);
  const [vatRate, setVatRate] = useState('21');
  const [markupPct, setMarkupPct] = useState('');
  const [date,   setDate]   = useState(today);
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(''); setAmount(''); setQuantity('1');
    setPriceIncludesVat(false); setVatRate('21');
    setMarkupPct(project.partsMarkupPct != null ? String(project.partsMarkupPct) : '');
    setDate(today); setCategory(''); setErr('');
  }, [open, today, project.partsMarkupPct]);

  async function save() {
    if (!name.trim() || !amount) {
      setErr('Nombre e importe son obligatorios');
      return;
    }
    setSaving(true);
    try {
      await api.post('/v1/variable-costs', {
        projectId: project.id,
        name:      name.trim(),
        amount:    parseFloat(amount),
        quantity:  quantity ? parseFloat(quantity) : 1,
        priceIncludesVat,
        vatRate:   vatRate ? parseFloat(vatRate) : 21,
        markupPct: markupPct ? parseFloat(markupPct) : null,
        date,
        category:  category.trim() || null,
      });
      toast('success', 'Coste añadido al proyecto');
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const preview = amount ? partBreakdown({
    id: '', tenantId: '', projectId: null, contractId: null, issueId: null, name: '',
    amount: amount || '0',
    quantity: quantity || '1',
    priceIncludesVat,
    vatRate: vatRate || '21',
    markupPct: markupPct || null,
    date: '', category: null,
  }, toNum(project.partsMarkupPct)) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Añadir coste al proyecto"
      subtitle={project.name}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={save}>Guardar</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          label="Nombre *"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErr(''); }}
          placeholder="Ej: Turbo, pastillas, licencia..."
        />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Importe *" type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(''); }} min="0" step="0.01" prefix="€" />
          <Input label="Cantidad"  type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0.01" step="1" />
          <DatePicker label="Fecha" value={date} onChange={setDate} />
        </div>

        <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-[var(--color-text)]">El importe incluye IVA</p>
              <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">
                {priceIncludesVat ? 'Se descompone el IVA desde el total.' : `Se añadirá el ${vatRate || 21}% encima.`}
              </p>
            </div>
            <Toggle checked={priceIncludesVat} onChange={setPriceIncludesVat} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input label="Tipo de IVA" type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} min="0" step="1" suffix="%" />
            <Input label="Margen cliente" type="number" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} min="0" step="1" suffix="%" hint="Deja vacío para usar el del proyecto" />
          </div>
        </div>

        <Input label="Categoría" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Piezas, consumibles..." />

        {preview && (
          <div className="rounded-[12px] bg-[var(--color-blue-subtle)] border border-[rgba(10,132,255,0.20)] p-3 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Coste real (con IVA)</span>
              <span className="font-semibold tabular-nums text-[var(--color-text)]">{fmtCurrency(preview.realCost)}</span>
            </div>
            {preview.clientPrice > preview.realCost && (
              <div className="flex justify-between mt-1">
                <span className="text-[var(--color-text-secondary)]">Precio al cliente</span>
                <span className="font-semibold tabular-nums text-[var(--color-blue)]">{fmtCurrency(preview.clientPrice)}</span>
              </div>
            )}
          </div>
        )}

        {err && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.20)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
            <p className="text-[13px] text-[var(--color-red)]">{err}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
