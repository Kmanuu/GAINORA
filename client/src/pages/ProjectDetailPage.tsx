// ============================================================================
// ProjectDetailPage.tsx — Vista de detalle de un proyecto con métricas
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, DollarSign, TrendingUp,
  AlertCircle, RefreshCw, FileText, Receipt,
} from 'lucide-react';
import clsx from 'clsx';
import { api }       from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import type { Project, TimeEntry, VarCost } from '@/types';
import Card          from '@/components/ui/Card';
import Badge         from '@/components/ui/Badge';
import Button        from '@/components/ui/Button';
import { useToast }  from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: string | number | null | undefined) {
  if (v == null) return 0;
  return typeof v === 'number' ? v : parseFloat(v) || 0;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

type ProjectStatus = Project['status'];

const STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: 'Borrador', ACTIVE: 'Activo', PAUSED: 'Pausado',
  COMPLETED: 'Completado', CANCELLED: 'Cancelado',
};
const STATUS_BADGE: Record<ProjectStatus, 'gray' | 'green' | 'orange' | 'blue' | 'red'> = {
  DRAFT: 'gray', ACTIVE: 'green', PAUSED: 'orange',
  COMPLETED: 'blue', CANCELLED: 'red',
};

type Tab = 'resumen' | 'horas' | 'costes';

// ---------------------------------------------------------------------------
// Tipos de la respuesta de detalle
// ---------------------------------------------------------------------------

