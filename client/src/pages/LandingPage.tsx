import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GainoraWordmark } from '@/components/brand/GainoraLogo';
import './LandingPage.css';

// ── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  bg: '#050816',
  bgElevated: '#0A0F1F',
  primary: '#0A84FF',       // Apple blue, mismo del producto
  primaryHover: '#409CFF',
  accent: '#5E5CE6',        // Apple indigo
  glow: '#00D4FF',
  success: '#30D158',
  warn: '#FF9F0A',
  text: '#F5F7FA',
  textMuted: '#94A3B8',
  textDim: '#64748B',
  textFaint: '#334155',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)',
  surface: 'rgba(255,255,255,0.02)',
  surfaceRaised: 'rgba(10,15,31,0.92)',
};

// ── Hooks ────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); io.disconnect(); }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, vis];
}

function useCountUp(target: number, running: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!running) return;
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, running, duration]);
  return val;
}

// Spotlight cursor on cards
function useSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--x', `${e.clientX - r.left}px`);
      el.style.setProperty('--y', `${e.clientY - r.top}px`);
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);
  return ref;
}

// ── Icons ────────────────────────────────────────────────────────────────────
const IC: Record<string, (c: string, s: number) => React.ReactNode> = {
  target: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  spark: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  ),
  zap: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  shield: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  trending: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  clock: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  percent: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  repeat: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  ),
  receipt: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 1V2H4z" /><line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" />
    </svg>
  ),
  scale: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M16 3l2 3-2 3" /><path d="M8 21l-2-3 2-3" />
      <path d="M3 18h18" /><circle cx="12" cy="12" r="2.5" />
    </svg>
  ),
  lock: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  check: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  arrow: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  arrowDown: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><polyline points="5 12 12 19 19 12" />
    </svg>
  ),
  doc: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  ),
  qr: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="3" height="3" />
      <rect x="18" y="14" width="3" height="3" /><rect x="14" y="18" width="3" height="3" />
      <rect x="18" y="18" width="3" height="3" />
    </svg>
  ),
  euro: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 7A7 7 0 005 13a7 7 0 0013 6" /><line x1="3" y1="11" x2="14" y2="11" />
      <line x1="3" y1="15" x2="14" y2="15" />
    </svg>
  ),
};

const Ic = ({ n, c = BRAND.primary, s = 18 }: { n: string; c?: string; s?: number }) =>
  IC[n] ? <>{IC[n](c, s)}</> : null;

// ── Primitives ───────────────────────────────────────────────────────────────
const Pill = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    border: `1px solid ${BRAND.borderStrong}`, borderRadius: 100,
    padding: '6px 14px', fontSize: 12, color: BRAND.textMuted, marginBottom: 24,
    background: 'rgba(10,132,255,0.06)', letterSpacing: .3, fontWeight: 500,
    backdropFilter: 'blur(12px)',
  }}>
    {children}
  </span>
);

