// ============================================================================
// DashboardPage.tsx — Panel principal de rentabilidad
// ============================================================================

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Clock, Receipt,
  AlertCircle, RefreshCw, ChevronRight,
  Plus, BarChart3, Sparkles, Wand2, Target,
  AlertTriangle, Lightbulb, Calendar as CalendarIcon,
} from 'lucide-react';
import { api }     from '@/lib/api';
import Card        from '@/components/ui/Card';
import Badge       from '@/components/ui/Badge';
import Button      from '@/components/ui/Button';
import KpiCard     from '@/components/ui/KpiCard';
import { useAuth }        from '@/context/AuthContext';
import { useOnboarding }  from '@/context/OnboardingContext';
import { fmt, fmtCurrency, greeting, toNum } from '@/lib/format';
import type { DashboardData, ApiResponse, ProjectMetrics, TimeEntry } from '@/types';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Helpers locales
// ---------------------------------------------------------------------------

function profitTone(pct: number): { tone: 'green' | 'orange' | 'red'; label: string; hex: string; bg: string } {
  if (pct >= 20) return { tone: 'green',  label: 'Rentable',  hex: '#30D158', bg: 'rgba(48,209,88,0.10)' };
  if (pct >= 10) return { tone: 'orange', label: 'Ajustado',  hex: '#FF9F0A', bg: 'rgba(255,159,10,0.12)' };
  return          { tone: 'red',    label: 'En riesgo', hex: '#FF453A', bg: 'rgba(255,69,58,0.10)' };
}

