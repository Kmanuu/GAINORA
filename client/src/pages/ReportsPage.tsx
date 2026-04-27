// ============================================================================
// ReportsPage.tsx — Informes, gráficos y simulador "¿y si...?"
// ============================================================================

import { useEffect, useState, useCallback, useMemo, useId } from 'react';
import {
  BarChart3, Clock, DollarSign, TrendingUp, Wand2,
  AlertCircle, RefreshCw, Download, Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { api }       from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { fmt, fmtCurrency, fmtDuration, toNum } from '@/lib/format';
import type {
  TimeEntry, FixedCost, VarCost, DashboardData, ApiResponse,
} from '@/types';
import Card             from '@/components/ui/Card';
import Button           from '@/components/ui/Button';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useToast }     from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

type Period = 'week' | 'month' | 'quarter';

const CHART_COLORS = ['#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2', '#FF453A', '#64D2FF', '#FFD60A', '#FF375F'];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { toast } = useToast();
  const [entries,   setEntries]   = useState<TimeEntry[]>([]);
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
      api.get<FixedCost[]>('/v1/fixed-costs'),
      api.get<VarCost[]>('/v1/variable-costs'),
      api.get<ApiResponse<DashboardData>>('/v1/dashboard'),
    ])
      .then(([e, f, v, d]) => {
        setEntries(e);
        setFixed(f);
        setVariable(v);
        setDashboard(d.data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // -------------------------------------------------------------------------
  // Métricas
  // -------------------------------------------------------------------------

  const now = new Date();
  const filteredEntries = useMemo(() => entries.filter((e) => {
    const d = new Date(e.startedAt);
    if (period === 'week') {
      return getWeekNumber(d) === getWeekNumber(now) && d.getFullYear() === now.getFullYear();
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    const q    = Math.floor(d.getMonth() / 3);
    const nowQ = Math.floor(now.getMonth() / 3);
    return q === nowQ && d.getFullYear() === now.getFullYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [entries, period]);

  const totalMinutes    = filteredEntries.reduce((s, e) => s + e.durationMin, 0);
  const billableMinutes = filteredEntries.filter((e) => e.isBillable).reduce((s, e) => s + e.durationMin, 0);
  const billablePct     = totalMinutes > 0 ? (billableMinutes / totalMinutes) * 100 : 0;
  const uniqueDays      = new Set(filteredEntries.map((e) => e.startedAt.slice(0, 10))).size;
  const avgDailyHours   = uniqueDays > 0 ? totalMinutes / 60 / uniqueDays : 0;

  // Horas por proyecto (donut)
  const projectList = useMemo(() => {
    const map = filteredEntries.reduce<Record<string, { name: string; minutes: number; billable: number }>>((acc, e) => {
      const name = e.project?.name ?? 'Sin proyecto';
      const key  = e.projectId ?? '__none__';
      if (!acc[key]) acc[key] = { name, minutes: 0, billable: 0 };
      acc[key].minutes += e.durationMin;
      if (e.isBillable) acc[key].billable += e.durationMin;
      return acc;
    }, {});
    return Object.entries(map)
      .map(([id, data], i) => ({ id, color: CHART_COLORS[i % CHART_COLORS.length], ...data }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [filteredEntries]);

  // Horas por día de la semana
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const hoursByDay = new Array(7).fill(0) as number[];
  filteredEntries.forEach((e) => {
    const d = new Date(e.startedAt);
    const day = (d.getDay() + 6) % 7;
    hoursByDay[day] += e.durationMin;
  });
  const maxDayMin = Math.max(...hoursByDay, 1);

  // Tendencia diaria (línea)
  const trendData = useMemo(() => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const buckets = new Array(days).fill(0) as number[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filteredEntries.forEach((e) => {
      const d = new Date(e.startedAt);
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (diff >= 0 && diff < days) buckets[days - 1 - diff] += e.durationMin / 60;
    });
    return buckets;
  }, [filteredEntries, period]);

  // Costes
  const fixedMonthly = fixed
    .filter((c) => c.isActive)
    .reduce((s, c) => {
      const a = toNum(c.amount);
      if (c.frequency === 'QUARTERLY') return s + a / 3;
      if (c.frequency === 'YEARLY')    return s + a / 12;
      return s + a;
    }, 0);
  const varTotal = variable.reduce((s, c) => s + toNum(c.amount), 0);

  // -------------------------------------------------------------------------
  // Loading / error
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[960px] mx-auto">
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
        <AlertCircle className="w-8 h-8 text-[var(--color-red)]" strokeWidth={1.5} />
        <p className="text-[15px] font-medium text-[var(--color-text)]">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => load()} icon={<RefreshCw className="w-4 h-4" />}>
          Reintentar
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[960px] mx-auto">

      {/* Header */}
      <header className="flex items-start justify-between mb-5 animate-fade-up">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-[var(--color-text)] tracking-[-0.02em]">Informes</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">Análisis de productividad, costes y tarifas</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Download className="w-4 h-4" strokeWidth={2} />}
          onClick={() => {
            exportCsv('informe-horaspro', [
              { header: 'Fecha',          value: (e: TimeEntry) => e.startedAt.slice(0, 10) },
              { header: 'Proyecto',       value: (e: TimeEntry) => e.project?.name ?? '' },
              { header: 'Descripción',    value: (e: TimeEntry) => e.description ?? '' },
              { header: 'Duración (min)', value: (e: TimeEntry) => e.durationMin },
              { header: 'Facturable',     value: (e: TimeEntry) => e.isBillable ? 'Sí' : 'No' },
            ], filteredEntries);
            toast('success', 'Informe exportado');
          }}
        >
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </header>

      {/* Periodo */}
      <div className="mb-6 animate-fade-up" style={{ animationDelay: '40ms', animationFillMode: 'both' } as React.CSSProperties}>
        <SegmentedControl<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'week',    label: 'Semana' },
            { value: 'month',   label: 'Mes' },
            { value: 'quarter', label: 'Trimestre' },
          ]}
        />
      </div>

      {/* KPIs */}
      <section
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 animate-fade-up"
        style={{ animationDelay: '80ms', animationFillMode: 'both' } as React.CSSProperties}
      >
        <ReportKpi
          label="Horas totales"
          value={fmtDuration(totalMinutes)}
          sub={`${filteredEntries.length} entrada${filteredEntries.length !== 1 ? 's' : ''}`}
          color="blue"
          icon={<Clock className="w-4 h-4" strokeWidth={1.9} />}
        />
        <ReportKpi
          label="Facturables"
          value={`${fmt(billablePct, 0)}%`}
          sub={fmtDuration(billableMinutes)}
          color="green"
          icon={<DollarSign className="w-4 h-4" strokeWidth={1.9} />}
        />
        <ReportKpi
          label="Media diaria"
          value={`${fmt(avgDailyHours, 1)}h`}
          sub="por día activo"
          color="orange"
          icon={<BarChart3 className="w-4 h-4" strokeWidth={1.9} />}
        />
        <ReportKpi
          label="Costes fijos"
          value={`${fmt(fixedMonthly, 0)} €`}
          sub="por mes"
          color="red"
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.9} />}
        />
      </section>

      {/* Tendencia */}
      <Card
        padding="md"
        className="mb-5 animate-fade-up"
        style={{ animationDelay: '120ms', animationFillMode: 'both' } as React.CSSProperties}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-[var(--color-text)]">Tendencia de horas</h3>
          <span className="text-[11px] text-[var(--color-text-tertiary)]">
            últim{trendData.length === 30 ? 'os 30 días' : trendData.length === 7 ? 'a semana' : 'os 90 días'}
          </span>
        </div>
        <TrendChart data={trendData} />
      </Card>

      {/* Distribución por proyecto + semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card
          padding="md"
          className="animate-fade-up"
          style={{ animationDelay: '160ms', animationFillMode: 'both' } as React.CSSProperties}
        >
          <h3 className="text-[14px] font-semibold text-[var(--color-text)] mb-3">Por proyecto</h3>
          {projectList.length === 0 ? (
            <p className="text-[13px] text-[var(--color-text-secondary)] text-center py-8">Sin datos en este período</p>
          ) : (
            <div className="flex items-center gap-5">
              <DonutChart
                data={projectList.map((p) => ({ value: p.minutes, color: p.color }))}
                total={totalMinutes}
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                {projectList.slice(0, 5).map((p) => {
                  const pct = totalMinutes > 0 ? (p.minutes / totalMinutes) * 100 : 0;
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-[12px]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="text-[var(--color-text)] truncate flex-1">{p.name}</span>
                      <span className="text-[var(--color-text-tertiary)] tabular-nums">{fmt(pct, 0)}%</span>
                    </div>
                  );
                })}
                {projectList.length > 5 && (
                  <p className="text-[11px] text-[var(--color-text-tertiary)] pt-1">+{projectList.length - 5} más</p>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card
          padding="md"
          className="animate-fade-up"
          style={{ animationDelay: '180ms', animationFillMode: 'both' } as React.CSSProperties}
        >
          <h3 className="text-[14px] font-semibold text-[var(--color-text)] mb-4">Distribución semanal</h3>
          <div className="flex items-end gap-2 h-[130px]">
            {hoursByDay.map((min, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-medium text-[var(--color-text)] tabular-nums">
                  {min > 0 ? `${fmt(min / 60, 1)}h` : ''}
                </span>
                <div
                  className="w-full rounded-t-[6px] transition-all duration-500"
                  style={{
                    height: `${min > 0 ? Math.max(8, (min / maxDayMin) * 86) : 4}px`,
                    background: min > 0
                      ? 'linear-gradient(180deg, var(--color-blue) 0%, rgba(10,132,255,0.7) 100%)'
                      : 'var(--color-border-subtle)',
                    boxShadow: min > 0 ? '0 2px 6px rgba(10,132,255,0.25)' : undefined,
                  }}
                />
                <span className="text-[10px] font-medium text-[var(--color-text-tertiary)]">{dayLabels[i]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Simulador "¿y si...?" */}
      {dashboard && dashboard.business.minimumRate > 0 && (
        <RateSimulator
          minimumRate={toNum(dashboard.business.minimumRate)}
          realCost={toNum(dashboard.business.realHourlyCost)}
          fixedMonthly={fixedMonthly}
          monthlyBillableHours={uniqueDays > 0 ? (billableMinutes / 60) : 0}
        />
      )}

      {/* Resumen de costes */}
      <Card
        padding="md"
        className="animate-fade-up mt-5"
        style={{ animationDelay: '240ms', animationFillMode: 'both' } as React.CSSProperties}
      >
        <h3 className="text-[14px] font-semibold text-[var(--color-text)] mb-4">Resumen de costes</h3>
        <div className="space-y-2.5">
          <CostLine label="Costes fijos (mensual)"    value={fixedMonthly} color="var(--color-red)" />
          <CostLine label="Costes variables (total)"  value={varTotal}     color="var(--color-purple)" />
          <div className="border-t border-[var(--color-border-subtle)] pt-2.5">
            <CostLine label="Total costes" value={fixedMonthly + varTotal} bold />
          </div>
          {dashboard && dashboard.business.minimumRate > 0 && (
            <div
              className="mt-3 p-3 rounded-[12px] border"
              style={{
                background:     'var(--color-blue-subtle)',
                borderColor:    'rgba(10,132,255,0.15)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--color-text-secondary)]">Tarifa mínima recomendada</span>
                <span className="text-[16px] font-bold text-[var(--color-blue)] tabular-nums">
                  {fmtCurrency(toNum(dashboard.business.minimumRate))}/h
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

type KpiColor = 'blue' | 'green' | 'orange' | 'red' | 'purple';

const KPI_GRADIENTS: Record<KpiColor, { bg: string; icon: string; text: string }> = {
  blue:   { bg: 'linear-gradient(180deg, rgba(10,132,255,0.14) 0%, rgba(10,132,255,0.08) 100%)',  icon: 'var(--color-blue)',   text: 'var(--color-blue)' },
  green:  { bg: 'linear-gradient(180deg, rgba(48,209,88,0.14) 0%, rgba(48,209,88,0.08) 100%)',    icon: 'var(--color-green)',  text: 'var(--color-green)' },
  orange: { bg: 'linear-gradient(180deg, rgba(255,159,10,0.14) 0%, rgba(255,159,10,0.08) 100%)',  icon: 'var(--color-orange)', text: 'var(--color-orange)' },
  red:    { bg: 'linear-gradient(180deg, rgba(255,69,58,0.14) 0%, rgba(255,69,58,0.08) 100%)',    icon: 'var(--color-red)',    text: 'var(--color-red)' },
  purple: { bg: 'linear-gradient(180deg, rgba(191,90,242,0.14) 0%, rgba(191,90,242,0.08) 100%)',  icon: 'var(--color-purple)', text: 'var(--color-purple)' },
};

function ReportKpi({ label, value, sub, color, icon }: {
  label: string; value: string; sub: string; color: KpiColor; icon: React.ReactNode;
}) {
  const g = KPI_GRADIENTS[color];
  return (
    <Card padding="none" className="p-3.5">
      <div
        className="w-8 h-8 rounded-[9px] flex items-center justify-center mb-2.5"
        style={{ background: g.bg, color: g.icon }}
      >
        {icon}
      </div>
      <p className="text-[20px] font-semibold text-[var(--color-text)] tabular-nums leading-none tracking-[-0.01em]">{value}</p>
      <p className="text-[11.5px] font-semibold text-[var(--color-text)] mt-1.5">{label}</p>
      <p className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">{sub}</p>
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
        <span className={clsx('text-[13px]', bold ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]')}>
          {label}
        </span>
      </div>
      <span className={clsx('text-[13px] tabular-nums', bold ? 'font-bold text-[var(--color-text)]' : 'font-semibold text-[var(--color-text)]')}>
        {fmtCurrency(value)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrendChart — línea SVG con gradiente
// ---------------------------------------------------------------------------

function TrendChart({ data }: { data: number[] }) {
  const gradId = useId();
  const w = 800, h = 140, padX = 4, padY = 12;
  const max = Math.max(...data, 1);

  const step = (w - padX * 2) / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => ({
    x: padX + i * step,
    y: padY + (h - padY * 2) * (1 - v / max),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points.at(-1)!.x} ${h - padY} L ${points[0].x} ${h - padY} Z`;

  const hasData = data.some((v) => v > 0);

  if (!hasData) {
    return (
      <div className="h-[140px] flex items-center justify-center">
        <p className="text-[13px] text-[var(--color-text-tertiary)]">Sin horas registradas en este período</p>
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[140px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#0A84FF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0A84FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke="#0A84FF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 && (
        <>
          <circle
            cx={points.at(-1)!.x}
            cy={points.at(-1)!.y}
            r="8"
            fill="#0A84FF"
            fillOpacity="0.20"
          />
          <circle
            cx={points.at(-1)!.x}
            cy={points.at(-1)!.y}
            r="3"
            fill="#0A84FF"
          />
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// DonutChart
// ---------------------------------------------------------------------------

function DonutChart({ data, total }: { data: { value: number; color: string }[]; total: number }) {
  const size = 120, stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <div className="w-[120px] h-[120px] rounded-full border-[14px] border-[var(--color-border-subtle)]" />
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border-subtle)" strokeWidth={stroke} />
      {data.map((d, i) => {
        const pct = d.value / total;
        const dash = pct * c;
        const currentOffset = data.slice(0, i).reduce((sum, prev) => sum + (prev.value / total) * c, 0);
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-currentOffset}
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// RateSimulator — "¿y si...?"
// ---------------------------------------------------------------------------

function RateSimulator({ minimumRate, realCost, fixedMonthly, monthlyBillableHours }: {
  minimumRate:          number;
  realCost:             number;
  fixedMonthly:         number;
  monthlyBillableHours: number;
}) {
  const [rate, setRate] = useState<number>(Math.round(minimumRate));
  const [hours, setHours] = useState<number>(Math.max(20, Math.round(monthlyBillableHours || 80)));

  const revenue   = rate * hours;
  const profit    = revenue - fixedMonthly;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
  const yearly    = profit * 12;

  const breakEvenHours = rate > 0 ? fixedMonthly / rate : 0;
  const isHealthy      = profit > 0 && marginPct >= 20;
  const isTight        = profit > 0 && marginPct < 20;
  const belowRealCost  = realCost > 0 && rate < realCost;
  const warnMessage    = belowRealCost
    ? `A ${fmtCurrency(rate, 0)}/h ni siquiera cubres tu coste real (${fmtCurrency(realCost, 0)}/h). Cada hora genera pérdidas directas.`
    : `A ${fmtCurrency(rate, 0)}/h estás por debajo de tu tarifa mínima (${fmtCurrency(minimumRate, 0)}/h). No generarás beneficio.`;

  return (
    <Card
      padding="md"
      className="relative overflow-hidden animate-fade-up"
      style={{ animationDelay: '220ms', animationFillMode: 'both' } as React.CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-12 w-56 h-56 rounded-full blur-3xl opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(191,90,242,0.28) 0%, transparent 70%)' }}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(180deg, rgba(191,90,242,0.16) 0%, rgba(10,132,255,0.10) 100%)',
                border:     '1px solid rgba(191,90,242,0.20)',
              }}
            >
              <Wand2 className="w-4 h-4 text-[var(--color-purple)]" strokeWidth={1.9} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--color-text)] leading-tight">Simulador "¿y si...?"</h3>
              <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">Ajusta tarifa y horas para ver el impacto real</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <SimulatorSlider
            label="Tarifa"
            unit="€/h"
            value={rate}
            min={Math.max(5, Math.round(minimumRate * 0.5))}
            max={Math.max(200, Math.round(minimumRate * 2.5))}
            onChange={setRate}
            referenceLabel="Mínima"
            referenceValue={Math.round(minimumRate)}
          />
          <SimulatorSlider
            label="Horas facturables al mes"
            unit="h"
            value={hours}
            min={10}
            max={200}
            onChange={setHours}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SimMetric label="Ingresos/mes"  value={fmtCurrency(revenue, 0)} tone="neutral" />
          <SimMetric
            label="Beneficio/mes"
            value={fmtCurrency(profit, 0)}
            tone={profit > 0 ? 'green' : 'red'}
          />
          <SimMetric
            label="Margen"
            value={`${fmt(marginPct, 0)}%`}
            tone={isHealthy ? 'green' : isTight ? 'orange' : 'red'}
          />
          <SimMetric
            label="Proyección anual"
            value={fmtCurrency(yearly, 0)}
            tone="neutral"
            hint={breakEvenHours > 0 ? `${fmt(breakEvenHours, 0)}h cubren costes` : undefined}
          />
        </div>

        {rate < minimumRate && (
          <div
            className="mt-4 flex items-start gap-2 p-3 rounded-[12px] border"
            style={{
              background:  'var(--color-red-subtle)',
              borderColor: 'rgba(255,69,58,0.18)',
            }}
          >
            <AlertCircle className="w-4 h-4 text-[var(--color-red)] shrink-0 mt-0.5" strokeWidth={1.8} />
            <p className="text-[12.5px] text-[var(--color-red)]">{warnMessage}</p>
          </div>
        )}
        {rate >= minimumRate && isHealthy && (
          <div
            className="mt-4 flex items-start gap-2 p-3 rounded-[12px] border"
            style={{
              background:  'var(--color-green-subtle)',
              borderColor: 'rgba(48,209,88,0.18)',
            }}
          >
            <Sparkles className="w-4 h-4 text-[var(--color-green)] shrink-0 mt-0.5" strokeWidth={1.9} />
            <p className="text-[12.5px] text-[var(--color-green)]">
              A {fmtCurrency(rate, 0)}/h × {hours}h/mes tu margen es del {fmt(marginPct, 0)}%. Sano y sostenible.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function SimulatorSlider({ label, unit, value, min, max, onChange, referenceLabel, referenceValue }: {
  label: string;
  unit:  string;
  value: number;
  min:   number;
  max:   number;
  onChange: (v: number) => void;
  referenceLabel?: string;
  referenceValue?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">{label}</span>
        <span className="text-[18px] font-semibold text-[var(--color-text)] tabular-nums">
          {value} <span className="text-[11px] font-normal text-[var(--color-text-tertiary)]">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-[var(--color-blue)] h-1.5"
        style={{
          background: `linear-gradient(90deg, var(--color-blue) 0%, var(--color-blue) ${pct}%, var(--color-border-subtle) ${pct}%, var(--color-border-subtle) 100%)`,
          borderRadius: 6,
        }}
      />
      <div className="flex items-center justify-between mt-1 text-[10.5px] text-[var(--color-text-tertiary)] tabular-nums">
        <span>{min}</span>
        {referenceValue !== undefined && (
          <span className="text-[var(--color-blue)] font-medium">
            {referenceLabel}: {referenceValue}{unit}
          </span>
        )}
        <span>{max}</span>
      </div>
    </div>
  );
}

type SimTone = 'neutral' | 'green' | 'red' | 'orange';

function SimMetric({ label, value, tone, hint }: {
  label: string; value: string; tone: SimTone; hint?: string;
}) {
  const toneColor = {
    neutral: 'var(--color-text)',
    green:   'var(--color-green)',
    red:     'var(--color-red)',
    orange:  'var(--color-orange)',
  }[tone];
  return (
    <div
      className="rounded-[12px] p-3 border"
      style={{
        background:  'var(--color-surface-alt)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      <p className="text-[10.5px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-[0.06em]">{label}</p>
      <p
        className="text-[17px] font-semibold tabular-nums mt-0.5 leading-none"
        style={{ color: toneColor }}
      >
        {value}
      </p>
      {hint && <p className="text-[10.5px] text-[var(--color-text-tertiary)] mt-1.5">{hint}</p>}
    </div>
  );
}