interface ProjectDetail extends Project {
  timeEntries: (TimeEntry & { user?: { fullName: string; hourlyCost?: string | number } })[];
  varCosts:    VarCost[];
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project,  setProject]  = useState<ProjectDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState<Tab>('resumen');

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
        <AlertCircle className="w-8 h-8 text-[#FF453A]" strokeWidth={1.5} />
        <p className="text-[15px] font-medium">{error || 'Proyecto no encontrado'}</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/proyectos')}>
            Volver
          </Button>
          <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCw className="w-4 h-4" />}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Métricas calculadas
  const totalHours   = project.timeEntries.reduce((sum, e) => sum + e.durationMin, 0) / 60;
  const billableHours = project.timeEntries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.durationMin, 0) / 60;
  const directCost   = project.timeEntries.reduce((sum, e) => {
    const cost = e.user?.hourlyCost ? toNum(e.user.hourlyCost) : 0;
    return sum + (e.durationMin / 60) * cost;
  }, 0);
  const varCostsTotal = project.varCosts.reduce((sum, c) => sum + toNum(c.amount), 0);
  const totalCost     = directCost + varCostsTotal;
  const budget        = toNum(project.budgetAmount);
  const margin        = budget > 0 ? budget - totalCost : 0;
  const marginPct     = budget > 0 ? (margin / budget) * 100 : 0;
  const budgetHours   = project.budgetHours ?? 0;
  const hoursUsedPct  = budgetHours > 0 ? (totalHours / budgetHours) * 100 : 0;

  const TABS: { label: string; value: Tab; icon: React.ElementType }[] = [
    { label: 'Resumen',        value: 'resumen', icon: TrendingUp },
    { label: `Horas (${project.timeEntries.length})`, value: 'horas',   icon: Clock },
    { label: `Costes (${project.varCosts.length})`,   value: 'costes',  icon: Receipt },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[900px] mx-auto">

      {/* Navegación */}
      <button
        onClick={() => navigate('/proyectos')}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[#0A84FF] hover:text-[#0070E0] transition-colors mb-4 animate-fade-up"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        Proyectos
      </button>

      {/* Header */}
      <header className="mb-6 animate-fade-up" style={{ animationDelay: '40ms', animationFillMode: 'both' }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={STATUS_BADGE[project.status]} dot>
                {STATUS_LABEL[project.status]}
              </Badge>
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#1D1D1F] leading-tight">
              {project.name}
            </h1>
            {project.clientName && (
              <p className="text-[14px] text-[#6E6E73] mt-0.5">{project.clientName}</p>
            )}
          </div>
        </div>
        {project.description && (
          <p className="text-[14px] text-[#6E6E73] mt-2 leading-relaxed">{project.description}</p>
        )}
      </header>

      {/* KPI Cards */}
      <section
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-fade-up"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        <MiniKpi
          label="Horas totales"
          value={`${fmt(totalHours, 1)}h`}
          sub={budgetHours > 0 ? `${fmt(hoursUsedPct, 0)}% del presupuesto` : `${fmt(billableHours, 1)}h facturables`}
          color="#0A84FF"
          icon={<Clock className="w-4 h-4" />}
        />
        <MiniKpi
          label="Coste directo"
          value={`${fmt(directCost, 0)} €`}
          sub={`${project.timeEntries.length} entradas`}
          color="#FF9F0A"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <MiniKpi
          label="Costes variables"
          value={`${fmt(varCostsTotal, 0)} €`}
          sub={`${project.varCosts.length} gastos`}
          color="#BF5AF2"
          icon={<Receipt className="w-4 h-4" />}
        />
        <MiniKpi
          label={budget > 0 ? 'Margen neto' : 'Coste total'}
          value={budget > 0 ? `${margin >= 0 ? '+' : ''}${fmt(margin, 0)} €` : `${fmt(totalCost, 0)} €`}
          sub={budget > 0 ? `${fmt(marginPct, 1)}% rentabilidad` : 'Sin presupuesto definido'}
          color={budget > 0 ? (marginPct >= 20 ? '#30D158' : marginPct >= 10 ? '#FF9F0A' : '#FF453A') : '#6E6E73'}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </section>

      {/* Barra de progreso del presupuesto */}
      {budgetHours > 0 && (
        <Card
          padding="none"
          className="p-4 mb-6 animate-fade-up"
          style={{ animationDelay: '120ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-[#6E6E73]">Horas consumidas</span>
            <span className="text-[12px] font-semibold text-[#1D1D1F] tabular-nums">
              {fmt(totalHours, 1)} / {budgetHours}h
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, hoursUsedPct)}%`,
                background: hoursUsedPct > 100 ? '#FF453A' : hoursUsedPct > 80 ? '#FF9F0A' : '#0A84FF',
              }}
            />
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 mb-5 animate-fade-up"
        style={{ animationDelay: '160ms', animationFillMode: 'both' }}
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150',
              tab === t.value
                ? 'bg-[#1D1D1F] text-white'
                : 'bg-white border border-[rgba(0,0,0,0.08)] text-[#6E6E73] hover:text-[#1D1D1F] hover:border-[rgba(0,0,0,0.16)]',
            )}
          >
            <t.icon className="w-3.5 h-3.5" strokeWidth={1.8} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido por tab */}
      <div className="animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        {tab === 'resumen' && (
          <SummaryTab project={project} budget={budget} totalCost={totalCost} margin={margin} marginPct={marginPct} />
        )}
        {tab === 'horas' && (
          <HoursTab entries={project.timeEntries} toast={toast} />
        )}
        {tab === 'costes' && (
          <CostsTab costs={project.varCosts} toast={toast} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini KPI Card
// ---------------------------------------------------------------------------

function MiniKpi({ label, value, sub, color, icon }: {
  label: string; value: string; sub: string; color: string; icon: React.ReactNode;
}) {
  return (
    <Card padding="none" className="p-3.5">
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center mb-2"
        style={{ background: `${color}14`, color }}
      >
        {icon}
      </div>
      <p className="text-[18px] font-semibold text-[#1D1D1F] tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] font-medium text-[#1D1D1F] mt-0.5">{label}</p>
      <p className="text-[10px] text-[#86868B] mt-0.5">{sub}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab: Resumen
// ---------------------------------------------------------------------------

function SummaryTab({ project, budget, totalCost, margin, marginPct }: {
  project: ProjectDetail; budget: number; totalCost: number; margin: number; marginPct: number;
}) {
  return (
    <div className="space-y-4">
      {/* Información del proyecto */}
      <Card padding="md">
        <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#6E6E73]" strokeWidth={1.8} />
          Información
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]">
          {project.clientName && (
            <>
              <span className="text-[#6E6E73]">Cliente</span>
              <span className="font-medium text-[#1D1D1F]">{project.clientName}</span>
            </>
          )}
          {budget > 0 && (
            <>
              <span className="text-[#6E6E73]">Presupuesto</span>
              <span className="font-medium text-[#1D1D1F]">{fmt(budget, 0)} €</span>
            </>
          )}
          {project.budgetHours && (
            <>
              <span className="text-[#6E6E73]">Horas presupuestadas</span>
              <span className="font-medium text-[#1D1D1F]">{project.budgetHours}h</span>
            </>
          )}
          {project.startDate && (
            <>
              <span className="text-[#6E6E73]">Inicio</span>
              <span className="font-medium text-[#1D1D1F]">{fmtDate(project.startDate)}</span>
            </>
          )}
          {project.endDate && (
            <>
              <span className="text-[#6E6E73]">Fin</span>
              <span className="font-medium text-[#1D1D1F]">{fmtDate(project.endDate)}</span>
            </>
          )}
        </div>
      </Card>

      {/* Desglose financiero */}
      {budget > 0 && (
        <Card padding="md">
          <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#6E6E73]" strokeWidth={1.8} />
            Desglose financiero
          </h3>
          <div className="space-y-2">
            <FinRow label="Ingresos (presupuesto)" value={budget} positive />
            <FinRow label="Coste de mano de obra" value={-totalCost + project.varCosts.reduce((s, c) => s + toNum(c.amount), 0)} />
            <FinRow label="Costes variables" value={-project.varCosts.reduce((s, c) => s + toNum(c.amount), 0)} />
            <div className="border-t border-[rgba(0,0,0,0.06)] pt-2 mt-2">
              <FinRow label="Margen neto" value={margin} bold positive={margin >= 0} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, marginPct))}%`,
                  background: marginPct >= 20 ? '#30D158' : marginPct >= 10 ? '#FF9F0A' : '#FF453A',
                }}
              />
            </div>
            <span className="text-[12px] font-semibold tabular-nums" style={{
              color: marginPct >= 20 ? '#30D158' : marginPct >= 10 ? '#FF9F0A' : '#FF453A',
            }}>
              {fmt(marginPct, 1)}%
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

function FinRow({ label, value, bold, positive }: {
  label: string; value: number; bold?: boolean; positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className={clsx(bold ? 'font-semibold text-[#1D1D1F]' : 'text-[#6E6E73]')}>{label}</span>
      <span className={clsx(
        'tabular-nums',
        bold ? 'font-semibold' : 'font-medium',
        positive ? 'text-[#25A244]' : value < 0 ? 'text-[#D93025]' : 'text-[#1D1D1F]',
      )}>
        {value >= 0 ? '' : '-'}{fmt(Math.abs(value), 0)} €
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Horas
// ---------------------------------------------------------------------------

function HoursTab({ entries, toast }: {
  entries: ProjectDetail['timeEntries'];
  toast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <Card padding="lg" className="text-center py-10">
        <Clock className="w-8 h-8 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-[14px] text-[#6E6E73]">Sin entradas de tiempo registradas</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-[#6E6E73]">
          {entries.length} entrada{entries.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            exportCsv('proyecto-horas', [
              { header: 'Fecha',       value: (e: typeof entries[0]) => e.startedAt.slice(0, 10) },
              { header: 'Empleado',    value: (e: typeof entries[0]) => e.user?.fullName ?? '' },
              { header: 'Descripción', value: (e: typeof entries[0]) => e.description ?? '' },
              { header: 'Duración (min)', value: (e: typeof entries[0]) => e.durationMin },
              { header: 'Facturable',  value: (e: typeof entries[0]) => e.isBillable ? 'Sí' : 'No' },
            ], entries);
            toast('success', 'Horas exportadas');
          }}
        >
          Exportar CSV
        </Button>
      </div>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 bg-white border border-[rgba(0,0,0,0.06)] rounded-[12px] px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium text-[#1D1D1F]">
                {entry.user?.fullName ?? 'Sin asignar'}
              </span>
              {entry.isBillable && <Badge variant="blue">Facturable</Badge>}
            </div>
            {entry.description && (
              <p className="text-[12px] text-[#6E6E73] truncate mt-0.5">{entry.description}</p>
            )}
          </div>
          <span className="text-[13px] font-semibold text-[#1D1D1F] tabular-nums shrink-0">
            {fmtDuration(entry.durationMin)}
          </span>
          <span className="text-[12px] text-[#86868B] shrink-0 hidden sm:block">
            {fmtDate(entry.startedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Costes
// ---------------------------------------------------------------------------

function CostsTab({ costs, toast }: {
  costs: VarCost[];
  toast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  if (costs.length === 0) {
    return (
      <Card padding="lg" className="text-center py-10">
        <Receipt className="w-8 h-8 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-[14px] text-[#6E6E73]">Sin costes variables asociados</p>
      </Card>
    );
  }

  const total = costs.reduce((s, c) => s + toNum(c.amount), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-[#6E6E73]">
          Total: <span className="font-semibold text-[#1D1D1F]">{fmt(total, 2)} €</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            exportCsv('proyecto-costes', [
              { header: 'Nombre',    value: (c: VarCost) => c.name },
              { header: 'Importe',   value: (c: VarCost) => c.amount },
              { header: 'Fecha',     value: (c: VarCost) => c.date.slice(0, 10) },
              { header: 'Categoría', value: (c: VarCost) => c.category ?? '' },
            ], costs);
            toast('success', 'Costes exportados');
          }}
        >
          Exportar CSV
        </Button>
      </div>
      {costs.map((cost) => (
        <div
          key={cost.id}
          className="flex items-center gap-3 bg-white border border-[rgba(0,0,0,0.06)] rounded-[12px] px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-medium text-[#1D1D1F]">{cost.name}</span>
            {cost.category && (
              <span className="ml-2"><Badge variant="gray">{cost.category}</Badge></span>
            )}
            <p className="text-[11px] text-[#86868B] mt-0.5">{fmtDate(cost.date)}</p>
          </div>
          <span className="text-[14px] font-semibold text-[#1D1D1F] tabular-nums shrink-0">
            {fmt(toNum(cost.amount), 2)} €
          </span>
        </div>
      ))}
    </div>
  );
}