/** Agrega horas facturables por día para las últimas 14 jornadas */
function buildHoursSparkline(entries: TimeEntry[]): number[] {
  const days = 14;
  const buckets = new Array(days).fill(0);
  const today = new Date(); today.setHours(0,0,0,0);
  for (const e of entries) {
    if (!e.isBillable) continue;
    const d = new Date(e.startedAt); d.setHours(0,0,0,0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < days) {
      buckets[days - 1 - diff] += toNum(e.durationMin) / 60;
    }
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const { open: openTutorial } = useOnboarding();
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [res, all] = await Promise.all([
        api.get<ApiResponse<DashboardData>>('/v1/dashboard'),
        api.get<TimeEntry[]>('/v1/time-entries'),
      ]);
      setData(res.data);
      setEntries(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  const sparkline = useMemo(() => buildHoursSparkline(entries), [entries]);
  const recent    = useMemo(() => entries.slice(0, 5),          [entries]);
  const insights  = useMemo(() => (data ? buildInsights(data) : []), [data]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="w-12 h-12 rounded-full bg-[var(--color-red-subtle)] flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-[var(--color-red)]" strokeWidth={1.8} />
        </div>
        <div className="text-center">
          <p className="text-[16px] font-semibold text-[var(--color-text)]">Error al cargar datos</p>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">{error}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => load()} icon={<RefreshCw className="w-4 h-4" />}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { business, projects, summary } = data;
  const firstName = user?.fullName?.split(' ')[0] ?? '';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1240px] mx-auto">

      {/* ═══ Cabecera ═══ */}
      <header className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <p className="text-[13px] text-[var(--color-text-secondary)] font-medium mb-0.5">
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </p>
          <h1 className="text-[28px] sm:text-[32px] font-semibold text-[var(--color-text)] leading-tight tracking-tight">
            Dashboard
          </h1>
          <p className="text-[13px] text-[var(--color-text-tertiary)] mt-0.5 capitalize hidden sm:block">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => load()}
          className="p-2.5 rounded-[12px] text-[var(--color-text-secondary)] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={2} />
        </button>
      </header>

      {/* ═══ Hero: Tarifa Mínima (protagonista) ═══ */}
      <HeroRateCard
        minimumRate={toNum(business.minimumRate)}
        realHourlyCost={toNum(business.realHourlyCost)}
        onSimulate={() => navigate('/informes?simular=1')}
        onHowTo={() => openTutorial('main')}
      />

      {/* ═══ KPIs secundarios ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-6 lg:mt-6 mb-6 lg:mb-8">
        <div className="animate-fade-up stagger-1">
          <KpiCard
            tone="blue"
            icon={<TrendingUp className="w-5 h-5" strokeWidth={2} />}
            label="Tarifa mínima"
            value={`${fmt(toNum(business.minimumRate))} €/h`}
            hint="Para cubrir costes"
          />
        </div>
        <div className="animate-fade-up stagger-2">
          <KpiCard
            tone="orange"
            icon={<TrendingDown className="w-5 h-5" strokeWidth={2} />}
            label="Coste/hora real"
            value={`${fmt(toNum(business.realHourlyCost))} €/h`}
            hint="Tu coste por hora"
          />
        </div>
        <div className="animate-fade-up stagger-3">
          <KpiCard
            tone="red"
            icon={<Receipt className="w-5 h-5" strokeWidth={2} />}
            label="Costes fijos/mes"
            value={fmtCurrency(toNum(summary.totalFixedCostsMonthly), 0)}
            hint="Gastos recurrentes"
          />
        </div>
        <div className="animate-fade-up stagger-4">
          <KpiCard
            tone="green"
            icon={<Clock className="w-5 h-5" strokeWidth={2} />}
            label="Horas facturables"
            value={`${fmt(toNum(summary.totalBillableHours), 1)} h`}
            hint={`${summary.activeProjectCount} proyectos activos`}
            spark={sparkline}
          />
        </div>
      </section>

      {/* ═══ Insights automáticos ═══ */}
      {insights.length > 0 && (
        <section className="mb-6 lg:mb-8 animate-fade-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[var(--color-blue)]" strokeWidth={2} />
            <h2 className="text-[15px] font-semibold text-[var(--color-text)] tracking-tight">
              Insights para ti
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
          </div>
        </section>
      )}

      {/* ═══ Proyectos ═══ */}
      {projects.length > 0 ? (
        <section className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="text-[18px] sm:text-[20px] font-semibold text-[var(--color-text)] tracking-tight">
              Proyectos activos
            </h2>
            <Badge variant="blue" dot pulse>
              {`${summary.activeProjectCount} activo${summary.activeProjectCount !== 1 ? 's' : ''}`}
            </Badge>
          </div>

          <div className="hidden lg:block">
            <Card padding="none" className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {['Proyecto','Ingresos','Coste directo','Coste indirecto','Margen neto','Rentabilidad'].map((h) => (
                      <th key={h} className={clsx(
                        'py-3.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]',
                        h === 'Proyecto' ? 'text-left px-5' : 'text-right px-5',
                      )}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, i) => (
                    <ProjectTableRow
                      key={p.id}
                      project={p}
                      index={i}
                      onOpen={() => navigate(`/proyectos/${p.id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="lg:hidden space-y-3">
            {projects.map((p, i) => (
              <ProjectMobileCard
                key={p.id}
                project={p}
                index={i}
                onOpen={() => navigate(`/proyectos/${p.id}`)}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyProjects onCreate={() => navigate('/proyectos')} />
      )}

      {/* ═══ Quick actions + Recent activity ═══ */}
      <section
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 lg:mt-8 animate-fade-up"
        style={{ animationDelay: '0.35s' }}
      >
        <Card padding="md">
          <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-3 tracking-tight">Acciones rápidas</h3>
          <div className="space-y-1">
            <QuickAction
              icon={<Clock className="w-4 h-4" />}
              color="#0A84FF"
              label="Fichar horas"
              sub="Iniciar timer o añadir manualmente"
              onClick={() => navigate('/horas')}
            />
            <QuickAction
              icon={<Plus className="w-4 h-4" />}
              color="#30D158"
              label="Nuevo proyecto"
              sub="Crear un nuevo proyecto"
              onClick={() => navigate('/proyectos')}
            />
            <QuickAction
              icon={<Wand2 className="w-4 h-4" />}
              color="#BF5AF2"
              label="Simular tarifa"
              sub="¿Y si subo mis precios?"
              onClick={() => navigate('/informes?simular=1')}
            />
            <QuickAction
              icon={<BarChart3 className="w-4 h-4" />}
              color="#FF9F0A"
              label="Ver informes"
              sub="Análisis de productividad"
              onClick={() => navigate('/informes')}
            />
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-[var(--color-text)] tracking-tight">Actividad reciente</h3>
            {recent.length > 0 && (
              <button
                onClick={() => navigate('/horas')}
                className="text-[12.5px] font-medium text-[var(--color-blue)] hover:underline"
              >
                Ver todo
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--color-blue-subtle)] flex items-center justify-center mb-2">
                <CalendarIcon className="w-4 h-4 text-[var(--color-blue)]" strokeWidth={1.8} />
              </div>
              <p className="text-[13px] text-[var(--color-text-secondary)]">Sin actividad reciente</p>
              <button
                onClick={() => navigate('/horas')}
                className="text-[12px] font-medium text-[var(--color-blue)] hover:underline mt-1"
              >
                Fichar primera hora
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {recent.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => entry.projectId ? navigate(`/proyectos/${entry.projectId}`) : navigate('/horas')}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-[10px] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-[10px] bg-[var(--color-blue-subtle)] flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5 text-[var(--color-blue)]" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--color-text)] truncate group-hover:text-[var(--color-blue)] transition-colors">
                      {entry.project?.name ?? 'Sin proyecto'}
                    </p>
                    <p className="text-[11.5px] text-[var(--color-text-tertiary)]">
                      {fmt(toNum(entry.durationMin) / 60, 1)}h · {new Date(entry.startedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  {entry.isBillable && <Badge variant="blue">€</Badge>}
                </button>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

// ===========================================================================
// Hero — Tarifa mínima
// ===========================================================================

function HeroRateCard({
  minimumRate, realHourlyCost, onSimulate, onHowTo,
}: { minimumRate: number; realHourlyCost: number; onSimulate: () => void; onHowTo: () => void }) {
  const margin = minimumRate - realHourlyCost;
  return (
    <div
      className="relative overflow-hidden rounded-[24px] border border-[var(--color-border)] animate-fade-up"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Fondo aurora animado */}
      <div className="absolute inset-0 bg-aurora opacity-100" />
      {/* Grano */}
      <div className="absolute inset-0 bg-dots opacity-40" />

      <div className="relative px-6 py-8 sm:px-10 sm:py-10 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.6)] dark:bg-[rgba(0,0,0,0.25)] backdrop-blur-md border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.08)] text-[11.5px] font-semibold text-[var(--color-blue)] mb-3">
            <Target className="w-3.5 h-3.5" strokeWidth={2.4} />
            Tu tarifa mínima
          </div>
          <p className="text-[56px] sm:text-[72px] font-semibold tracking-[-0.03em] leading-none text-gradient-brand">
            {fmt(minimumRate, 2)}<span className="text-[32px] sm:text-[40px] ml-2 text-[var(--color-text-secondary)] font-medium">€/h</span>
          </p>
          <p className="text-[14px] sm:text-[15px] text-[var(--color-text-secondary)] mt-3 max-w-[520px] leading-relaxed">
            Sumamos todos tus costes del mes (gastos fijos, materiales y coste de tu mano de obra) y los dividimos entre las horas que has facturado. Eso es tu coste real por hora. Le añadimos un 30% de margen mínimo y obtenemos esta tarifa. <b className="text-[var(--color-text)]">Por debajo de {fmt(minimumRate, 0)} €/h</b>, estás perdiendo dinero.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Button variant="primary" size="md" icon={<Wand2 className="w-4 h-4" strokeWidth={2.2} />} onClick={onSimulate}>
              Simular "¿y si…?"
            </Button>
            <Button variant="glass" size="md" onClick={onHowTo}>
              ¿Cómo se calcula?
            </Button>
          </div>
        </div>

        {/* Panel derecho: desglose */}
        <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
            Desglose
          </p>
          <BreakdownRow
            label="Coste/hora real"
            value={`${fmt(realHourlyCost)} €`}
            color="#FF9F0A"
          />
          <BreakdownRow
            label="Margen objetivo"
            value={`+${fmt(margin)} €`}
            color="#30D158"
          />
          <div className="h-px bg-[var(--color-border)] my-3" />
          <BreakdownRow
            label="Tarifa mínima"
            value={`${fmt(minimumRate)} €/h`}
            strong
          />
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label, value, color, strong,
}: { label: string; value: string; color?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
        {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}
        {label}
      </span>
      <span className={clsx(
        'tabular-nums',
        strong ? 'text-[16px] font-semibold text-[var(--color-text)]' : 'text-[13.5px] font-medium text-[var(--color-text)]',
      )}>
        {value}
      </span>
    </div>
  );
}

// ===========================================================================
// Insights automáticos
// ===========================================================================

type Insight = {
  tone: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  icon: React.ReactNode;
  title: string;
  body: string;
};

function buildInsights(d: DashboardData): Insight[] {
  const out: Insight[] = [];
  const projects = d.projects ?? [];

  // 1. Proyectos en pérdidas
  const losing = projects.filter((p) => toNum(p.profitabilityPct) < 10);
  if (losing.length > 0) {
    out.push({
      tone: 'red',
      icon: <AlertTriangle className="w-4 h-4" />,
      title: losing.length === 1
        ? `1 proyecto en riesgo: ${losing[0].name}`
        : `${losing.length} proyectos en riesgo`,
      body: 'Su rentabilidad está por debajo del 10%. Revisa sus horas o sube la tarifa.',
    });
  }

  // 2. Concentración de cliente
  const byClient: Record<string, number> = {};
  let totalRev = 0;
  for (const p of projects) {
    const c = p.clientName || '—';
    byClient[c] = (byClient[c] || 0) + toNum(p.revenue);
    totalRev  += toNum(p.revenue);
  }
  if (totalRev > 0) {
    const [top] = Object.entries(byClient).sort((a, b) => b[1] - a[1]);
    if (top && top[1] / totalRev > 0.40) {
      out.push({
        tone: 'orange',
        icon: <Lightbulb className="w-4 h-4" />,
        title: `${top[0]} concentra el ${Math.round(top[1] / totalRev * 100)}% de tus ingresos`,
        body: 'Considera diversificar clientes para reducir el riesgo.',
      });
    }
  }

  // 3. Costes fijos altos
  const fixed = toNum(d.summary.totalFixedCostsMonthly);
  const monthlyRev = totalRev / 12;
  if (monthlyRev > 0 && fixed / monthlyRev > 0.35) {
    out.push({
      tone: 'orange',
      icon: <Receipt className="w-4 h-4" />,
      title: 'Tus costes fijos son elevados',
      body: `Representan aprox. el ${Math.round(fixed / monthlyRev * 100)}% de tus ingresos mensuales. Revisa suscripciones.`,
    });
  }

  // 4. Proyecto estrella
  const stars = projects.filter((p) => toNum(p.profitabilityPct) >= 30);
  if (stars.length > 0) {
    const best = stars.sort((a, b) => toNum(b.profitabilityPct) - toNum(a.profitabilityPct))[0];
    out.push({
      tone: 'green',
      icon: <Sparkles className="w-4 h-4" />,
      title: `${best.name} es tu proyecto estrella`,
      body: `Rentabilidad del ${fmt(toNum(best.profitabilityPct), 1)}%. ¿Puedes captar clientes similares?`,
    });
  }

  return out.slice(0, 3);
}

function InsightCard({ tone, icon, title, body }: Insight) {
  const toneColors: Record<Insight['tone'], { bg: string; fg: string; border: string }> = {
    blue:   { bg: 'var(--color-blue-subtle)',   fg: 'var(--color-blue)',       border: 'rgba(10,132,255,0.20)' },
    green:  { bg: 'var(--color-green-subtle)',  fg: '#25A244',                 border: 'rgba(48,209,88,0.22)' },
    orange: { bg: 'var(--color-orange-subtle)', fg: '#C87800',                 border: 'rgba(255,159,10,0.24)' },
    red:    { bg: 'var(--color-red-subtle)',    fg: '#D93025',                 border: 'rgba(255,69,58,0.22)' },
    purple: { bg: 'var(--color-purple-subtle)', fg: '#9A33C7',                 border: 'rgba(191,90,242,0.22)' },
  };
  const c = toneColors[tone];
  return (
    <div
      className="relative rounded-[14px] p-4 border flex items-start gap-3"
      style={{ background: c.bg, borderColor: c.border }}
    >
      <div
        className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.6)', color: c.fg }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-snug" style={{ color: c.fg }}>{title}</p>
        <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

// ===========================================================================
// Project row — Desktop
// ===========================================================================

function ProjectTableRow({
  project, index, onOpen,
}: { project: ProjectMetrics; index: number; onOpen: () => void }) {
  const t = profitTone(toNum(project.profitabilityPct));
  const pct = Math.min(100, Math.max(0, toNum(project.profitabilityPct)));

  return (
    <tr
      onClick={onOpen}
      className={clsx(
        'border-b border-[var(--color-border)] last:border-0 cursor-pointer',
        'hover:bg-[rgba(10,132,255,0.04)] transition-colors',
        index % 2 === 1 && 'bg-[rgba(0,0,0,0.012)] dark:bg-[rgba(255,255,255,0.015)]',
      )}
    >
      <td className="px-5 py-4">
        <p className="text-[14px] font-medium text-[var(--color-text)]">{project.name}</p>
        {project.clientName && <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">{project.clientName}</p>}
      </td>
      <td className="px-5 py-4 text-right text-[13px] text-[var(--color-text)] tabular-nums">{fmt(toNum(project.revenue))} €</td>
      <td className="px-5 py-4 text-right text-[13px] text-[var(--color-text)] tabular-nums">{fmt(toNum(project.directCost))} €</td>
      <td className="px-5 py-4 text-right text-[13px] text-[var(--color-text)] tabular-nums">{fmt(toNum(project.indirectCost))} €</td>
      <td className="px-5 py-4 text-right">
        <span className={clsx('text-[13.5px] font-semibold tabular-nums', toNum(project.netMargin) >= 0 ? 'text-[#25A244] dark:text-[#5CE67D]' : 'text-[#D93025] dark:text-[#FF6961]')}>
          {toNum(project.netMargin) >= 0 ? '+' : ''}{fmt(toNum(project.netMargin))} €
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: t.hex }}>
              {fmt(toNum(project.profitabilityPct), 1)}%
            </span>
            <Badge variant={t.tone} dot>{t.label}</Badge>
          </div>
          <div className="w-[88px] h-1.5 rounded-full bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.08)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: t.hex }} />
          </div>
        </div>
      </td>
    </tr>
  );
}

// ===========================================================================
// Project card — Móvil
// ===========================================================================

function ProjectMobileCard({
  project, index, onOpen,
}: { project: ProjectMetrics; index: number; onOpen: () => void }) {
  const t = profitTone(toNum(project.profitabilityPct));
  const pct = Math.min(100, Math.max(0, toNum(project.profitabilityPct)));

  return (
    <button
      onClick={onOpen}
      className="block w-full text-left bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border)] overflow-hidden animate-fade-up hover-lift"
      style={{
        boxShadow: 'var(--shadow-card)',
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'both',
      }}
    >
      <div className="h-1" style={{ background: t.hex }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[15px] font-semibold text-[var(--color-text)] leading-tight">{project.name}</p>
            {project.clientName && (
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">{project.clientName}</p>
            )}
          </div>
          <Badge variant={t.tone} dot>{t.label}</Badge>
        </div>

        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[10.5px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-0.5">
              Rentabilidad
            </p>
            <p className="text-[40px] font-bold tabular-nums leading-none tracking-tight" style={{ color: t.hex }}>
              {fmt(toNum(project.profitabilityPct), 1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10.5px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-0.5">
              Margen neto
            </p>
            <p className={clsx('text-[20px] font-semibold tabular-nums', toNum(project.netMargin) >= 0 ? 'text-[#25A244] dark:text-[#5CE67D]' : 'text-[#D93025] dark:text-[#FF6961]')}>
              {toNum(project.netMargin) >= 0 ? '+' : ''}{fmt(toNum(project.netMargin), 0)} €
            </p>
          </div>
        </div>

        <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: t.bg }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: t.hex }}
          />
        </div>

        <div className="flex justify-between items-center text-[12px] border-t border-[var(--color-border)] pt-3">
          <div>
            <p className="text-[var(--color-text-tertiary)]">Ingresos</p>
            <p className="font-semibold text-[var(--color-text)] tabular-nums">{fmt(toNum(project.revenue), 0)} €</p>
          </div>
          <div>
            <p className="text-[var(--color-text-tertiary)]">Coste directo</p>
            <p className="font-semibold text-[var(--color-text)] tabular-nums">{fmt(toNum(project.directCost), 0)} €</p>
          </div>
          <div className="text-right">
            <p className="text-[var(--color-text-tertiary)]">Indirecto</p>
            <p className="font-semibold text-[var(--color-text)] tabular-nums">{fmt(toNum(project.indirectCost), 0)} €</p>
          </div>
        </div>
      </div>
    </button>
  );
}

// ===========================================================================
// Quick Action
// ===========================================================================

function QuickAction({ icon, color, label, sub, onClick }: {
  icon: React.ReactNode; color: string; label: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-[12px] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.04)] transition-all text-left group"
    >
      <div
        className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{ background: `${color}1A`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium text-[var(--color-text)]">{label}</p>
        <p className="text-[11.5px] text-[var(--color-text-tertiary)]">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
    </button>
  );
}

// ===========================================================================
// Empty state & Skeleton
// ===========================================================================

function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <Card padding="lg" className="flex flex-col items-center py-14 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-full bg-[var(--color-blue-subtle)] flex items-center justify-center mb-4 animate-float">
        <TrendingUp className="w-7 h-7 text-[var(--color-blue)]" strokeWidth={1.6} />
      </div>
      <p className="text-[17px] font-semibold text-[var(--color-text)] tracking-tight">Sin proyectos activos</p>
      <p className="text-[14px] text-[var(--color-text-secondary)] mt-1 max-w-[320px] leading-relaxed">
        Crea tu primer proyecto para empezar a ver tu rentabilidad en tiempo real.
      </p>
      <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onCreate} className="mt-5">
        Nuevo proyecto
      </Button>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1240px] mx-auto">
      <div className="mb-6">
        <div className="skeleton h-4 w-32 mb-2" />
        <div className="skeleton h-8 w-48 mb-1" />
        <div className="skeleton h-3 w-56 hidden sm:block" />
      </div>
      <div className="skeleton h-[220px] rounded-[24px] mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {[0,1,2,3].map((i) => (
          <div key={i} className="bg-[var(--color-surface)] rounded-[16px] p-4 border border-[var(--color-border)]">
            <div className="skeleton w-10 h-10 rounded-[12px] mb-3" />
            <div className="skeleton h-3 w-20 mb-2" />
            <div className="skeleton h-6 w-28" />
          </div>
        ))}
      </div>
      <div className="skeleton h-8 w-40 mb-3" />
      <div className="space-y-3">
        {[0,1,2].map((i) => <div key={i} className="skeleton h-32 lg:h-16 rounded-[16px]" />)}
      </div>
    </div>
  );
}
