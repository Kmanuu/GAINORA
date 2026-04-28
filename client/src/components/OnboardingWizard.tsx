// ============================================================================
// OnboardingWizard.tsx — Tutorial de bienvenida estilo Apple (S10)
// ============================================================================
// 4 pantallas máximas. <60s para llegar a "primer proyecto creado".
//
//   0 — ¿Cómo trabajas? Persona en 3 cards. Aplica costingMode +
//       capacidad por defecto del tenant según la elección.
//   1 — Tu primer cliente y proyecto (sólo si no es modo demo).
//   2 — Mensaje "configurado".
//   3 — Cierre con CTA al dashboard.
//
// Skippable en cualquier paso. Recuperable desde sidebar
// ("Cómo usar HorasPRO" → openOnboarding('main')).
// ============================================================================

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X as XIcon, ArrowRight, Check, Sparkles, User, Building2,
  Briefcase, Users, FlaskConical, ClipboardList, Timer,
} from 'lucide-react';
import clsx from 'clsx';
import { useOnboarding } from '@/context/OnboardingContext';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input  from '@/components/ui/Input';

type Persona = 'solo' | 'anchor' | 'trying';

interface PersonaOption {
  id:          Persona;
  icon:        ReactNode;
  title:       string;
  description: string;
  config: {
    costingMode:          'ABSORPTION' | 'CONTRIBUTION';
    plannedCapacityHours: number;
    targetMarginPct:      number;
  };
}

const PERSONAS: PersonaOption[] = [
  {
    id:          'solo',
    icon:        <Users className="w-5 h-5" strokeWidth={1.9} />,
    title:       'Solo, varios clientes pequeños',
    description: 'Cada cliente cubre su parte de tus costes fijos. Lo más común en autónomos.',
    config:      { costingMode: 'ABSORPTION', plannedCapacityHours: 160, targetMarginPct: 30 },
  },
  {
    id:          'anchor',
    icon:        <Building2 className="w-5 h-5" strokeWidth={1.9} />,
    title:       'Un cliente grande y otros pequeños',
    description: 'El grande cubre tus fijos; el resto suma margen extra. Modo de contribución.',
    config:      { costingMode: 'CONTRIBUTION', plannedCapacityHours: 200, targetMarginPct: 25 },
  },
  {
    id:          'trying',
    icon:        <FlaskConical className="w-5 h-5" strokeWidth={1.9} />,
    title:       'Empiezo de cero, quiero probar',
    description: 'Sin clientes todavía. Configuramos defaults razonables para que explores.',
    config:      { costingMode: 'ABSORPTION', plannedCapacityHours: 160, targetMarginPct: 30 },
  },
];

type BillingMode = 'FIXED' | 'HOURLY';

