// ============================================================================
// OnboardingWizard.tsx — Tutorial guiado estilo Apple para HorasPRO
// ============================================================================
// 5 pantallas, una sola cosa a la vez, lenguaje de verdad.
// Ahora soporta mini-tutoriales integrados con redirecciones.
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { X, ArrowLeft, ArrowRight, ChevronRight, Check } from 'lucide-react';
import clsx from 'clsx';
import { useOnboarding, type FlowType } from '@/context/OnboardingContext';

// ---------------------------------------------------------------------------
// Tipos de pantalla
// ---------------------------------------------------------------------------

interface SlideProps {
  onNext:         () => void;
  onPrev:         () => void;
  onClose:        () => void;
  onNavigate:     (path: string) => void;
  onOpenTutorial: (flow: FlowType) => void;
  onResumeMain:   (step: number) => void;
}

// ---------------------------------------------------------------------------
// Componentes visuales base
// ---------------------------------------------------------------------------

function WizardShell({
  children, step, total, onClose, showBack, onBack,
}: {
  children:  React.ReactNode;
  step:      number;
  total:     number;
  onClose:   () => void;
  showBack:  boolean;
  onBack:    () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[6px] animate-fade-in"
        onClick={onClose}
      />

      {/* Card */}
      <div
        className={clsx(
          'relative w-full max-w-[520px] rounded-[28px] overflow-hidden animate-scale-in',
          'bg-[var(--color-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.20),0_0_1px_rgba(0,0,0,0.08)]',
        )}
      >
        {/* Header: back + close */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <button
            onClick={onBack}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150',
              'text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]',
              !showBack && 'opacity-0 pointer-events-none',
            )}
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </button>

          {/* Dots de progreso (ocultar si solo hay 1 paso) */}
          <div className="flex items-center gap-1.5">
            {total > 1 && Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'rounded-full transition-all duration-300',
                  i === step
                    ? 'w-5 h-2 bg-[#0A84FF]'
                    : i < step
                      ? 'w-2 h-2 bg-[#0A84FF] opacity-40'
                      : 'w-2 h-2 bg-[var(--color-border-strong)]',
                )}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150',
              'text-[var(--color-text-tertiary)] hover:bg-[rgba(255,69,58,0.08)] hover:text-[#FF453A]',
            )}
            aria-label="Cerrar tutorial"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Contenido de la pantalla */}
        <div className="px-6 pb-6 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function BigEmoji({ emoji }: { emoji: string }) {
  return (
    <div className="text-[64px] leading-none mb-5 text-center select-none" aria-hidden>
      {emoji}
    </div>
  );
}

function SlideTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[24px] font-bold text-[var(--color-text)] leading-tight text-center mb-2">
      {children}
    </h2>
  );
}

function SlideSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[16px] text-[var(--color-text-secondary)] leading-relaxed text-center mb-6">
      {children}
    </p>
  );
}

function PrimaryBtn({
  children, onClick, icon,
}: {
  children: React.ReactNode;
  onClick:  () => void;
  icon?:    React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center justify-center gap-2',
        'py-3.5 px-6 rounded-[14px]',
        'bg-[#0A84FF] text-white',
        'text-[16px] font-semibold',
        'transition-all duration-150 active:scale-[0.98]',
        'hover:bg-[#0070E0]',
        'shadow-[0_4px_16px_rgba(10,132,255,0.30)]',
      )}
    >
      {children}
      {icon ?? <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
    </button>
  );
}

function SecondaryBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full py-3 px-6 rounded-[14px]',
        'text-[15px] font-medium text-[var(--color-text-secondary)]',
        'transition-all duration-150',
        'hover:bg-[var(--color-border)] hover:text-[var(--color-text)]',
      )}
    >
      {children}
    </button>
  );
}

