// ============================================================================
// ReportsPage.tsx — Informes y análisis de productividad
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3, Clock, DollarSign, TrendingUp,
  AlertCircle, RefreshCw, Download, Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import { api }       from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import type { TimeEntry, Project, FixedCost, VarCost, DashboardData, ApiResponse } from '@/types';
import Card          from '@/components/ui/Card';
import Badge         from '@/components/ui/Badge';
import Button        from '@/components/ui/Button';
import { useToast }  from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function toNum(v: string | number | null | undefined) {
  if (v == null) return 0;
  return typeof v === 'number' ? v : parseFloat(v) || 0;
}

type Period = 'week' | 'month' | 'quarter';

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { toast } = useToast();
  const [entries,   setEntries]   = useState<TimeEntry[]>([]);
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [fixed,     setFixed]     = useState<FixedCost[]>([]);
  const [variable,  setVariable]  = useState<VarCost[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [period,    setPeriod]    = useState<Period>('month');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get<TimeEntry[]>('/v1/time-entries'),
      api.get<Project[]>('/v1/projects'),
      api.get<FixedCost[]>('/v1/fixed-costs'),
      api.get<VarCost[]>('/v1/variable-costs'),
      api.get<ApiResponse<DashboardData>>('/v1/dashboard'),
    ])
      .then(([e, p, f, v, d]) => {
        setEntries(e);
        setProjects(p);
        setFixed(f);
        setVariable(v);
        setDashboard(d.data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[900px] mx-auto">
        <div className="skeleton h-8 w-40 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[0,1,2,3].map((i) => <div key={i} className="skeleton h-24 rounded-[16px]" />)}
        </div>
        <div className="skeleton h-64 rounded-[16px]" />
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

  // Calcular métricas por período
  const now = new Date();
  const filteredEntries = entries.filter((e) => {
    const d = new Date(e.startedAt);
    if (period === 'week') {
      return getWeekNumber(d) === getWeekNumber(now) && d.getFullYear() === now.getFullYear();
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    // quarter
    const q = Math.floor(d.getMonth() / 3);
    const nowQ = Math.floor(now.getMonth() / 3);
    return q === nowQ && d.getFullYear() === now.getFullYear();
  });

  const totalMinutes    = filteredEntries.reduce((s, e) => s + e.durationMin, 0);
  const billableMinutes = filteredEntries.filter((e) => e.isBillable).reduce((s, e) => s + e.durationMin, 0);
  const billablePct     = totalMinutes > 0 ? (billableMinutes / totalMinutes) * 100 : 0;
  const avgDailyHours   = filteredEntries.length > 0
    ? totalMinutes / 60 / new Set(filteredEntries.map((e) => e.startedAt.slice(0, 10))).size
    : 0;

  // Horas por proyecto
  const hoursByProject = filteredEntries.reduce<Record<string, { name: string; minutes: number; billable: number }>>((acc, e) => {
    const name = e.project?.name ?? 'Sin proyecto';
    const key  = e.projectId;
    if (!acc[key]) acc[key] = { name, minutes: 0, billable: 0 };
    acc[key].minutes += e.durationMin;
    if (e.isBillable) acc[key].billable += e.durationMin;
    return acc;
  }, {});

  const projectList = Object.entries(hoursByProject)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.minutes - a.minutes);

  const maxMinutes = projectList.length > 0 ? projectList[0].minutes : 1;

  // Horas por día de la semana
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const hoursByDay = new Array(7).fill(0);
  filteredEntries.forEach((e) => {
    const d = new Date(e.startedAt);
    const day = (d.getDay() + 6) % 7; // lunes=0
    hoursByDay[day] += e.durationMin;
  });
  const maxDayMin = Math.max(...hoursByDay, 1);

  const PERIOD_TABS: { label: string; value: Period }[] = [
    { label: 'Esta semana',    value: 'week' },
    { label: 'Este mes',       value: 'month' },
    { label: 'Este trimestre', value: 'quarter' },
  ];

  // Costes resumen
  const fixedMonthly = fixed
    .filter((c) => c.isActive)
    .reduce((s, c) => {
      const a = toNum(c.amount);
      if (c.frequency === 'QUARTERLY') return s + a / 3;
      if (c.frequency === 'YEARLY') return s + a / 12;
      return s + a;
    }, 0);
  const varTotal = variable.reduce((s, c) => s + toNum(c.amount), 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[900px] mx-auto">

      {/* Header */}
      <header className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#1D1D1F]">Informes</h1>
          <p className="text-[13px] text-[#6E6E73] mt-0.5">Análisis de productividad y costes</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Download className="w-4 h-4" strokeWidth={2} />}
          onClick={() => {
            exportCsv('informe-horaspro', [
              { header: 'Fecha',       value: (e: TimeEntry) => e.startedAt.slice(0, 10) },
              { header: 'Proyecto',    value: (e: TimeEntry) => e.project?.name ?? '' },
              { header: 'Descripción', value: (e: TimeEntry) => e.description ?? '' },
              { header: 'Duración (min)', value: (e: TimeEntry) => e.durationMin },
              { header: 'Facturable',  value: (e: TimeEntry) => e.isBillable ? 'Sí' : 'No' },
            ], filteredEntries);
            toast('success', 'Informe exportado');
          }}
        >
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </header>

      {/* Filtro de período */}
      <div className="flex gap-1.5 mb-6 animate-fade-up" style={{ animationDelay: '40ms', animationFillMode: 'both' }}>
        {PERIOD_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setPeriod(t.value)}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150',
              period === t.value
                ? 'bg-[#1D1D1F] text-white'
                : 'bg-white border border-[rgba(0,0,0,0.08)] text-[#6E6E73] hover:text-[#1D1D1F]',
            )}
          >
            <Calendar className="w-3.5 h-3.5" strokeWidth={1.8} />
            {t.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <section
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-fade-up"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        <ReportKpi
          label="Horas totales"
          value={fmtDuration(totalMinutes)}
          sub={`${filteredEntries.length} entradas`}
          color="#0A84FF"
          icon={<Clock className="w-4.5 h-4.5" />}
        />
        <ReportKpi
          label="Facturables"
          value={`${fmt(billablePct, 0)}%`}
          sub={fmtDuration(billableMinutes)}
          color="#30D158"
          icon={<DollarSign className="w-4.5 h-4.5" />}
        />
        <ReportKpi
          label="Media diaria"
          value={`${fmt(avgDailyHours, 1)}h`}
          sub="por día trabajado"
          color="#FF9F0A"
          icon={<BarChart3 className="w-4.5 h-4.5" />}
        />
        <ReportKpi
          label="Costes fijos"
          value={`${fmt(fixedMonthly, 0)} €`}
          sub="por mes"
          color="#FF453A"
          icon={<TrendingUp className="w-4.5 h-4.5" />}
        />
      </section>

      {/* Distribución por proyecto */}
      <Card
        padding="md"
        className="mb-5 animate-fade-up"
        style={{ animationDelay: '120ms', animationFillMode: 'both' }}
      >
        <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-4">Horas por proyecto</h3>
        {projectList.length === 0 ? (
          <p className="text-[13px] text-[#6E6E73] text-center py-6">Sin datos en este período</p>
        ) : (
          <div className="space-y-3">
            {projectList.map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium text-[#1D1D1F]">{p.name}</span>
                  <span className="text-[12px] font-semibold text-[#1D1D1F] tabular-nums">
                    {fmtDuration(p.minutes)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[rgba(0,0,0,0.05)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0A84FF] transition-all duration-500"
                    style={{ width: `${(p.minutes / maxMinutes) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-[#86868B]">
                    {fmt((p.billable / p.minutes) * 100, 0)}% facturable
                  </span>
                  <span className="text-[10px] text-[#86868B]">
                    {fmt((p.minutes / totalMinutes) * 100, 0)}% del total
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Distribución por día de la semana */}
      <Card
        padding="md"
        className="mb-5 animate-fade-up"
        style={{ animationDelay: '160ms', animationFillMode: 'both' }}
      >
        <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-4">Distribución semanal</h3>
        <div className="flex items-end gap-2 h-[120px]">
          {hoursByDay.map((min, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-medium text-[#1D1D1F] tabular-nums">
                {min > 0 ? `${fmt(min / 60, 1)}h` : ''}
              </span>
              <div
                className="w-full rounded-t-[6px] transition-all duration-500"
                style={{
                  height: `${min > 0 ? Math.max(8, (min / maxDayMin) * 80) : 4}px`,
                  background: min > 0 ? '#0A84FF' : 'rgba(0,0,0,0.06)',
                }}
              />
              <span className="text-[10px] font-medium text-[#86868B]">{dayLabels[i]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Resumen de costes */}
      <Card
        padding="md"
        className="animate-fade-up"
        style={{ animationDelay: '200ms', animationFillMode: 'both' }}
      >
        <h3 className="text-[14px] font-semibold text-[#1D1D1F] mb-4">Resumen de costes</h3>
        <div className="space-y-2.5">
          <CostLine label="Costes fijos (mensual)" value={fixedMonthly} color="#FF453A" />
          <CostLine label="Costes variables (total)" value={varTotal} color="#BF5AF2" />
          <div className="border-t border-[rgba(0,0,0,0.06)] pt-2.5">
            <CostLine label="Total costes" value={fixedMonthly + varTotal} bold />
          </div>
          {dashboard && dashboard.business.minimumRate > 0 && (
            <div className="mt-3 p-3 rounded-[12px] bg-[rgba(10,132,255,0.05)] border border-[rgba(10,132,255,0.12)]">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#6E6E73]">Tarifa mínima recomendada</span>
                <span className="text-[16px] font-bold text-[#0A84FF] tabular-nums">
                  {fmt(dashboard.business.minimumRate)} €/h
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function ReportKpi({ label, value, sub, color, icon }: {
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

function CostLine({ label, value, color, bold }: {
  label: string; value: number; color?: string; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
        <span className={clsx('text-[13px]', bold ? 'font-semibold text-[#1D1D1F]' : 'text-[#6E6E73]')}>
          {label}
        </span>
      </div>
      <span className={clsx('text-[13px] tabular-nums', bold ? 'font-bold text-[#1D1D1F]' : 'font-semibold text-[#1D1D1F]')}>
        {fmt(value, 2)} €
      </span>
    </div>
  );
}