const Btn = ({
  children, primary, onClick, full, small, style: sx,
}: {
  children: React.ReactNode; primary?: boolean; onClick?: () => void;
  full?: boolean; small?: boolean; style?: React.CSSProperties;
}) => {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding: small ? '9px 18px' : '13px 26px',
        borderRadius: 12,
        fontSize: small ? 13 : 15,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all .25s cubic-bezier(.2,.9,.3,1)',
        width: full ? '100%' : undefined,
        fontFamily: 'inherit',
        letterSpacing: '-.01em',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        ...(primary ? {
          background: h
            ? `linear-gradient(135deg, ${BRAND.primaryHover}, ${BRAND.accent})`
            : `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
          border: 'none', color: '#FFFFFF',
          boxShadow: h
            ? `0 8px 32px rgba(10,132,255,.45), 0 0 0 1px rgba(255,255,255,.1) inset`
            : `0 4px 18px rgba(10,132,255,.30), 0 0 0 1px rgba(255,255,255,.08) inset`,
          transform: h ? 'translateY(-2px)' : 'none',
        } : {
          background: h ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)',
          border: `1px solid ${h ? 'rgba(255,255,255,.18)' : BRAND.borderStrong}`,
          color: BRAND.text,
          transform: h ? 'translateY(-1px)' : 'none',
        }),
        ...sx,
      }}
    >
      {children}
    </button>
  );
};

const FadeUp = ({
  children, delay = 0, style: sx,
}: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) => {
  const [ref, vis] = useInView();
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0) scale(1)' : 'translateY(28px) scale(.98)',
      transition: `opacity .8s cubic-bezier(.2,.9,.3,1) ${delay}s, transform .8s cubic-bezier(.2,.9,.3,1) ${delay}s`,
      ...sx,
    }}>
      {children}
    </div>
  );
};

// Gradient mesh background — replaces "stars"
const Mesh = ({ variant = 'a' }: { variant?: 'a' | 'b' | 'c' }) => {
  if (variant === 'a') return (
    <>
      <div className="mesh" style={{
        position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: 900, height: 900, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.primary}33 0%, transparent 60%)`,
        filter: 'blur(120px)', pointerEvents: 'none', mixBlendMode: 'screen',
      }} />
      <div className="mesh-slow" style={{
        position: 'absolute', top: '20%', left: '15%',
        width: 520, height: 520, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.accent}26 0%, transparent 60%)`,
        filter: 'blur(110px)', pointerEvents: 'none', mixBlendMode: 'screen',
      }} />
    </>
  );
  if (variant === 'b') return (
    <div className="mesh" style={{
      position: 'absolute', top: '30%', right: '-10%',
      width: 600, height: 600, borderRadius: '50%',
      background: `radial-gradient(circle, ${BRAND.primary}22 0%, transparent 60%)`,
      filter: 'blur(120px)', pointerEvents: 'none', mixBlendMode: 'screen',
    }} />
  );
  return (
    <div className="mesh-slow" style={{
      position: 'absolute', bottom: '-20%', left: '50%', transform: 'translateX(-50%)',
      width: 1100, height: 600, borderRadius: '50%',
      background: `radial-gradient(ellipse, ${BRAND.primary}33 0%, ${BRAND.accent}1A 40%, transparent 70%)`,
      filter: 'blur(120px)', pointerEvents: 'none', mixBlendMode: 'screen',
    }} />
  );
};

// Subtle grid backdrop (reflect.app-ish)
const GridBackdrop = () => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .5,
    backgroundImage:
      `linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
       linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)`,
    backgroundSize: '64px 64px',
    maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
    WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
  }} />
);

// ── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = () => {
  const [sc, setSc] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const f = () => setSc(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      padding: '0 32px', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: sc ? 'rgba(5,8,22,.78)' : 'transparent',
      backdropFilter: sc ? 'blur(24px) saturate(180%)' : 'none',
      WebkitBackdropFilter: sc ? 'blur(24px) saturate(180%)' : 'none',
      borderBottom: sc ? `1px solid ${BRAND.border}` : '1px solid transparent',
      transition: 'all .35s cubic-bezier(.2,.9,.3,1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <GainoraWordmark size={26} textColor={BRAND.text} />
      </div>
      <div style={{ display: 'flex', gap: 36 }} className="hidden md:flex">
        <NavLink href="#flow">Funcionamiento</NavLink>
        <NavLink href="#fiscal">Cumplimiento fiscal</NavLink>
        <NavLink href="#pricing">Precio</NavLink>
        <NavLink href="#about">Equipo</NavLink>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            color: BRAND.textMuted, fontSize: 14, fontWeight: 500,
            background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color .2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = BRAND.text)}
          onMouseLeave={e => (e.currentTarget.style.color = BRAND.textMuted)}
        >
          Entrar
        </button>
        <Btn primary small onClick={() => navigate('/register')}>Empezar gratis</Btn>
      </div>
    </nav>
  );
};

const NavLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
  const [h, setH] = useState(false);
  const scroll = (e: React.MouseEvent) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  return (
    <a
      href={href}
      onClick={scroll}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        color: h ? BRAND.text : BRAND.textMuted,
        textDecoration: 'none', fontSize: 14, fontWeight: 500,
        transition: 'color .2s',
      }}
    >
      {children}
    </a>
  );
};

// ── Hero ─────────────────────────────────────────────────────────────────────
const Hero = () => {
  const navigate = useNavigate();
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      position: 'relative', overflow: 'hidden', padding: '120px 24px 80px',
    }}>
      <Mesh variant="a" />
      <GridBackdrop />

      <div style={{ animation: 'fade-up .9s ease-out forwards', opacity: 0 }}>
        <Pill>
          <span className="pulse-dot" style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: BRAND.success, boxShadow: `0 0 8px ${BRAND.success}`,
          }} />
          Veri*FACTU compatible · construido en España
        </Pill>
      </div>

      <h1 style={{
        fontSize: 'clamp(48px, 7.4vw, 104px)', fontWeight: 800, lineHeight: .98,
        letterSpacing: '-.045em', marginBottom: 28, maxWidth: 1000,
        animation: 'fade-up .9s .12s ease-out forwards', opacity: 0,
        background: `linear-gradient(180deg, #FFFFFF 0%, #B0BCC8 100%)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        Sabes cuánto cuesta tu hora.<br />
        <span style={{
          background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Con precisión de céntimo.
        </span>
      </h1>

      <p style={{
        fontSize: 'clamp(16px, 1.6vw, 19px)', color: BRAND.textMuted,
        maxWidth: 580, lineHeight: 1.65, marginBottom: 40,
        animation: 'fade-up .9s .22s ease-out forwards', opacity: 0,
      }}>
        Gainora reúne tus horas, costes fijos y suscripciones para decirte
        qué cobrar y qué dejar de aceptar. Hecho para autónomos que se toman
        los números en serio.
      </p>

      <div style={{
        display: 'flex', gap: 12, marginBottom: 80, flexWrap: 'wrap', justifyContent: 'center',
        animation: 'fade-up .9s .32s ease-out forwards', opacity: 0,
      }}>
        <Btn primary onClick={() => navigate('/register')}>
          Empezar gratis <Ic n="arrow" c="#FFFFFF" s={16} />
        </Btn>
        <Btn onClick={() => document.querySelector('#dashboard-mock')?.scrollIntoView({ behavior: 'smooth' })}>
          Ver el dashboard <Ic n="arrowDown" c={BRAND.text} s={15} />
        </Btn>
      </div>

      <div style={{
        fontSize: 12, color: BRAND.textDim, letterSpacing: .3,
        marginTop: -60, marginBottom: 56,
        animation: 'fade-in 1.4s .6s ease-out forwards', opacity: 0,
      }}>
        Sin tarjeta · 30 días gratis · Cancela cuando quieras
      </div>

      <div className="float-soft" style={{
        maxWidth: 980, width: '100%',
        animation: 'fade-up 1s .45s ease-out forwards', opacity: 0,
      }}>
        <DashboardMock />
      </div>
    </section>
  );
};

// ── Dashboard mock — coherent with the real product ──────────────────────────
const DashboardMock = () => {
  const [ref, vis] = useInView(0.1);
  const margin = useCountUp(58, vis);
  const rate = useCountUp(4780, vis);
  const utilization = useCountUp(72, vis);

  const rows: Array<{ project: string; mode: string; hours: number; net: string; status: string; ok: boolean | 'partial' }> = [
    { project: 'Web Estudio López', mode: 'Cerrado', hours: 42, net: '2.480 €', status: 'Cobrado', ok: true },
    { project: 'Mantenimiento NorTech', mode: 'Suscripción', hours: 8, net: '299 €', status: 'Cobrado', ok: true },
    { project: 'Auditoría Bloom', mode: 'Por horas', hours: 24, net: '1.680 €', status: 'Parcial', ok: 'partial' },
    { project: 'Branding Q2 Nómada', mode: 'Cerrado', hours: 31, net: '1.950 €', status: 'Pendiente', ok: false },
  ];

  return (
    <div
      id="dashboard-mock"
      ref={ref}
      style={{
        borderRadius: 20,
        background: BRAND.surfaceRaised,
        backdropFilter: 'blur(28px)',
        border: `1px solid ${BRAND.borderStrong}`,
        overflow: 'hidden',
        boxShadow: `0 0 140px rgba(10,132,255,.15), 0 60px 120px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04) inset`,
      }}
    >
      {/* Browser bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 18px', borderBottom: `1px solid ${BRAND.border}`,
        background: 'rgba(255,255,255,0.02)',
      }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map(c => (
          <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: .9 }} />
        ))}
        <div style={{
          flex: 1, marginLeft: 10, height: 24,
          background: 'rgba(255,255,255,0.04)', borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Ic n="lock" c={BRAND.textFaint} s={11} />
          <span style={{ color: BRAND.textDim, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
            gainora.app/dashboard
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Mar', 'Abr', 'May'].map((m, i) => (
            <span key={m} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 6,
              background: i === 2 ? 'rgba(10,132,255,.15)' : 'transparent',
              color: i === 2 ? BRAND.primary : BRAND.textFaint,
              fontWeight: i === 2 ? 600 : 400,
            }}>
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 380 }}>
        {/* Sidebar */}
        <div style={{ borderRight: `1px solid ${BRAND.border}`, padding: '20px 0' }} className="hidden sm:block">
          {[
            { n: 'target', l: 'Inicio', a: true },
            { n: 'trending', l: 'Rentabilidad' },
            { n: 'clock', l: 'Horas' },
            { n: 'receipt', l: 'Facturas' },
            { n: 'percent', l: 'Trimestre fiscal' },
            { n: 'doc', l: 'Informes' },
          ].map(it => (
            <div key={it.l} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '10px 18px', margin: '2px 10px', borderRadius: 8,
              background: it.a ? 'rgba(10,132,255,.10)' : 'transparent',
              cursor: 'default',
            }}>
              <Ic n={it.n} c={it.a ? BRAND.primary : BRAND.textFaint} s={15} />
              <span style={{
                fontSize: 13,
                color: it.a ? BRAND.primary : BRAND.textDim,
                fontWeight: it.a ? 600 : 400,
              }}>
                {it.l}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '22px 26px' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: BRAND.textFaint, letterSpacing: .6, textTransform: 'uppercase', marginBottom: 6 }}>
              Mayo · 2026
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.text, letterSpacing: '-.02em' }}>
              Tu mes va bien.
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
            <KPI label="Tarifa real /hora" value={`${(rate / 100).toFixed(2).replace('.', ',')} €`} sub="Coste + margen 30%" tint={BRAND.primary} />
            <KPI label="Margen mensual" value={`+${margin}%`} sub="Objetivo 50%" tint={BRAND.success} highlight />
            <KPI label="Utilización" value={`${utilization}%`} sub="116/160 h facturables" tint={BRAND.text} />
          </div>

          {/* Chart */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', borderRadius: 12,
            padding: '14px 16px', marginBottom: 14, border: `1px solid ${BRAND.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: BRAND.textFaint, textTransform: 'uppercase', letterSpacing: .6 }}>
                Rentabilidad mensual
              </span>
              <span style={{ fontSize: 11, color: BRAND.success, fontWeight: 600 }}>
                +14 pp vs abril
              </span>
            </div>
            <svg viewBox="0 0 720 70" style={{ width: '100%', height: 70, overflow: 'visible' }}>
              <defs>
                <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND.primary} stopOpacity=".25" />
                  <stop offset="100%" stopColor={BRAND.primary} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,60 C60,52 100,46 150,40 C200,34 220,46 270,30 C310,18 350,24 400,12 C450,4 500,8 560,4 C620,2 670,4 720,2 L720,70 L0,70Z"
                fill="url(#cgrad)"
              />
              {vis && (
                <path
                  d="M0,60 C60,52 100,46 150,40 C200,34 220,46 270,30 C310,18 350,24 400,12 C450,4 500,8 560,4 C620,2 670,4 720,2"
                  fill="none" stroke={BRAND.primary} strokeWidth="2" strokeDasharray="1200"
                  className="draw-chart"
                />
              )}
              {[[150, 40], [400, 12], [720, 2]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3.2" fill={BRAND.primary} opacity=".95" />
              ))}
            </svg>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, color: BRAND.textFaint, marginTop: 6,
            }}>
              {['Ene', 'Feb', 'Mar', 'Abr', 'May'].map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: 'rgba(255,255,255,0.015)', borderRadius: 12,
            overflow: 'hidden', border: `1px solid ${BRAND.border}`,
          }} className="hidden sm:block">
            <div style={{
              display: 'grid', gridTemplateColumns: '1.6fr 1fr .6fr .8fr .8fr',
              padding: '10px 16px', borderBottom: `1px solid ${BRAND.border}`,
              background: 'rgba(255,255,255,0.015)',
            }}>
              {['Proyecto', 'Modelo', 'Horas', 'Neto', 'Estado'].map(h => (
                <span key={h} style={{
                  fontSize: 10, color: BRAND.textFaint,
                  textTransform: 'uppercase', letterSpacing: .7,
                }}>
                  {h}
                </span>
              ))}
            </div>
            {rows.map((r, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1.6fr 1fr .6fr .8fr .8fr',
                padding: '10px 16px', alignItems: 'center',
                borderBottom: i < rows.length - 1 ? `1px solid ${BRAND.border}` : 'none',
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: BRAND.text }}>{r.project}</span>
                <span style={{ fontSize: 11, color: BRAND.textMuted }}>{r.mode}</span>
                <span style={{ fontSize: 12, color: BRAND.textMuted }}>{r.hours} h</span>
                <span style={{ fontSize: 12, color: BRAND.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.net}</span>
                <Status status={r.status} ok={r.ok} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const KPI = ({ label, value, sub, tint, highlight }: { label: string; value: string; sub: string; tint: string; highlight?: boolean }) => (
  <div style={{
    background: highlight ? `${tint}10` : 'rgba(255,255,255,0.02)',
    border: `1px solid ${highlight ? `${tint}33` : BRAND.border}`,
    borderRadius: 12,
    padding: '14px 16px',
  }}>
    <div style={{ fontSize: 10, color: BRAND.textFaint, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .6 }}>
      {label}
    </div>
    <div style={{
      fontSize: 24, fontWeight: 800, color: tint, letterSpacing: '-.02em', lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {value}
    </div>
    <div style={{ fontSize: 11, color: BRAND.textDim, marginTop: 6 }}>{sub}</div>
  </div>
);

const Status = ({ status, ok }: { status: string; ok: boolean | 'partial' }) => {
  const c = ok === true ? BRAND.success : ok === 'partial' ? BRAND.warn : BRAND.textDim;
  const bg = ok === true ? 'rgba(48,209,88,.12)' : ok === 'partial' ? 'rgba(255,159,10,.12)' : 'rgba(100,116,139,.12)';
  return (
    <span style={{
      fontSize: 10, padding: '4px 10px', borderRadius: 5,
      background: bg, color: c, fontWeight: 600, justifySelf: 'start',
    }}>
      {status}
    </span>
  );
};

// ── Trust strip ──────────────────────────────────────────────────────────────
const TrustStrip = () => (
  <div style={{
    display: 'flex', justifyContent: 'center', gap: 56,
    padding: '32px 24px 64px', flexWrap: 'wrap',
    borderTop: `1px solid ${BRAND.border}`,
  }}>
    {[
      { n: 'shield', t: 'Hash chain Veri*FACTU + QR' },
      { n: 'zap', t: 'Cron de cobros automáticos' },
      { n: 'lock', t: 'Tus números, sólo tuyos' },
      { n: 'doc', t: 'Modelo 303 y 130 listos' },
    ].map(h => (
      <div key={h.t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Ic n={h.n} c={BRAND.primary} s={15} />
        <span style={{ color: BRAND.textMuted, fontSize: 13, fontWeight: 500 }}>{h.t}</span>
      </div>
    ))}
  </div>
);

// ── Section: Flow (bento) ────────────────────────────────────────────────────
const FlowSection = () => {
  const navigate = useNavigate();
  const [hours, setHours] = useState(80);
  const rate = 85, fixed = 1200;
  const revenue = hours * rate;
  const net = revenue - fixed;
  const margin = Math.round((net / revenue) * 100);
  const good = margin > 50;

  return (
    <section id="flow" style={{ padding: '120px 24px', position: 'relative', overflow: 'hidden' }}>
      <Mesh variant="b" />
      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
        <FadeUp style={{ textAlign: 'center', marginBottom: 64 }}>
          <Pill>Cómo funciona</Pill>
          <h2 style={{
            fontSize: 'clamp(34px, 4.4vw, 60px)', fontWeight: 800,
            letterSpacing: '-.035em', marginBottom: 16, lineHeight: 1.05,
          }}>
            Una decisión por pantalla.<br />
            <span style={{ color: BRAND.textMuted }}>Cero hojas de cálculo.</span>
          </h2>
          <p style={{ color: BRAND.textMuted, fontSize: 17, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            Mete tus horas y costes una sola vez. Gainora hace el resto:
            tarifa real, factura legal, cobro mensual y cierre fiscal trimestral.
          </p>
        </FadeUp>

        {/* Bento grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridAutoRows: 'minmax(220px, auto)',
          gap: 16,
          marginBottom: 80,
        }}>
          {/* Big card - calculator */}
          <BentoCard span={4} rowSpan={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span className="pulse-dot" style={{
                width: 8, height: 8, borderRadius: '50%',
                background: BRAND.primary, boxShadow: `0 0 8px ${BRAND.primary}`,
              }} />
              <span style={{ fontSize: 11, color: BRAND.primary, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Calculadora en vivo
              </span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10, letterSpacing: '-.02em' }}>
              ¿Te sale rentable este mes?
            </h3>
            <p style={{ color: BRAND.textMuted, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Mueve la barra: te decimos cuánto facturas, cuánto te queda y si tu margen llega al objetivo.
            </p>

            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: BRAND.textMuted, fontSize: 13 }}>Horas facturadas</span>
                <span style={{ color: BRAND.text, fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {hours} h
                </span>
              </div>
              <input type="range" min={10} max={200} value={hours} onChange={e => setHours(+e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: BRAND.textFaint, marginTop: 5 }}>
                <span>10h</span><span>200h</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Stat label="Ingresos brutos" value={`${revenue.toLocaleString('es-ES')} €`} />
              <Stat
                label="Margen Neto"
                value={`${margin}%`}
                tint={good ? BRAND.success : '#FF453A'}
                bg={good ? 'rgba(48,209,88,.08)' : 'rgba(255,69,58,.08)'}
              />
            </div>

            <div style={{
              padding: '11px 14px',
              background: 'rgba(10,132,255,.08)',
              borderRadius: 10,
              display: 'flex', justifyContent: 'space-between',
              border: `1px solid rgba(10,132,255,.18)`,
            }}>
              <span style={{ color: BRAND.textMuted, fontSize: 13 }}>Beneficio neto</span>
              <span style={{ color: BRAND.primary, fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                {net.toLocaleString('es-ES')} €
              </span>
            </div>
          </BentoCard>

          <BentoCard span={2}>
            <Ic n="clock" c={BRAND.primary} s={22} />
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '14px 0 8px', letterSpacing: '-.01em' }}>
              Timer integrado
            </h4>
            <p style={{ color: BRAND.textMuted, fontSize: 13.5, lineHeight: 1.6 }}>
              Empieza, para, vuelve. Cada minuto se asigna automáticamente al proyecto correcto.
            </p>
          </BentoCard>

          <BentoCard span={2}>
            <Ic n="repeat" c={BRAND.primary} s={22} />
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '14px 0 8px', letterSpacing: '-.01em' }}>
              Suscripciones que cobran solas
            </h4>
            <p style={{ color: BRAND.textMuted, fontSize: 13.5, lineHeight: 1.6 }}>
              Cron diario crea los recibos del mes. Si te ausentas tres meses, los recupera al volver.
            </p>
          </BentoCard>

          <BentoCard span={3}>
            <Ic n="receipt" c={BRAND.primary} s={22} />
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '14px 0 8px', letterSpacing: '-.01em' }}>
              Facturas con número correlativo y PDF
            </h4>
            <p style={{ color: BRAND.textMuted, fontSize: 13.5, lineHeight: 1.6 }}>
              Series múltiples, hash encadenado al estilo Veri*FACTU, QR en cada PDF.
              Cero líos cuando llega el trimestre.
            </p>
          </BentoCard>

          <BentoCard span={3}>
            <Ic n="scale" c={BRAND.primary} s={22} />
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '14px 0 8px', letterSpacing: '-.01em' }}>
              Caja vs devengo en un toggle
            </h4>
            <p style={{ color: BRAND.textMuted, fontSize: 13.5, lineHeight: 1.6 }}>
              Cambia el criterio fiscal por año en Ajustes. El resumen del 303 se recalcula al instante.
            </p>
          </BentoCard>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Btn primary onClick={() => navigate('/register')}>
            Calcular con tus números <Ic n="arrow" c="#FFFFFF" s={15} />
          </Btn>
        </div>
      </div>
    </section>
  );
};

const BentoCard = ({
  children, span = 3, rowSpan = 1,
}: { children: React.ReactNode; span?: number; rowSpan?: number }) => {
  const ref = useSpotlight();
  return (
    <div
      ref={ref}
      className="spotlight"
      style={{
        gridColumn: `span ${span}`,
        gridRow: `span ${rowSpan}`,
        padding: 28,
        borderRadius: 18,
        background: BRAND.surfaceRaised,
        border: `1px solid ${BRAND.border}`,
        transition: 'border-color .25s ease, transform .25s ease',
        cursor: 'default',
      }}
    >
      {children}
    </div>
  );
};

const Stat = ({ label, value, tint = BRAND.text, bg = 'rgba(255,255,255,.04)' }: { label: string; value: string; tint?: string; bg?: string }) => (
  <div style={{
    background: bg, borderRadius: 12, padding: '14px 16px',
    border: `1px solid ${BRAND.border}`, transition: 'all .3s',
  }}>
    <div style={{
      fontSize: 10, color: BRAND.textFaint, textTransform: 'uppercase',
      letterSpacing: .7, marginBottom: 6,
    }}>
      {label}
    </div>
    <div style={{
      fontSize: 22, fontWeight: 800, color: tint, letterSpacing: '-.02em',
      fontVariantNumeric: 'tabular-nums', lineHeight: 1,
    }}>
      {value}
    </div>
  </div>
);

// ── Section: Fiscal (replaces enemies comparison) ────────────────────────────
const FiscalSection = () => {
  const items = [
    { n: 'doc', title: 'Modelo 303 (IVA)', desc: 'Casillas 01–09, 17–19, 28–30 y 64 calculadas. Lo bajas en PDF y se lo entregas al gestor.' },
    { n: 'percent', title: 'Modelo 130 (IRPF)', desc: 'Acumulativo del año, con marca de exención si más del 70% va con retención.' },
    { n: 'qr', title: 'Veri*FACTU compatible', desc: 'Hash chain entre facturas, QR en cada PDF, log inmutable para auditoría.' },
    { n: 'euro', title: 'Recargo equivalencia', desc: 'Para comerciantes minoristas. Toggle por contrato, etiqueta automática en factura.' },
    { n: 'shield', title: 'Intracomunitario', desc: 'Cliente con NIF EU → IVA 0% + label "art. 25 LIVA" + datos para el modelo 349.' },
    { n: 'scale', title: 'Caja vs devengo', desc: 'Criterio fiscal por año. El resumen trimestral se recalcula automáticamente.' },
  ];

  return (
    <section id="fiscal" style={{ padding: '120px 24px', position: 'relative', overflow: 'hidden' }}>
      <Mesh variant="c" />
      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
        <FadeUp style={{ textAlign: 'center', marginBottom: 56 }}>
          <Pill>
            <Ic n="check" c={BRAND.success} s={12} />
            Cumplimiento fiscal español incluido
          </Pill>
          <h2 style={{
            fontSize: 'clamp(34px, 4.4vw, 60px)', fontWeight: 800,
            letterSpacing: '-.035em', marginBottom: 16, lineHeight: 1.05,
          }}>
            Lo que tu gestor agradecerá<br />
            <span style={{ color: BRAND.textMuted }}>cada trimestre.</span>
          </h2>
          <p style={{ color: BRAND.textMuted, fontSize: 17, maxWidth: 580, margin: '0 auto', lineHeight: 1.7 }}>
            Gainora no sustituye a un gestor. Le ahorra el 70% del trabajo.
            Llegas con todo cuadrado, sin sorpresas en abril ni en julio.
          </p>
        </FadeUp>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 14,
        }}>
          {items.map((it, i) => (
            <FadeUp key={it.title} delay={i * .04}>
              <FiscalCard {...it} />
            </FadeUp>
          ))}
        </div>

        <FadeUp style={{ textAlign: 'center', marginTop: 56 }}>
          <p style={{ color: BRAND.textDim, fontSize: 13, lineHeight: 1.7, maxWidth: 540, margin: '0 auto' }}>
            Gainora entrega los números preformateados. La presentación final ante la AEAT
            la hace siempre tu gestor o tú con tu certificado.
          </p>
        </FadeUp>
      </div>
    </section>
  );
};

const FiscalCard = ({ n, title, desc }: { n: string; title: string; desc: string }) => {
  const ref = useSpotlight();
  return (
    <div ref={ref} className="spotlight" style={{
      padding: 24, borderRadius: 16,
      background: BRAND.surface, border: `1px solid ${BRAND.border}`,
      transition: 'border-color .25s ease',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(10,132,255,.10)',
        display: 'grid', placeItems: 'center', marginBottom: 16,
        border: `1px solid rgba(10,132,255,.18)`,
      }}>
        <Ic n={n} c={BRAND.primary} s={18} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.text, marginBottom: 8, letterSpacing: '-.01em' }}>
        {title}
      </div>
      <div style={{ color: BRAND.textMuted, fontSize: 13.5, lineHeight: 1.65 }}>
        {desc}
      </div>
    </div>
  );
};

// ── Section: Pricing ─────────────────────────────────────────────────────────
const PricingSection = () => {
  const navigate = useNavigate();
  const features = [
    'Proyectos y clientes ilimitados',
    'Tarifa real /hora con tu capacidad',
    'Suscripciones con cron automático',
    'Facturas legales con PDF y QR',
    'Cumplimiento fiscal español',
    'Resumen trimestral 303 y 130',
    'Cronómetro y timer integrado',
    'Soporte directo del creador',
  ];

  return (
    <section id="pricing" style={{ padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
        <FadeUp style={{ textAlign: 'center', marginBottom: 48 }}>
          <Pill>Precio</Pill>
          <h2 style={{
            fontSize: 'clamp(34px, 4.4vw, 60px)', fontWeight: 800,
            letterSpacing: '-.035em', marginBottom: 16, lineHeight: 1.05,
          }}>
            Una sola línea de gasto.<br />
            <span style={{ color: BRAND.textMuted }}>El resto es ganancia.</span>
          </h2>
        </FadeUp>

        <FadeUp delay={.1}>
          <div style={{
            position: 'relative',
            borderRadius: 24,
            background: BRAND.surfaceRaised,
            border: `1px solid ${BRAND.borderStrong}`,
            padding: '56px 40px 48px',
            textAlign: 'center',
            overflow: 'hidden',
            boxShadow: `0 0 80px rgba(10,132,255,.12), 0 0 0 1px rgba(255,255,255,.04) inset`,
          }}>
            <div style={{
              position: 'absolute', inset: -1,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.primary})`,
              borderRadius: 24, padding: 1,
              WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor', maskComposite: 'exclude',
              opacity: .65, pointerEvents: 'none',
            }} />

            <div style={{
              fontSize: 'clamp(72px, 10vw, 112px)', fontWeight: 800,
              letterSpacing: '-.05em', lineHeight: 1, marginBottom: 8,
              background: `linear-gradient(180deg, #FFFFFF 0%, #B0BCC8 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              9,99 €
            </div>
            <div style={{ color: BRAND.textDim, fontSize: 14, marginBottom: 40 }}>
              al mes · sin permanencia
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 28px',
              maxWidth: 520, margin: '0 auto 40px', textAlign: 'left',
            }}>
              {features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Ic n="check" c={BRAND.success} s={14} />
                  <span style={{ color: BRAND.textMuted, fontSize: 14 }}>{f}</span>
                </div>
              ))}
            </div>

            <Btn primary onClick={() => navigate('/register')}>
              Empezar tu mes gratis <Ic n="arrow" c="#FFFFFF" s={15} />
            </Btn>
            <div style={{ color: BRAND.textFaint, fontSize: 12, marginTop: 16 }}>
              Sin tarjeta · 30 días · Cancela cuando quieras
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

// ── Section: Creator + Footer ────────────────────────────────────────────────
const CreatorAndFooter = () => {
  const navigate = useNavigate();
  return (
    <>
      <section id="about" style={{ padding: '100px 24px', position: 'relative', textAlign: 'center', overflow: 'hidden' }}>
        <FadeUp style={{ position: 'relative', zIndex: 2, maxWidth: 620, margin: '0 auto' }}>
          <Pill>Sobre el equipo</Pill>
          <h2 style={{
            fontSize: 'clamp(28px, 3.8vw, 48px)', fontWeight: 800,
            letterSpacing: '-.03em', marginBottom: 22, lineHeight: 1.1,
          }}>
            Construido por un autónomo,<br />para autónomos.
          </h2>
          <p style={{ color: BRAND.textMuted, fontSize: 16, lineHeight: 1.8, marginBottom: 36 }}>
            Gainora es un proyecto independiente, sin capital riesgo ni equipo de marketing.
            Once sprints de refactor y un objetivo claro: que cualquier autónomo entienda
            cuánto vale su hora y llegue al gestor con todo cuadrado.
          </p>
          <Btn onClick={() => navigate('/register')}>
            Probar la app <Ic n="arrow" c={BRAND.text} s={15} />
          </Btn>
        </FadeUp>
      </section>

      <footer style={{ padding: '64px 24px 40px', position: 'relative', borderTop: `1px solid ${BRAND.border}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 40, marginBottom: 48,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <GainoraWordmark size={22} textColor={BRAND.text} />
              </div>
              <p style={{ color: BRAND.textDim, fontSize: 13, lineHeight: 1.7, maxWidth: 220 }}>
                Control financiero real para autónomos que quieren crecer con la cabeza fría.
              </p>
            </div>

            {[
              {
                title: 'Producto',
                links: [
                  { l: 'Funcionamiento', h: '#flow' },
                  { l: 'Cumplimiento fiscal', h: '#fiscal' },
                  { l: 'Precio', h: '#pricing' },
                ],
              },
              {
                title: 'Empresa',
                links: [
                  { l: 'Equipo', h: '#about' },
                  { l: 'Contacto', h: 'mailto:hola@gainora.app' },
                  { l: 'Privacidad de datos', h: 'mailto:privacidad@gainora.app' },
                ],
              },
              {
                title: 'Legal',
                links: [
                  { l: 'Privacidad', h: '/privacy' },
                  { l: 'Términos', h: '/terms' },
                  { l: 'Aviso legal', h: '/legal' },
                  { l: 'Cookies', h: '/cookies' },
                ],
              },
            ].map(col => (
              <div key={col.title}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: BRAND.textFaint,
                  textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 16,
                }}>
                  {col.title}
                </div>
                {col.links.map(link => <FooterLink key={link.l} href={link.h}>{link.l}</FooterLink>)}
              </div>
            ))}
          </div>

          <div style={{
            borderTop: `1px solid ${BRAND.border}`, paddingTop: 24,
            color: BRAND.textFaint, fontSize: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <span>© 2026 Gainora. Todos los derechos reservados.</span>
            <span>Hecho en España con código limpio y café.</span>
          </div>
        </div>
      </footer>
    </>
  );
};

const FooterLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
  const [h, setH] = useState(false);
  const navigate = useNavigate();
  const onClick = (e: React.MouseEvent) => {
    if (href.startsWith('#') && href !== '#') {
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    }
    // mailto: y otros se gestionan por el navegador
  };
  return (
    <a
      href={href} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'block', color: h ? BRAND.text : BRAND.textDim,
        textDecoration: 'none', fontSize: 14, marginBottom: 10, transition: 'color .2s',
      }}
    >
      {children}
    </a>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  useEffect(() => {
    document.body.classList.add('landing-active');
    return () => { document.body.classList.remove('landing-active'); };
  }, []);

  // Memoize brand object so its identity is stable
  useMemo(() => BRAND, []);

  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <TrustStrip />
      <FlowSection />
      <FiscalSection />
      <PricingSection />
      <CreatorAndFooter />
    </div>
  );
}
