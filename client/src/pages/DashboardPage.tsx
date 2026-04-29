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
  Repeat, Wallet, LineChart,
} from 'lucide-react';
import { api }     from '@/lib/api';
import Card        from '@/components/ui/Card';
import Badge       from '@/components/ui/Badge';
import Button      from '@/components/ui/Button';
import KpiCard     from '@/components/ui/KpiCard';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useAuth }        from '@/context/AuthContext';
import { useOnboarding }  from '@/context/OnboardingContext';
import { usePermissions } from '@/hooks/useCan';
import { fmt, fmtCurrency, greeting, toNum } from '@/lib/format';
import type {
  DashboardData, ApiResponse, ProjectMetrics, TimeEntry,
  DashboardProjection, DashboardRangeKey, CollectionsHealth,
} from '@/types';
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
  const { role } = usePermissions();
  const canSeeFinancials = role === 'OWNER' || role === 'ADMIN';

  // EMPLOYEE y VIEWER no ven el dashboard financiero del tenant.
  // Se les sirve un panel reducido centrado en su trabajo personal.
  if (!canSeeFinancials) {
    return <PersonalDashboard />;
  }

  return <FinancialsDashboard user={user} />;
}

function FinancialsDashboard({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const navigate  = useNavigate();
  const { open: openTutorial } = useOnboarding();
  const [data,       setData]       = useState<DashboardData | null>(null);
  const [projection, setProjection] = useState<DashboardProjection | null>(null);
  const [entries,    setEntries]    = useState<TimeEntry[]>([]);
  const [collections, setCollections] = useState<CollectionsHealth | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [range,      setRange]      = useState<DashboardRangeKey>('month');

  const load = useCallback(async (silent = false, currentRange: DashboardRangeKey = range) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [res, proj, all, col] = await Promise.all([
        api.get<ApiResponse<DashboardData>>(`/v1/dashboard?range=${currentRange}`),
        api.get<ApiResponse<DashboardProjection>>('/v1/dashboard/projection?months=12'),
        api.get<TimeEntry[]>('/v1/time-entries'),
        api.get<ApiResponse<CollectionsHealth>>('/v1/dashboard/collections-health'),
      ]);
      setData(res.data);
      setProjection(proj.data);
      setEntries(all);
      setCollections(col.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(true, range); }, [load, range]);

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
      <header className="flex items-start justify-between mb-6 animate-fade-up gap-4 flex-wrap">
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
        <div className="flex items-center gap-2">
          <SegmentedControl<DashboardRangeKey>
            value={range}
            onChange={setRange}
            options={[
              { value: 'week',    label: 'Semana' },
              { value: 'month',   label: 'Mes' },
              { value: 'quarter', label: 'Trimestre' },
              { value: 'year',    label: 'Año' },
            ]}
          />
          <button
            onClick={() => load(false, range)}
            className="p-2.5 rounded-[12px] text-[var(--color-text-secondary)] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ═══ Hero: Tarifa Mínima (protagonista) ═══ */}
      {business.isReliable ? (
        <HeroRateCard
          minimumRate={business.minimumRate ?? 0}
          realHourlyCost={business.realHourlyCost ?? 0}
          overheadPerHour={business.overheadPerHour}
          directCostPerHour={business.directCostPerHour}
          onSimulate={() => navigate('/informes?simular=1')}
          onHowTo={() => openTutorial('main')}
        />
      ) : (
        <HeroUnreliableCard
          reason={business.unreliableReason ?? 'Datos insuficientes para calcular tu tarifa.'}
          billableHours={toNum(summary.totalBillableHours)}
          onTrack={() => navigate('/horas')}
          onConfigure={() => navigate('/ajustes#capacidad')}
        />
      )}

      {/* ═══ Suscripciones (solo si hay MRR > 0) ═══ */}
      {(toNum(summary.recurringRevenue ?? 0) > 0 || (projection?.activeSubscriptions ?? 0) > 0) && (
        <SubscriptionsBlock
          mrr={toNum(summary.recurringRevenue ?? projection?.mrr ?? 0)}
          projection={projection}
          activeContracts={summary.activeContractCount ?? 0}
          onOpenCobros={() => navigate('/cobros')}
        />
      )}

      {/* ═══ KPIs secundarios ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-6 lg:mt-6 mb-6 lg:mb-8">
        <div className="animate-fade-up stagger-1">
          <KpiCard
            tone="blue"
            icon={<TrendingUp className="w-5 h-5" strokeWidth={2} />}
            label="Tarifa mínima"
            value={business.minimumRate != null ? `${fmt(business.minimumRate)} €/h` : '—'}
            hint={business.isReliable ? 'Para cubrir costes y margen' : 'Necesitas más horas'}
          />
        </div>
        <div className="animate-fade-up stagger-2">
          <KpiCard
            tone="orange"
            icon={<TrendingDown className="w-5 h-5" strokeWidth={2} />}
            label="Coste/hora real"
            value={business.realHourlyCost != null ? `${fmt(business.realHourlyCost)} €/h` : '—'}
            hint={
              business.isReliable
                ? `${fmt(business.overheadPerHour)} € overhead + ${fmt(business.directCostPerHour)} € directo`
                : 'Aún no calculable'
            }
          />
        </div>
        <div className="animate-fade-up stagger-3">
          <KpiCard
            tone={business.utilizationPct >= 70 ? 'green' : business.utilizationPct >= 40 ? 'orange' : 'red'}
            icon={<Target className="w-5 h-5" strokeWidth={2} />}
            label="Utilización"
            value={`${fmt(business.utilizationPct, 0)}%`}
            hint={`${fmt(toNum(summary.totalBillableHours), 0)}h / ${fmt(business.capacityHours, 0)}h capacidad`}
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

      {/* ═══ Salud de cobros (DSO + morosidad) ═══ */}
      {collections && (collections.totalPendingGross > 0 || collections.invoicesPaid > 0) && (
        <CollectionsHealthSection data={collections} onOpenCobros={() => navigate('/cobros')} />
      )}
    </div>
  );
}