export default function OnboardingWizard() {
  const { activeFlow, currentStep, close, next, goTo } = useOnboarding();
  const { toast } = useToast();
  const navigate  = useNavigate();

  const [persona,    setPersona]    = useState<Persona | null>(null);
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [mode,       setMode]       = useState<BillingMode>('FIXED');
  const [amount,     setAmount]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [seeding,    setSeeding]    = useState(false);
  const [demoSeeded, setDemoSeeded] = useState(false);
  const [seedError,  setSeedError]  = useState<string | null>(null);

  if (activeFlow !== 'main') return null;

  async function selectPersona(p: PersonaOption) {
    setPersona(p.id);
    try { await api.patch('/v1/me/tenant', p.config); }
    catch { /* silencioso: si falla, ajustes desde Settings */ }

    if (p.id === 'trying') {
      // Cargar datos demo realistas en background. Si ya existían (409),
      // tratamos como éxito (el usuario los tiene cargados igualmente).
      // Cualquier otro error queda visible en el paso 2 con CTA para reintentar.
      setSeeding(true);
      setSeedError(null);
      try {
        // force=1 porque el usuario eligió explícitamente el modo "trying"
        // y queremos cargar la demo aunque la cuenta tenga datos previos.
        await api.post('/v1/demo/seed?force=1', {});
        setDemoSeeded(true);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error desconocido';
        if (/datos demo cargados/i.test(msg)) {
          // Ya estaban cargados de una sesión previa: lo tratamos como éxito.
          setDemoSeeded(true);
        } else {
          setDemoSeeded(false);
          setSeedError(msg);
          toast('error', `No se pudieron cargar los datos demo: ${msg}`);
        }
      } finally {
        setSeeding(false);
      }
      goTo(2);
    } else {
      next(4);
    }
  }

  async function retrySeed() {
    setSeeding(true);
    setSeedError(null);
    try {
      await api.post('/v1/demo/seed?force=1', {});
      setDemoSeeded(true);
      toast('success', 'Datos demo cargados');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setSeedError(msg);
      toast('error', `Reintento fallido: ${msg}`);
    } finally {
      setSeeding(false);
    }
  }

  async function createFirstProject() {
    if (!clientName.trim())  { toast('error', 'Indica el nombre del cliente'); return; }
    if (!projectName.trim()) { toast('error', 'Indica el nombre del proyecto'); return; }
    if (!amount.trim() || parseFloat(amount) <= 0) {
      toast('error', mode === 'FIXED' ? 'Indica cuánto te paga el cliente' : 'Indica la tarifa por hora');
      return;
    }
    setSubmitting(true);
    try {
      const client = await api.post<{ id: string }>('/v1/clients', { name: clientName.trim() });
      const project = await api.post<{ id: string }>('/v1/projects', {
        name:         projectName.trim(),
        clientId:     client.id,
        status:       'ACTIVE',
        billingMode:  mode,
        budgetAmount: mode === 'FIXED'  ? parseFloat(amount) : null,
        hourlyRate:   mode === 'HOURLY' ? parseFloat(amount) : null,
      });
      await api.post('/v1/contracts', {
        projectId:   project.id,
        clientId:    client.id,
        billingMode: mode,
        price:       parseFloat(amount),
        startedAt:   new Date().toISOString().slice(0, 10),
      });
      toast('success', '¡Listo! Tu primer proyecto está creado.');
      next(4);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'No se pudo crear el proyecto');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() { close(); }
  function goToDashboard() { close(); navigate('/dashboard'); }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial de bienvenida"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(15,15,20,0.55)] backdrop-blur-sm animate-fade-in"
    >
      <button
        onClick={handleClose}
        aria-label="Saltar tutorial"
        className="absolute top-5 right-5 text-white/70 hover:text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
      >
        Saltar
        <XIcon className="w-4 h-4" strokeWidth={2} />
      </button>

      <div
        className="relative w-full max-w-[560px] bg-[var(--color-surface)] rounded-[24px] overflow-hidden animate-fade-up"
        style={{ boxShadow: 'var(--shadow-floating)' }}
      >
        {/* Step indicator — pills de mismo ancho, color marca progreso.
            Antes el activo era w-8 y los demás w-2, lo que en pantalla 1
            (activo en pos 0) hacía pensar que el wizard tenía 3 pasos. */}
        <div className="flex justify-center gap-1.5 pt-5">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={clsx(
                'h-1 w-8 rounded-full transition-all duration-300',
                s === currentStep
                  ? 'bg-[var(--color-blue)]'
                  : s < currentStep
                    ? 'bg-[var(--color-text-tertiary)]'
                    : 'bg-[var(--color-border)]',
              )}
            />
          ))}
        </div>

        <div className="px-6 sm:px-8 py-6 sm:py-8">
          {currentStep === 0 && <StepPersona onSelect={selectPersona} />}
          {currentStep === 1 && (
            <StepFirstProject
              clientName={clientName}    setClientName={setClientName}
              projectName={projectName}  setProjectName={setProjectName}
              mode={mode}                setMode={setMode}
              amount={amount}            setAmount={setAmount}
              onSubmit={createFirstProject}
              submitting={submitting}
            />
          )}
          {currentStep === 2 && <StepReady persona={persona} demoSeeded={demoSeeded} seeding={seeding} seedError={seedError} onRetry={retrySeed} onContinue={() => next(4)} />}
          {currentStep === 3 && <StepFinish onGoDashboard={goToDashboard} persona={persona} demoSeeded={demoSeeded} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantalla 0 — Pregunta persona
// ---------------------------------------------------------------------------

function StepPersona({ onSelect }: { onSelect: (p: PersonaOption) => void }) {
  return (
    <>
      <header className="text-center mb-6">
        <div className="inline-flex w-12 h-12 rounded-[14px] bg-[var(--color-blue-subtle)] items-center justify-center mb-3">
          <Sparkles className="w-5 h-5 text-[var(--color-blue)]" strokeWidth={1.9} />
        </div>
        <h2 className="text-[22px] font-semibold text-[var(--color-text)] tracking-tight">
          Vamos a configurar HorasPRO en 30 segundos
        </h2>
        <p className="text-[14px] text-[var(--color-text-secondary)] mt-1.5">
          ¿Cómo trabajas ahora?
        </p>
      </header>
      <div className="space-y-2.5">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full flex items-start gap-3 px-4 py-3.5 rounded-[14px] text-left border border-[var(--color-border-medium)] bg-[var(--color-surface)] hover:border-[var(--color-blue)] hover:bg-[var(--color-blue-subtle)] transition-all duration-150 group"
          >
            <span className="w-9 h-9 rounded-[10px] bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.06)] text-[var(--color-text-secondary)] group-hover:bg-white group-hover:text-[var(--color-blue)] flex items-center justify-center shrink-0 transition-colors">
              {p.icon}
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[var(--color-text)]">{p.title}</p>
              <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">{p.description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-blue)] mt-2 transition-colors" strokeWidth={2} />
          </button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pantalla 1 — Primer cliente + proyecto
// ---------------------------------------------------------------------------

function StepFirstProject({
  clientName, setClientName, projectName, setProjectName,
  mode, setMode, amount, setAmount, onSubmit, submitting,
}: {
  clientName:  string; setClientName:  (v: string) => void;
  projectName: string; setProjectName: (v: string) => void;
  mode:        BillingMode; setMode: (v: BillingMode) => void;
  amount:      string; setAmount: (v: string) => void;
  onSubmit:    () => void;
  submitting:  boolean;
}) {
  return (
    <>
      <header className="text-center mb-6">
        <div className="inline-flex w-12 h-12 rounded-[14px] bg-[var(--color-blue-subtle)] items-center justify-center mb-3">
          <Briefcase className="w-5 h-5 text-[var(--color-blue)]" strokeWidth={1.9} />
        </div>
        <h2 className="text-[22px] font-semibold text-[var(--color-text)] tracking-tight">
          Tu primer cliente y proyecto
        </h2>
        <p className="text-[14px] text-[var(--color-text-secondary)] mt-1.5">
          Lo más rápido es introducir uno real. Podrás añadir más después.
        </p>
      </header>
      <div className="space-y-3">
        <Input
          label="Cliente"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Carpintería López, Estudio Diseño SL…"
        />
        <Input
          label="Proyecto / trabajo"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Reforma local, página web…"
        />
        <div>
          <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-2">
            ¿Cómo cobras este trabajo?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <ModeCard
              active={mode === 'FIXED'}
              onClick={() => setMode('FIXED')}
              icon={<ClipboardList className="w-4 h-4" strokeWidth={1.9} />}
              title="Cuando termino"
              caption="Precio cerrado"
            />
            <ModeCard
              active={mode === 'HOURLY'}
              onClick={() => setMode('HOURLY')}
              icon={<Timer className="w-4 h-4" strokeWidth={1.9} />}
              title="Por las horas que dedique"
              caption="Cobro horas reales"
            />
          </div>
        </div>
        <Input
          label={mode === 'FIXED' ? '¿Cuánto te paga?' : 'Tarifa por hora'}
          type="number"
          min="0"
          step="0.5"
          prefix="€"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div className="pt-2">
          <Button variant="primary" loading={submitting} onClick={onSubmit} fullWidth>
            Empezar
          </Button>
        </div>
      </div>
    </>
  );
}

function ModeCard({
  active, onClick, icon, title, caption,
}: {
  active: boolean; onClick: () => void; icon: ReactNode; title: string; caption: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        {icon}
      </span>
      <span className="text-[13px] font-semibold text-[var(--color-text)] leading-tight">{title}</span>
      <span className="text-[10.5px] text-[var(--color-text-tertiary)] leading-tight">{caption}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pantalla 2 — Mensaje "configurado"
// ---------------------------------------------------------------------------

function StepReady({
  persona, demoSeeded, seeding, seedError, onRetry, onContinue,
}: {
  persona: Persona | null;
  demoSeeded: boolean;
  seeding: boolean;
  seedError: string | null;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const isDemo = persona === 'trying';
  const hasFailed = isDemo && !!seedError && !demoSeeded;

  const titleClass = hasFailed
    ? 'bg-[var(--color-orange-subtle)]'
    : 'bg-[var(--color-green-subtle)]';
  const iconClass = hasFailed
    ? 'text-[var(--color-orange)]'
    : 'text-[var(--color-green)]';

  return (
    <div className="text-center py-2">
      <div className={clsx('inline-flex w-14 h-14 rounded-[16px] items-center justify-center mb-4', titleClass)}>
        <Check className={clsx('w-6 h-6', iconClass)} strokeWidth={2.4} />
      </div>
      <h2 className="text-[22px] font-semibold text-[var(--color-text)] tracking-tight">
        {hasFailed
          ? 'No pudimos cargar los datos de ejemplo'
          : isDemo
            ? (seeding ? 'Cargando datos de ejemplo…' : demoSeeded ? 'Listo para explorar' : 'Configurado para explorar')
            : 'Configurado'}
      </h2>
      <p className="text-[14px] text-[var(--color-text-secondary)] mt-2 max-w-[420px] mx-auto leading-relaxed">
        {hasFailed
          ? 'Tu configuración se guardó, pero hubo un fallo cargando los datos demo. Puedes reintentarlo o continuar y crear tu primer cliente desde la sección Clientes.'
          : isDemo && demoSeeded
            ? 'Te hemos cargado 5 clientes, 3 proyectos, costes, horas trabajadas, facturas y un par de pagos cobrados. Pasea por el dashboard, mira los cobros, abre las facturas — todo está vivo. Cuando quieras empezar de cero, tienes un botón "Borrar datos demo" en Ajustes.'
            : isDemo
              ? 'Hemos puesto valores razonables para que pruebes la app sin clientes. Cuando tengas uno real, créalo desde la sección Clientes y verás los números cobrar sentido.'
              : 'Tu modelo de costes y tu primer proyecto ya están en su sitio. Lo siguiente es fichar tu primera hora — verás tu rentabilidad en tiempo real.'}
      </p>
      {hasFailed && (
        <p className="text-[12px] text-[var(--color-text-tertiary)] mt-2 max-w-[400px] mx-auto">
          Detalle: {seedError}
        </p>
      )}
      <div className="mt-6 flex items-center justify-center gap-2">
        {hasFailed && (
          <Button variant="secondary" onClick={onRetry} loading={seeding}>
            Reintentar
          </Button>
        )}
        <Button variant="primary" onClick={onContinue} loading={seeding}>
          Continuar
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantalla 3 — Cierre con CTA al dashboard
// ---------------------------------------------------------------------------

function StepFinish({
  onGoDashboard, persona, demoSeeded,
}: { onGoDashboard: () => void; persona: Persona | null; demoSeeded: boolean }) {
  // Los bullets de "explorar demo" sólo aplican cuando la elección fue
  // realmente "trying" Y el seed fue OK. Si el usuario reabrió el wizard
  // y eligió otra persona, demoSeeded puede quedar `true` por estado
  // persistente — usamos persona como fuente de verdad.
  const showDemoTour = persona === 'trying' && demoSeeded;
  return (
    <div className="text-center py-2">
      <div className="inline-flex w-14 h-14 rounded-[16px] bg-[var(--color-blue-subtle)] items-center justify-center mb-4">
        <User className="w-6 h-6 text-[var(--color-blue)]" strokeWidth={2.2} />
      </div>
      <h2 className="text-[22px] font-semibold text-[var(--color-text)] tracking-tight">
        Todo tuyo
      </h2>
      <p className="text-[14px] text-[var(--color-text-secondary)] mt-2 max-w-[420px] mx-auto leading-relaxed">
        En el dashboard verás tu tarifa real por hora, qué proyectos te dan margen y dónde estás perdiendo dinero. Vuelve a este tutorial cuando quieras desde el botón <strong>“Repetir tutorial”</strong> de la barra lateral.
      </p>
      <p className="text-[12.5px] text-[var(--color-text-tertiary)] mt-4">
        {showDemoTour ? 'Para empezar a explorar:' : 'Lo primero que conviene hacer:'}
      </p>
      <ul className="text-[12.5px] text-[var(--color-text-secondary)] mt-1.5 space-y-1 inline-block text-left">
        {showDemoTour ? (
          <>
            <li>• Mirar el <em>Dashboard</em> — verás tu tarifa real, márgenes y morosidad.</li>
            <li>• Pasar por <em>Cobros</em> — hay un pago parcial y otro pendiente.</li>
            <li>• Cuando quieras tu propio espacio, en <em>Ajustes</em> tienes “Borrar datos demo”.</li>
          </>
        ) : (
          <>
            {persona !== 'trying' && (
              <li>• Registrar tus costes fijos en la sección <em>Costes fijos</em>.</li>
            )}
            <li>• Fichar tu primera hora con el botón timer en <em>Horas</em>.</li>
            <li>• Configurar tus datos de facturación en <em>Ajustes</em> antes de emitir tu primera factura.</li>
          </>
        )}
      </ul>
      <div className="mt-6">
        <Button variant="primary" onClick={onGoDashboard} fullWidth>
          Entrar al dashboard
        </Button>
      </div>
    </div>
  );
}