function HighlightBox({
  emoji, text,
}: { emoji: string; text: string }) {
  return (
    <div className={clsx(
      'flex items-start gap-3 px-4 py-3.5 rounded-[14px] mb-5',
      'bg-[rgba(255,159,10,0.08)] border border-[rgba(255,159,10,0.20)]',
    )}>
      <span className="text-[20px] shrink-0 mt-0.5" aria-hidden>{emoji}</span>
      <p className="text-[14px] text-[#8B6800] leading-relaxed font-medium">{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WIZARD PRINCIPAL (Flujo 'main')
// ---------------------------------------------------------------------------

function Slide1({ onNext, onClose }: SlideProps) {
  return (
    <>
      <BigEmoji emoji="🎯" />
      <SlideTitle>Bienvenido a HorasPRO</SlideTitle>
      <SlideSubtitle>
        En 4 pasos te mostramos cómo saber exactamente si tu negocio
        está ganando dinero — o no.
      </SlideSubtitle>

      <div className="space-y-2.5 mb-6">
        {[
          { emoji: '🏢', text: 'Cuánto te cuesta tener el negocio abierto' },
          { emoji: '📁', text: 'Si cada trabajo te renta de verdad' },
          { emoji: '⏱️', text: 'Cuántas horas reales le dedicas a cada cliente' },
          { emoji: '🚦', text: 'Una señal clara: verde, naranja o rojo' },
        ].map(({ emoji, text }) => (
          <div key={text} className={clsx(
            'flex items-center gap-3 px-4 py-2.5 rounded-[12px]',
            'bg-[var(--color-bg)] border border-[var(--color-border)]',
          )}>
            <span className="text-[20px] shrink-0" aria-hidden>{emoji}</span>
            <p className="text-[14px] font-medium text-[var(--color-text)]">{text}</p>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] ml-auto shrink-0" strokeWidth={1.5} />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <PrimaryBtn onClick={onNext}>Empezar</PrimaryBtn>
        <SecondaryBtn onClick={onClose}>Ya conozco la app, saltar</SecondaryBtn>
      </div>
    </>
  );
}

function Slide2({ onNext, onNavigate, onOpenTutorial }: SlideProps) {
  const examples = [
    { emoji: '🏠', label: 'Alquiler / local' },
    { emoji: '💡', label: 'Luz y suministros' },
    { emoji: '🧾', label: 'Gestoría' },
    { emoji: '💻', label: 'Software / herramientas' },
    { emoji: '👷', label: 'Sueldos fijos' },
    { emoji: '📱', label: 'Teléfono / internet' },
  ];

  return (
    <>
      <BigEmoji emoji="🏢" />
      <SlideTitle>¿Cuánto te cuesta tener el negocio abierto?</SlideTitle>
      <SlideSubtitle>
        Antes de ganar un euro, ya tienes gastos. Eso se llama <strong>coste fijo</strong>.
      </SlideSubtitle>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {examples.map(({ emoji, label }) => (
          <div key={label} className={clsx(
            'flex flex-col items-center gap-1 px-2 py-3 rounded-[12px]',
            'bg-[var(--color-bg)] border border-[var(--color-border)] text-center',
          )}>
            <span className="text-[22px]" aria-hidden>{emoji}</span>
            <p className="text-[11px] font-medium text-[var(--color-text-secondary)] leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <HighlightBox
        emoji="💡"
        text="Cuando añadas estos gastos, HorasPRO calculará automáticamente cuánto necesitas facturar para no perder dinero."
      />

      <div className="space-y-2">
        <PrimaryBtn onClick={() => { onNavigate('/costes-fijos'); onOpenTutorial('fixed_costs'); }}>
          Añadir mis gastos fijos
        </PrimaryBtn>
        <SecondaryBtn onClick={onNext}>Seguir con la explicación</SecondaryBtn>
      </div>
    </>
  );
}

function Slide3({ onNext, onNavigate, onOpenTutorial }: SlideProps) {
  return (
    <>
      <BigEmoji emoji="📁" />
      <SlideTitle>¿Tienes algún trabajo en marcha ahora mismo?</SlideTitle>
      <SlideSubtitle>
        Cada cliente o trabajo es un <strong>proyecto</strong>. Tú le pones el presupuesto que has cobrado,
        y nosotros te decimos si te está rentando.
      </SlideSubtitle>

      <div className={clsx(
        'rounded-[16px] overflow-hidden mb-5',
        'border border-[var(--color-border)]',
      )}>
        {/* Simulación de proyecto */}
        <div className="px-4 py-3 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Ejemplo</p>
        </div>
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[15px] font-semibold text-[var(--color-text)]">Reforma oficina García</p>
            <span className="px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.10)] text-[#228B44] text-[11px] font-bold">● Activo</span>
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)]">Cliente: Talleres García S.L.</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
            <div>
              <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider">Presupuesto</p>
              <p className="text-[16px] font-bold text-[var(--color-text)]">4.500 €</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider">Rentabilidad</p>
              <p className="text-[16px] font-bold text-[#30D158]">82,4%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <PrimaryBtn onClick={() => { onNavigate('/proyectos'); onOpenTutorial('projects'); }}>
          Crear mi primer proyecto
        </PrimaryBtn>
        <SecondaryBtn onClick={onNext}>Seguir con la explicación</SecondaryBtn>
      </div>
    </>
  );
}

function Slide4({ onNext, onNavigate, onOpenTutorial }: SlideProps) {
  return (
    <>
      <BigEmoji emoji="⏱️" />
      <SlideTitle>¿Sabes cuántas horas le dedicas a cada cliente?</SlideTitle>
      <SlideSubtitle>
        La mayoría de autónomos no lo saben. Y ese es el agujero por donde se escapa el dinero.
      </SlideSubtitle>

      <div className={clsx(
        'flex items-start gap-3 px-4 py-3.5 rounded-[14px] mb-3',
        'bg-[rgba(10,132,255,0.06)] border border-[rgba(10,132,255,0.15)]',
      )}>
        <span className="text-[20px] shrink-0 mt-0.5" aria-hidden>📊</span>
        <p className="text-[14px] text-[#0A5A99] leading-relaxed font-medium">
          El <strong>68% de los autónomos</strong> infravalora su tiempo en un 20%.
          Si facturas 3.000€ al mes, eso son 600€ que estás regalando.
        </p>
      </div>

      <div className="space-y-2.5 mb-5">
        {[
          { icon: '▶', title: 'Timer en directo', desc: 'Dale al play cuando empieces un proyecto. Para cuando termines.' },
          { icon: '✏️', title: 'Añadir manualmente', desc: 'Si te olvidaste de fichar, escribe la hora de inicio y fin.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className={clsx(
            'flex gap-3 px-4 py-3 rounded-[12px]',
            'bg-[var(--color-bg)] border border-[var(--color-border)]',
          )}>
            <span className="text-[18px] shrink-0 mt-0.5" aria-hidden>{icon}</span>
            <div>
              <p className="text-[14px] font-semibold text-[var(--color-text)]">{title}</p>
              <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <PrimaryBtn onClick={() => { onNavigate('/horas'); onOpenTutorial('time'); }}>
          Ver cómo fichar horas
        </PrimaryBtn>
        <SecondaryBtn onClick={onNext}>Seguir con la explicación</SecondaryBtn>
      </div>
    </>
  );
}

function Slide5({ onNext, onNavigate }: SlideProps) {
  const lights = [
    { color: '#30D158', bg: 'rgba(48,209,88,0.10)', label: '🟢 Verde', desc: 'Más del 20% — Vas bien. Sigue así.' },
    { color: '#FF9F0A', bg: 'rgba(255,159,10,0.10)', label: '🟡 Naranja', desc: 'Entre 10% y 20% — Ajustado. Ojo a los imprevistos.' },
    { color: '#FF453A', bg: 'rgba(255,69,58,0.10)',  label: '🔴 Rojo', desc: 'Menos del 10% — Revisa precios o eficiencia.' },
  ];

  return (
    <>
      <BigEmoji emoji="🚦" />
      <SlideTitle>Ya tienes todo lo que necesitas</SlideTitle>
      <SlideSubtitle>
        Tu dashboard te dirá en tiempo real si cada proyecto está ganando dinero o no.
        Así de simple.
      </SlideSubtitle>

      <div className="space-y-2.5 mb-5">
        {lights.map(({ color, bg, label, desc }) => (
          <div
            key={label}
            className="flex items-start gap-3 px-4 py-3 rounded-[12px] border"
            style={{ background: bg, borderColor: `${color}30` }}
          >
            <p className="text-[14px] font-semibold shrink-0" style={{ color }}>{label}</p>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      <div className={clsx(
        'flex items-start gap-3 px-4 py-3.5 rounded-[14px] mb-5',
        'bg-[rgba(10,132,255,0.06)] border border-[rgba(10,132,255,0.15)]',
      )}>
        <span className="text-[20px] shrink-0" aria-hidden>💬</span>
        <p className="text-[13px] text-[#0A5A99] leading-relaxed">
          <strong>Consejo:</strong> Dedica 5 minutos cada lunes a revisar el dashboard.
          Eso es todo lo que necesitas para tener el pulso de tu negocio.
        </p>
      </div>

      <PrimaryBtn onClick={() => { onNavigate('/dashboard'); onNext(); }} icon={<Check className="w-4 h-4" strokeWidth={2.5} />}>
        Ver mi dashboard
      </PrimaryBtn>
    </>
  );
}

// ---------------------------------------------------------------------------
// MINI-TUTORIALES INDIVIDUALES
// ---------------------------------------------------------------------------

function SlideFixedCosts({ onClose, onNavigate, onResumeMain }: SlideProps) {
  return (
    <>
      <BigEmoji emoji="🏢" />
      <SlideTitle>Cómo añadir Costes Fijos</SlideTitle>
      <SlideSubtitle>
        Añadir un coste es muy sencillo: pon el concepto (ej: Alquiler, Luz), el importe y si lo pagas cada mes o al año. La app se encarga de promediarlo.
      </SlideSubtitle>
      <HighlightBox
        emoji="✨"
        text="Una vez creado tu primer servicio o proyecto, este gasto aplicará automáticamente a tus números."
      />
      <div className="mt-6 space-y-2">
        <PrimaryBtn onClick={onClose} icon={<Check className="w-4 h-4" strokeWidth={2.5} />}>
          Entendido, voy a añadirlos ahora
        </PrimaryBtn>
        <SecondaryBtn onClick={() => { onNavigate('/dashboard'); onResumeMain(2); }}>
          Volver al tutorial general
        </SecondaryBtn>
      </div>
    </>
  );
}

function SlideProjects({ onClose, onNavigate, onResumeMain }: SlideProps) {
  return (
    <>
      <BigEmoji emoji="📁" />
      <SlideTitle>Cómo crear Proyectos</SlideTitle>
      <SlideSubtitle>
        Para crear un proyecto dale al botón <strong className="text-[var(--color-text)]">+ Nuevo Proyecto</strong>. Solo necesitas poner un nombre y tu presupuesto cobrado.
      </SlideSubtitle>
      <HighlightBox
        emoji="💡"
        text="El resto de datos (como el cliente o la descripción) son opcionales. HorasPRO comparará ese presupuesto contra tus horas trabajadas y tus costes para el semáforo final."
      />
      <div className="mt-6 space-y-2">
        <PrimaryBtn onClick={onClose} icon={<Check className="w-4 h-4" strokeWidth={2.5} />}>
          Entendido, voy a crear uno
        </PrimaryBtn>
        <SecondaryBtn onClick={() => { onNavigate('/dashboard'); onResumeMain(3); }}>
          Volver al tutorial general
        </SecondaryBtn>
      </div>
    </>
  );
}

function SlideTime({ onClose, onNavigate, onResumeMain }: SlideProps) {
  return (
    <>
      <BigEmoji emoji="⏱️" />
      <SlideTitle>Cómo fichar Horas</SlideTitle>
      <SlideSubtitle>
        Arriba tienes el temporizador en directo. Solo selecciona un proyecto activo y dale a <strong className="text-[var(--color-text)]">Play</strong> cuando te pongas a trabajar.
      </SlideSubtitle>
      <HighlightBox
        emoji="✏️"
        text="¿Se te olvidó darle? No pasa nada, haz clic en 'Nueva entrada de tiempo' para añadir manualmente las horas que estuviste trabajando."
      />
      <div className="mt-6 space-y-2">
        <PrimaryBtn onClick={onClose} icon={<Check className="w-4 h-4" strokeWidth={2.5} />}>
          Entendido, voy a probarlo
        </PrimaryBtn>
        <SecondaryBtn onClick={() => { onNavigate('/dashboard'); onResumeMain(4); }}>
          Volver al tutorial general
        </SecondaryBtn>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

const MAIN_SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5];

export default function OnboardingWizard() {
  const { activeFlow, currentStep, open, close, next, prev, resumeMain } = useOnboarding();
  const navigate = useNavigate();

  if (!activeFlow) return null;

  let Slide;
  let totalSteps = 1;

  if (activeFlow === 'main') {
    Slide = MAIN_SLIDES[currentStep];
    totalSteps = MAIN_SLIDES.length;
  } else if (activeFlow === 'fixed_costs') {
    Slide = SlideFixedCosts;
  } else if (activeFlow === 'projects') {
    Slide = SlideProjects;
  } else if (activeFlow === 'time') {
    Slide = SlideTime;
  } else {
    return null;
  }

  const slideProps: SlideProps = {
    onNext:         () => next(totalSteps),
    onPrev:         prev,
    onClose:        close,
    onNavigate:     (path: string) => { navigate(path); },
    onOpenTutorial: (flow: FlowType) => { open(flow); },
    onResumeMain:   resumeMain,
  };

  return (
    <WizardShell
      step={currentStep}
      total={totalSteps}
      onClose={close}
      showBack={activeFlow === 'main' && currentStep > 0}
      onBack={prev}
    >
      <Slide {...slideProps} />
    </WizardShell>
  );
}