// ===========================================================================
// CollectionsHealthSection — DSO + morosidad
// ===========================================================================

function CollectionsHealthSection({
  data, onOpenCobros,
}: {
  data:         CollectionsHealth;
  onOpenCobros: () => void;
}) {
  const totalPending = data.totalPendingGross;
  const buckets = data.pendingByAge;

  return (
    <section
      className="mt-6 lg:mt-8 animate-fade-up"
      style={{ animationDelay: '0.4s' }}
    >
      <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-3 tracking-tight flex items-center gap-2">
        <Wallet className="w-4 h-4 text-[var(--color-text-secondary)]" strokeWidth={1.9} />
        Salud de cobros
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-1.5">
            DSO global
          </p>
          <p className="text-[28px] font-semibold text-[var(--color-text)] tabular-nums leading-none">
            {data.dsoGlobalDays != null ? `${data.dsoGlobalDays}` : '—'}
            <span className="text-[14px] font-normal text-[var(--color-text-tertiary)] ml-1">días</span>
          </p>
          <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-2 leading-relaxed">
            {data.dsoGlobalDays != null
              ? `Promedio sobre ${data.invoicesPaid} pago${data.invoicesPaid !== 1 ? 's' : ''} cobrado${data.invoicesPaid !== 1 ? 's' : ''}.`
              : 'Aún no hay pagos cobrados. Marca un pago como pagado para empezar a medir.'}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-1.5">
            Pendiente por antigüedad
          </p>
          {totalPending > 0 ? (
            <div className="space-y-1.5 mt-2">
              <AgeBucket label="0–30 días"  value={buckets.d0_30}    total={totalPending} color="#30D158" />
              <AgeBucket label="30–60 días" value={buckets.d30_60}   total={totalPending} color="#FFD60A" />
              <AgeBucket label="60–90 días" value={buckets.d60_90}   total={totalPending} color="#FF9F0A" />
              <AgeBucket label="+90 días"   value={buckets.d90_plus} total={totalPending} color="#FF453A" />
            </div>
          ) : (
            <p className="text-[12.5px] text-[var(--color-text-tertiary)] mt-1">
              Todo al día. Sin importes pendientes de cobro.
            </p>
          )}
        </Card>

        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-1.5">
            Clientes que más tardan
          </p>
          {data.slowestClients.length > 0 ? (
            <ol className="space-y-1.5 mt-2">
              {data.slowestClients.map((c, i) => (
                <li key={c.clientId} className="flex items-center gap-2 text-[13px]">
                  <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] w-4">{i + 1}</span>
                  <span className="flex-1 truncate text-[var(--color-text)]">{c.name}</span>
                  <span className="text-[var(--color-text-tertiary)] tabular-nums shrink-0">{c.avgDays}d</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[12.5px] text-[var(--color-text-tertiary)] mt-1">
              Aún no hay datos suficientes.
            </p>
          )}
          <button
            onClick={onOpenCobros}
            className="mt-3 text-[12px] font-medium text-[var(--color-blue)] hover:text-[var(--color-blue-hover)]"
          >
            Ver detalle en Cobros →
          </button>
        </Card>
      </div>
    </section>
  );
}

function AgeBucket({
  label, value, total, color,
}: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11.5px] mb-0.5">
        <span className="text-[var(--color-text-secondary)]">{label}</span>
        <span className="tabular-nums text-[var(--color-text)] font-medium">
          {fmtCurrency(value, 0)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ===========================================================================
// Hero — Tarifa mínima
// ===========================================================================

// ===========================================================================
// SubscriptionsBlock — Tarjetas MRR + Proyección 12m + nº suscriptores
// ===========================================================================

function SubscriptionsBlock({
  mrr, projection, activeContracts, onOpenCobros,
}: {
  mrr:             number;
  projection:      DashboardProjection | null;
  activeContracts: number;
  onOpenCobros:    () => void;
}) {
  const months = projection?.months ?? 12;
  const projRev = projection?.projectedRevenue ?? mrr * months;
  const projProf = projection?.projectedProfit ?? 0;
  const subs = projection?.activeSubscriptions ?? 0;

  return (
    <section
      className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-up"
      style={{ animationDelay: '0.10s' }}
    >
      <Card padding="md" className="relative overflow-hidden">
        <div className="absolute -top-8 -right-6 w-32 h-32 rounded-full blur-3xl opacity-50"
             style={{ background: 'radial-gradient(circle, rgba(48,209,88,0.30), transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-[var(--color-green-subtle)] text-[var(--color-green)]">
              <Repeat className="w-[18px] h-[18px]" strokeWidth={1.9} />
            </div>
            <Badge variant="green" dot pulse>MRR</Badge>
          </div>
          <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-0.5">
            Ingresos recurrentes (neto)
          </p>
          <p className="text-[26px] font-semibold text-[var(--color-text)] leading-tight tracking-[-0.01em] tabular-nums">
            {fmtCurrency(mrr, 2)}
          </p>
          <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-1">
            {subs} suscripción{subs !== 1 ? 'es' : ''} activa{subs !== 1 ? 's' : ''} · {activeContracts} contrato{activeContracts !== 1 ? 's' : ''}
          </p>
        </div>
      </Card>

      <Card padding="md" className="relative overflow-hidden">
        <div className="absolute -top-8 -right-6 w-32 h-32 rounded-full blur-3xl opacity-50"
             style={{ background: 'radial-gradient(circle, rgba(10,132,255,0.30), transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-[var(--color-blue-subtle)] text-[var(--color-blue)]">
              <LineChart className="w-[18px] h-[18px]" strokeWidth={1.9} />
            </div>
            <Badge variant="blue">{months}m</Badge>
          </div>
          <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-0.5">
            Ingresos proyectados ({months}m)
          </p>
          <p className="text-[26px] font-semibold text-[var(--color-text)] leading-tight tracking-[-0.01em] tabular-nums">
            {fmtCurrency(projRev, 0)}
          </p>
          <p className={clsx(
            'text-[11.5px] mt-1 tabular-nums font-medium',
            projProf >= 0 ? 'text-[#25A244] dark:text-[#5CE67D]' : 'text-[#D93025] dark:text-[#FF6961]',
          )}>
            Beneficio estimado: {projProf >= 0 ? '+' : ''}{fmtCurrency(projProf, 0)}
          </p>
        </div>
      </Card>

      <Card padding="md" hover onClick={onOpenCobros} className="relative overflow-hidden cursor-pointer">
        <div className="absolute -top-8 -right-6 w-32 h-32 rounded-full blur-3xl opacity-40"
             style={{ background: 'radial-gradient(circle, rgba(191,90,242,0.30), transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-[var(--color-purple-subtle)] text-[#BF5AF2]">
              <Wallet className="w-[18px] h-[18px]" strokeWidth={1.9} />
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" strokeWidth={2} />
          </div>
          <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-0.5">
            Centro de cobros
          </p>
          <p className="text-[16px] font-semibold text-[var(--color-text)] leading-tight tracking-tight">
            Generar y marcar pagos
          </p>
          <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-1">
            Ir a la página de cobros
          </p>
        </div>
      </Card>
    </section>
  );
}

function HeroRateCard({
  minimumRate, realHourlyCost, overheadPerHour, directCostPerHour, onSimulate, onHowTo,
}: {
  minimumRate:       number;
  realHourlyCost:    number;
  overheadPerHour:   number;
  directCostPerHour: number;
  onSimulate:        () => void;
  onHowTo:           () => void;
}) {
  const margin = Math.max(0, minimumRate - realHourlyCost);
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
            Tus costes fijos repartidos entre las horas que <b className="text-[var(--color-text)]">puedes</b> trabajar son el overhead por hora. Le sumamos el coste directo medio (mano de obra y materiales) y obtenemos tu coste real. Encima aplicamos tu margen objetivo. <b className="text-[var(--color-text)]">Por debajo de {fmt(minimumRate, 0)} €/h</b>, estás perdiendo dinero.
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
            label="Overhead/hora"
            value={`${fmt(overheadPerHour)} €`}
            color="#FF453A"
          />
          <BreakdownRow
            label="Coste directo/hora"
            value={`${fmt(directCostPerHour)} €`}
            color="#FF9F0A"
          />
          <div className="h-px bg-[var(--color-border)] my-3" />
          <BreakdownRow
            label="Coste/hora real"
            value={`${fmt(realHourlyCost)} €`}
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

// ===========================================================================
// Hero — Datos insuficientes para calcular tarifa
// ===========================================================================

function HeroUnreliableCard({
  reason, billableHours, onTrack, onConfigure,
}: {
  reason:        string;
  billableHours: number;
  onTrack:       () => void;
  onConfigure:   () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[24px] border border-[var(--color-border)] animate-fade-up"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="absolute inset-0 bg-aurora opacity-60" />
      <div className="absolute inset-0 bg-dots opacity-30" />

      <div className="relative px-6 py-8 sm:px-10 sm:py-10 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.6)] dark:bg-[rgba(0,0,0,0.25)] backdrop-blur-md border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.08)] text-[11.5px] font-semibold text-[var(--color-orange)] mb-3">
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.4} />
            Aún sin datos suficientes
          </div>
          <p className="text-[36px] sm:text-[44px] font-semibold tracking-[-0.02em] leading-tight text-[var(--color-text)]">
            Tu tarifa mínima se calculará cuando tengas más horas registradas
          </p>
          <p className="text-[14px] sm:text-[15px] text-[var(--color-text-secondary)] mt-3 max-w-[560px] leading-relaxed">
            {reason} Mientras tanto, configura tu capacidad real (cuántas horas puedes trabajar al mes) para que el cálculo sea fiable.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Button variant="primary" size="md" icon={<Clock className="w-4 h-4" strokeWidth={2.2} />} onClick={onTrack}>
              Fichar primera hora
            </Button>
            <Button variant="glass" size="md" onClick={onConfigure}>
              Ajustar capacidad
            </Button>
          </div>
        </div>

        <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
            Estado actual
          </p>
          <BreakdownRow
            label="Horas registradas"
            value={`${fmt(billableHours, 1)} h`}
            color="#0A84FF"
          />
          <BreakdownRow
            label="Tarifa real"
            value="—"
          />
          <BreakdownRow
            label="Tarifa mínima"
            value="—"
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

// ---------------------------------------------------------------------------
// PersonalDashboard — versión reducida para EMPLOYEE/VIEWER
// ---------------------------------------------------------------------------
// Sin KPIs financieros del tenant. Solo el trabajo personal del usuario:
// horas registradas en el mes, sparkline de los últimos 14 días, y atajo
// rápido para fichar / ver sus proyectos.

function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // El backend filtra automáticamente por usuario para roles sin
        // 'timeentry:read:any', así que recibimos sólo nuestras entradas.
        const all = await api.get<TimeEntry[]>('/v1/time-entries');
        if (!cancelled) setEntries(all);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthMin = entries.reduce((acc, e) => {
    const d = new Date(e.startedAt);
    if (d >= thisMonthStart) return acc + toNum(e.durationMin);
    return acc;
  }, 0);
  const monthHours = monthMin / 60;
  const billableHours = entries
    .filter((e) => e.isBillable && new Date(e.startedAt) >= thisMonthStart)
    .reduce((acc, e) => acc + toNum(e.durationMin) / 60, 0);

  // Proyectos únicos en los que ha trabajado este mes.
  const projectsThisMonth = new Map<string, string>();
  for (const e of entries) {
    if (new Date(e.startedAt) >= thisMonthStart && e.project) {
      projectsThisMonth.set(e.project.id, e.project.name);
    }
  }

  const sparkline = buildHoursSparkline(entries);
  const sparkMax = Math.max(...sparkline, 1);

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto py-8">
        <div className="rounded-[12px] bg-[rgba(255,69,58,0.10)] border border-[rgba(255,69,58,0.25)] p-4">
          <div className="flex items-center gap-2 text-[#FF453A] font-semibold mb-1">
            <AlertCircle className="w-4 h-4" /> No pudimos cargar tus horas
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto pb-12">
      <header className="flex items-start justify-between gap-3 mb-6 pt-6 lg:pt-8">
        <div>
          <p className="text-[13px] text-[var(--color-text-tertiary)] mb-1">
            {greeting()}, {user?.fullName ?? 'compañera/o'}
          </p>
          <h1 className="text-[28px] sm:text-[32px] font-semibold text-[var(--color-text)] leading-tight tracking-tight">
            Tu trabajo este mes
          </h1>
          <p className="text-[13px] text-[var(--color-text-tertiary)] mt-0.5 capitalize hidden sm:block">
            {now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button onClick={() => navigate('/horas')} variant="primary" size="md">
          <Clock className="w-4 h-4 mr-1.5" /> Fichar horas
        </Button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiCard
          tone="blue"
          icon={<Clock className="w-5 h-5" strokeWidth={2} />}
          label="Horas trabajadas este mes"
          value={`${fmt(monthHours, 1)} h`}
          hint={`${entries.filter(e => new Date(e.startedAt) >= thisMonthStart).length} entradas`}
        />
        <KpiCard
          tone="green"
          icon={<TrendingUp className="w-5 h-5" strokeWidth={2} />}
          label="Horas facturables"
          value={`${fmt(billableHours, 1)} h`}
          hint={monthHours > 0 ? `${fmt((billableHours / monthHours) * 100, 0)}% del total` : 'Sin datos aún'}
        />
        <KpiCard
          tone="orange"
          icon={<Target className="w-5 h-5" strokeWidth={2} />}
          label="Proyectos activos"
          value={`${projectsThisMonth.size}`}
          hint={projectsThisMonth.size === 0 ? 'Aún sin actividad' : 'En los que has fichado'}
        />
      </section>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--color-text)]">Tus últimas 2 semanas</h2>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">Horas facturables por día</p>
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-24">
          {sparkline.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md transition-all"
              style={{
                height: `${Math.max((h / sparkMax) * 100, 4)}%`,
                background: h > 0 ? 'var(--color-blue)' : 'var(--color-border)',
                opacity: h > 0 ? 0.85 : 0.4,
              }}
              title={`${fmt(h, 1)}h`}
            />
          ))}
        </div>
      </Card>

      <div>
        <h2 className="text-[16px] font-semibold text-[var(--color-text)] mb-3">Proyectos en los que trabajaste este mes</h2>
        {projectsThisMonth.size === 0 ? (
          <Card className="p-6 text-center">
            <Clock className="w-8 h-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
            <p className="text-[14px] text-[var(--color-text-secondary)] mb-3">Aún no has fichado horas este mes.</p>
            <Button onClick={() => navigate('/horas')} variant="primary" size="sm">Empezar ahora</Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {Array.from(projectsThisMonth.entries()).map(([id, name]) => (
              <button
                key={id}
                onClick={() => navigate(`/proyectos/${id}`)}
                className="w-full text-left flex items-center justify-between p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-[var(--color-blue-subtle)] flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-[var(--color-blue)]" strokeWidth={2} />
                  </div>
                  <span className="text-[14px] font-medium text-[var(--color-text)]">{name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
