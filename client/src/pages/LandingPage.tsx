import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

// ── Hooks ────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          io.disconnect();
        }
      },
      { threshold }
    );
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

// ── Icons ────────────────────────────────────────────────────────────────────
const IC: Record<string, (c: string, s: number) => React.ReactNode> = {
  target: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  sparkles: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L14 8.5L21 10L14 11.5L12 18L10 11.5L3 10L10 8.5Z" />
      <path d="M5 2.5L5.5 4.5L7.5 5L5.5 5.5L5 7.5L4.5 5.5L2.5 5L4.5 4.5Z" />
      <path d="M19 14L19.5 16L21.5 16.5L19.5 17L19 19L18.5 17L16.5 16.5L18.5 16Z" />
    </svg>
  ),
  zap: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  shield: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  trending: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  clock: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  percent: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  alert: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  repeat: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  ),
  piechart: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 118 2.83" />
      <path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
  ),
  cloud: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 17 12 21 16 17" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29" />
    </svg>
  ),
  database: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  lock: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  wallet: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 010-4h14v4" />
      <path d="M3 5v14a2 2 0 002 2h16v-5" />
      <circle cx="18" cy="14" r="2" />
    </svg>
  ),
  brain: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 007 4.5A2.5 2.5 0 004.5 7H4a2 2 0 00-2 2v2a2 2 0 002 2h.5A2.5 2.5 0 009.5 18h5a2.5 2.5 0 002.5-2.5A2.5 2.5 0 0019.5 13H20a2 2 0 002-2V9a2 2 0 00-2-2h-.5A2.5 2.5 0 0017 4.5A2.5 2.5 0 0014.5 2h-5z" />
    </svg>
  ),
  crosshair: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  ),
  check: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  arrowright: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  github: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  twitter: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
};

const Ic = ({ n, c = '#6B7280', s = 20 }: { n: string; c?: string; s?: number }) => {
  return IC[n] ? <>{IC[n](c, s)}</> : null;
};

// ── Primitives ───────────────────────────────────────────────────────────────
const Badge = ({ children, C }: { children: React.ReactNode; C: string }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${C}33`, borderRadius: 100, padding: '5px 14px', fontSize: 12, color: C, marginBottom: 22, background: `${C}0C`, letterSpacing: .4, fontWeight: 500 }}>
    {children}
  </div>
);

const Btn = ({ children, primary, onClick, full, small, style: sx }: { children: React.ReactNode; primary?: boolean; onClick?: () => void; full?: boolean; small?: boolean; style?: React.CSSProperties }) => {
  const [h, setH] = useState(false);
  const C = "#00D4FF";
  const CM = "#0066FF";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding: small ? '9px 20px' : '13px 28px', borderRadius: 9, fontSize: small ? 13 : 15, fontWeight: 600, cursor: 'pointer', transition: 'all .22s',
        width: full ? '100%' : undefined, fontFamily: 'Inter,sans-serif',
        ...(primary ? {
          background: `linear-gradient(135deg,${C},${CM})`, border: 'none', color: '#050A14',
          boxShadow: h ? `0 4px 24px ${C}66` : `0 2px 12px ${C}33`,
          transform: h ? 'translateY(-2px)' : 'none'
        }
          : {
            background: 'transparent', border: `1px solid ${C}${h ? '66' : '2A'}`, color: h ? 'white' : C,
            boxShadow: h ? `0 0 18px ${C}22` : 'none', transform: h ? 'translateY(-2px)' : 'none'
          }),
        ...sx
      }}>
      {children}
    </button>
  );
};

const FadeUp = ({ children, delay = 0, style: sx }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) => {
  const [ref, vis] = useInView();
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(32px)', transition: `opacity .65s ease ${delay}s, transform .65s ease ${delay}s`, ...sx }}>
      {children}
    </div>
  );
};

// ── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = ({ C }: { C: string }) => {
  const [sc, setSc] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { const f = () => setSc(window.scrollY > 40); window.addEventListener('scroll', f); return () => window.removeEventListener('scroll', f) }, []);
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: sc ? 'rgba(5,10,20,0.94)' : 'transparent', backdropFilter: sc ? 'blur(24px)' : 'none',
      borderBottom: sc ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all .35s'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Ic n="target" c={C} s={22} />
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.5px', color: 'white' }}>HorasPRO</span>
      </div>
      <div style={{ display: 'flex', gap: 40 }} className="hidden md:flex">
        <NavLink href="#features">Funcionalidades</NavLink>
        <NavLink href="#pricing">Precios</NavLink>
        <NavLink href="#about">Compañía</NavLink>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexShrink: 0 }}>
        <button onClick={() => navigate('/login')} style={{ color: '#6B7280', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color .2s', background: 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}>Login</button>
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
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  return <a href={href} onClick={scroll} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ color: h ? 'white' : '#6B7280', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color .2s' }}>{children}</a>;
};

// ── Hero ─────────────────────────────────────────────────────────────────────
const Hero = ({ C, CM, headline }: { C: string; CM: string; headline: string }) => {
  const stars = useMemo(() => [...Array(28)].map((_, i) => ({ x: (i * 43 + 11) % 100, y: (i * 67 + 19) % 75, o: (i % 4 + 1) * 0.055, s: i % 7 === 0 ? 2 : 1.5 })), []);
  const navigate = useNavigate();
  return (
    <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden', padding: '120px 40px 60px' }}>
      {stars.map((s, i) => <div key={i} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: '50%', background: 'white', opacity: s.o, pointerEvents: 'none' }} />)}

      <div className="breathe" style={{ position: 'absolute', bottom: '12%', left: '50%', transform: 'translateX(-50%)', width: 720, height: 320, borderRadius: '50%', background: `radial-gradient(ellipse, ${C}44 0%, ${CM}18 40%, transparent 72%)`, filter: 'blur(72px)', pointerEvents: 'none' }} />

      <div style={{ animation: 'fade-up .8s ease-out forwards', opacity: 0 }}>
        <Badge C={C}><Ic n="sparkles" c={C} s={13} />Calcula tu margen en tiempo real</Badge>
      </div>

      <h1 style={{ fontSize: 'clamp(52px,6.8vw,96px)', fontWeight: 900, lineHeight: 1.03, letterSpacing: '-3px', marginBottom: 26, maxWidth: 840, whiteSpace: 'pre-line', animation: 'fade-up .8s .1s ease-out forwards', opacity: 0, color: 'white' }}>
        {headline}
      </h1>
      <p style={{ fontSize: 'clamp(16px,1.7vw,20px)', color: '#6B7280', maxWidth: 520, lineHeight: 1.75, marginBottom: 44, animation: 'fade-up .8s .2s ease-out forwards', opacity: 0 }}>
        Conecta tus horas, gastos variables y cuotas fijas para conocer tu margen de beneficio exacto, al céntimo.
      </p>
      <div style={{ display: 'flex', gap: 14, marginBottom: 84, animation: 'fade-up .8s .3s ease-out forwards', opacity: 0 }}>
        <Btn primary onClick={() => navigate('/register')}>Empezar gratis</Btn>
        <Btn onClick={() => {
          const el = document.querySelector('#demo');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Ver demo <Ic n="arrowright" c={C} s={16} /></Btn>
      </div>

      <div className="float" style={{ maxWidth: 860, width: '100%', animation: 'fade-up .9s .45s ease-out forwards', opacity: 0 }}>
        <Dashboard C={C} animated={true} />
      </div>
    </section>
  );
};

// ── Real Dashboard mockup ─────────────────────────────────────────────────────
const Dashboard = ({ C, animated }: { C: string; animated?: boolean }) => {
  const [ref, vis] = useInView(0.1);
  const revenue = useCountUp(24580, animated || vis);
  const costs = useCountUp(8210, animated || vis);
  const margin = useCountUp(66, animated || vis);

  const clients = [
    { name: 'Agencia Nómada', project: 'Branding Q2', hours: 42, margin: '+71%', status: 'Cobrado' },
    { name: 'FinStack SL', project: 'Dev Sprint #8', hours: 31, margin: '+58%', status: 'Cobrado' },
    { name: 'Bloom Studios', project: 'Campaña Social', hours: 18, margin: '+82%', status: 'Parcial' },
    { name: 'NorteTech', project: 'Auditoría Web', hours: 24, margin: '+44%', status: 'Pendiente' },
  ];

  return (
    <div id="demo" ref={ref} style={{ borderRadius: 18, background: 'rgba(6,11,22,0.92)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.09)', borderTop: '1px solid rgba(255,255,255,0.14)', overflow: 'hidden', boxShadow: `0 0 120px ${C}10, 0 48px 96px rgba(0,0,0,.75)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map(cl => <div key={cl} style={{ width: 11, height: 11, borderRadius: '50%', background: cl, opacity: .85 }} />)}
        <div style={{ flex: 1, marginLeft: 10, height: 22, background: 'rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#374151', fontSize: 11, fontFamily: 'monospace' }}>app.gainora.io/dashboard</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Abr', 'May', 'Jun', 'Jul'].map((m, i) => (
            <span key={m} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, background: i === 3 ? `${C}20` : 'transparent', color: i === 3 ? C : '#374151', cursor: 'pointer', fontWeight: i === 3 ? 600 : 400 }}>{m}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', minHeight: 320 }} className="flex-col sm:grid">
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', padding: '20px 0' }} className="hidden sm:block">
          {[{ n: 'target', l: 'Dashboard', a: true }, { n: 'trending', l: 'Rentabilidad' }, { n: 'clock', l: 'Tiempo' }, { n: 'wallet', l: 'Clientes' }, { n: 'percent', l: 'IVA & Taxes' }, { n: 'cloud', l: 'Exportar' }].map(it => (
            <div key={it.l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', margin: '1px 8px', borderRadius: 8, background: it.a ? `${C}12` : 'transparent', cursor: 'pointer', transition: 'background .2s' }}
              onMouseEnter={e => !it.a && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => !it.a && (e.currentTarget.style.background = 'transparent')}>
              <Ic n={it.n} c={it.a ? C : '#374151'} s={15} />
              <span style={{ fontSize: 13, color: it.a ? C : '#4B5563', fontWeight: it.a ? 600 : 400 }}>{it.l}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 18 }}>
            {[
              { l: 'Ingresos', v: `${revenue.toLocaleString('es-ES')} €`, sub: '↑ 12% vs mes anterior', color: 'white' },
              { l: 'Costes totales', v: `${costs.toLocaleString('es-ES')} €`, sub: 'Fijos + variables', color: 'white' },
              { l: 'Margen Neto', v: `+${margin}%`, sub: 'Objetivo: >50%', color: '#00E676', bg: 'rgba(0,230,118,0.07)' },
            ].map(k => (
              <div key={k.l} style={{ background: k.bg || 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '13px 15px' }}>
                <div style={{ fontSize: 10, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .6 }}>{k.l}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color, letterSpacing: '-1px', lineHeight: 1 }}>{k.v}</div>
                <div style={{ fontSize: 10, color: '#4B5563', marginTop: 5 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#4B5563', textTransform: 'uppercase', letterSpacing: .6 }}>Rentabilidad mensual</span>
              <span style={{ fontSize: 11, color: C, fontWeight: 600 }}>+66% julio</span>
            </div>
            <svg viewBox="0 0 720 70" style={{ width: '100%', height: 70, overflow: 'visible' }}>
              <defs>
                <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C} stopOpacity=".2" />
                  <stop offset="100%" stopColor={C} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,65 C60,58 100,52 150,44 C200,36 220,50 270,34 C310,20 350,26 400,14 C450,4 500,8 560,4 C620,1 670,2 720,0 L720,70 L0,70Z" fill="url(#cgrad)" />
              {(animated || vis) && <path d="M0,65 C60,58 100,52 150,44 C200,36 220,50 270,34 C310,20 350,26 400,14 C450,4 500,8 560,4 C620,1 670,2 720,0" fill="none" stroke={C} strokeWidth="1.8" strokeDasharray="1200" className="draw-chart" />}
              {[[150, 44], [400, 14], [720, 0]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={C} opacity=".9" />)}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#1F2937', marginTop: 6, paddingBottom: 2 }}>
              {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'].map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, overflow: 'hidden' }} className="hidden sm:block">
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr .6fr .6fr .7fr', padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {['Cliente', 'Proyecto', 'Horas', 'Margen', 'Estado'].map(h => <span key={h} style={{ fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: .6 }}>{h}</span>)}
            </div>
            {clients.map((cl, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr .6fr .6fr .7fr', padding: '9px 14px', borderBottom: i < clients.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#D1D5DB' }}>{cl.name}</span>
                <span style={{ fontSize: 11, color: '#4B5563' }}>{cl.project}</span>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{cl.hours}h</span>
                <span style={{ fontSize: 12, color: '#00E676', fontWeight: 600 }}>{cl.margin}</span>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, display: 'inline-block', background: cl.status === 'Cobrado' ? 'rgba(0,230,118,0.1)' : cl.status === 'Parcial' ? 'rgba(251,191,36,0.1)' : 'rgba(107,114,128,0.1)', color: cl.status === 'Cobrado' ? '#00E676' : cl.status === 'Parcial' ? '#FBB724' : '#6B7280', fontWeight: 500 }}>{cl.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Highlights ────────────────────────────────────────────────────────────────
const Highlights = ({ C }: { C: string }) => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: 60, padding: '20px 40px 56px', borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
    {[{ n: 'zap', t: 'Sincronización en tiempo real' }, { n: 'shield', t: 'Tus márgenes 100% privados' }, { n: 'trending', t: '+40% de rentabilidad media recuperada' }].map(h => (
      <div key={h.t} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Ic n={h.n} c={C} s={16} />
        <span style={{ color: '#4B5563', fontSize: 13, fontWeight: 500 }}>{h.t}</span>
      </div>
    ))}
  </div>
);

// ── Section 2 ────────────────────────────────────────────────────────────────
const Section2 = ({ C }: { C: string }) => {
  const navigate = useNavigate();
  const [hours, setHours] = useState(80);
  const rate = 85, fixed = 1200;
  const revenue = hours * rate, net = revenue - fixed, margin = Math.round((net / revenue) * 100);
  const good = margin > 50;

  const grid = [
    { n: 'clock', t: 'Cronómetro integrado', d: 'Registra el tiempo exacto por cliente o incidencia con un clic.' },
    { n: 'percent', t: 'Gestión de IVA', d: 'Visualiza el precio bruto, el neto y tu base imponible al instante.' },
    { n: 'alert', t: 'Tickets de Inconvenientes', d: 'Aísla los problemas. Descubre cuánto margen te comen los bugs.' },
    { n: 'repeat', t: 'MRR Automatizado', d: 'Convierte proyectos en suscripciones y proyecta tu flujo de caja.' },
    { n: 'piechart', t: 'Prorrateo de Costes', d: 'El servidor no se paga solo. Divídelo automáticamente entre clientes.' },
    { n: 'cloud', t: 'Exportación Limpia', d: 'Tus datos contables listos para tu gestor en un formato que da gusto leer.' },
  ];

  return (
    <section id="features" style={{ padding: '110px 40px', position: 'relative', overflow: 'hidden' }}>
      <div className="breathe" style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${C}1A 0%, transparent 70%)`, filter: 'blur(90px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <FadeUp style={{ textAlign: 'center', marginBottom: 64 }}>
          <Badge C={C}>HorasPRO Flow</Badge>
          <h2 style={{ fontSize: 'clamp(34px,4vw,60px)', fontWeight: 900, letterSpacing: '-2px', marginBottom: 16 }}>Tu rentabilidad,<br />sin hojas de cálculo.</h2>
          <p style={{ color: '#6B7280', fontSize: 17, maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>Olvídate de cruzar datos a final de mes. HorasPRO procesa tus ingresos, horas y costes en un solo flujo.</p>
        </FadeUp>

        <FadeUp delay={.1}>
          <div style={{ maxWidth: 520, margin: '0 auto 88px', borderRadius: 20, background: 'rgba(6,11,22,0.95)', border: '1px solid rgba(255,255,255,0.08)', padding: 32, boxShadow: `0 0 60px ${C}0D` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C, boxShadow: `0 0 8px ${C}` }} />
              <span style={{ fontSize: 11, color: C, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Calculadora en vivo</span>
            </div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#6B7280', fontSize: 14 }}>Horas facturadas este mes</span>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{hours}h</span>
              </div>
              <input type="range" min={10} max={200} value={hours} onChange={e => setHours(+e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#1F2937', marginTop: 5 }}><span>10h</span><span>200h</span></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '15px 18px' }}>
                <div style={{ fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: .7, marginBottom: 6 }}>Ingresos brutos</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'white', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>{revenue.toLocaleString('es-ES')} €</div>
              </div>
              <div style={{ background: good ? 'rgba(0,230,118,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: 12, padding: '15px 18px', border: `1px solid ${good ? 'rgba(0,230,118,0.2)' : 'rgba(239,68,68,0.2)'}`, transition: 'all .4s' }}>
                <div style={{ fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: .7, marginBottom: 6 }}>Margen Neto</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: good ? '#00E676' : '#EF4444', letterSpacing: '-1px', transition: 'color .4s' }}>{margin}%</div>
              </div>
            </div>
            <div style={{ padding: '11px 16px', background: `${C}0C`, borderRadius: 9, display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>Beneficio neto</span>
              <span style={{ color: C, fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{net.toLocaleString('es-ES')} €</span>
            </div>
            <Btn full primary onClick={() => navigate('/register')}>Calcular con mis datos reales →</Btn>
          </div>
        </FadeUp>

        <FadeUp delay={.05}>
          <h3 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 32, color: '#9CA3AF', letterSpacing: '-.3px' }}>Domina cada aspecto de tu agencia.</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {grid.map((b, i) => <FadeUp key={b.t} delay={i * .05}><GridCard b={b} C={C} /></FadeUp>)}
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

const GridCard = ({ b, C }: { b: { n: string; t: string; d: string; }; C: string }) => {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ padding: 24, borderRadius: 14, border: h ? `1px solid ${C}33` : '1px solid rgba(255,255,255,0.05)', background: h ? `${C}06` : 'rgba(255,255,255,0.02)', transition: 'all .28s', cursor: 'default' }}>
      <div style={{ marginBottom: 14, opacity: h ? 1 : .7, transition: 'opacity .28s' }}><Ic n={b.n} c={C} s={20} /></div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 7, color: '#D1D5DB' }}>{b.t}</div>
      <div style={{ color: '#4B5563', fontSize: 13, lineHeight: 1.65 }}>{b.d}</div>
    </div>
  );
};

// ── Section 3 ────────────────────────────────────────────────────────────────
const Section3 = ({ C }: { C: string }) => (
  <section style={{ padding: '110px 40px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 440, height: 440, pointerEvents: 'none', background: `linear-gradient(to bottom, transparent, ${C}22, transparent)`, clipPath: 'polygon(30% 0%,70% 0%,100% 100%,0% 100%)', filter: 'blur(48px)', opacity: .65 }} />
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <FadeUp style={{ textAlign: 'center', marginBottom: 72 }}>
        <Badge C={C}>Ganancias centralizadas</Badge>
        <h2 style={{ fontSize: 'clamp(34px,4vw,60px)', fontWeight: 900, letterSpacing: '-2px', marginBottom: 16 }}>Dale superpoderes a tu agencia.</h2>
        <p style={{ color: '#6B7280', fontSize: 17, maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>Transforma el caos de horas sueltas, facturas perdidas y proyectos infinitos en un sistema predecible y rentable.</p>
      </FadeUp>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginBottom: 96 }}>
        {[
          { t: 'Conexión financiera.', d: 'Sincroniza cada gasto variable al instante. Cada hora registrada alimenta tu margen en tiempo real.', tag: 'Horas · Gastos · Clientes → Rentabilidad' },
          { t: 'Captura el dinero, sin fricción.', d: 'No dejes que un pago parcial rompa tu contabilidad mensual.', tag: '✓ Cobrado · En progreso · Pendiente' },
        ].map((b, i) => (
          <FadeUp key={b.t} delay={i * .1}>
            <div style={{ padding: 32, borderRadius: 16, background: 'rgba(6,11,22,0.8)', border: '1px solid rgba(255,255,255,0.07)', height: '100%' }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10, color: 'white' }}>{b.t}</div>
              <div style={{ color: '#4B5563', fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>{b.d}</div>
              <div style={{ background: `${C}0C`, borderRadius: 8, padding: '9px 14px', color: C, fontSize: 12, fontWeight: 600, letterSpacing: .3 }}>{b.tag}</div>
            </div>
          </FadeUp>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 64, alignItems: 'center', marginBottom: 96 }}>
        <FadeUp><RadarViz C={C} /></FadeUp>
        <FadeUp delay={.1}>
          <Badge C={C}>Control absoluto</Badge>
          <h3 style={{ fontSize: 'clamp(24px,2.8vw,38px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 16, lineHeight: 1.18 }}>Nunca vuelvas a perder dinero por un descuido.</h3>
          <p style={{ color: '#4B5563', fontSize: 15, lineHeight: 1.8, marginBottom: 32 }}>Aísla las horas invertidas en solucionar bugs o pedir soporte. Mide qué clientes te son rentables de verdad.</p>
          {[
            { n: 'database', t: 'Tu ecosistema, cerrado.', d: 'Un cliente no contamina los gastos de otro. Privacidad total a nivel de Tenant.' },
            { n: 'lock', t: 'Métricas que no mienten.', d: 'El IVA no es tuyo. Te damos el Margen Neto real para que sepas qué puedes gastar hoy.' },
          ].map(h => (
            <div key={h.t} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, flexShrink: 0, height: 'fit-content', border: '1px solid rgba(255,255,255,0.06)' }}><Ic n={h.n} c={C} s={17} /></div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#D1D5DB' }}>{h.t}</div>
                <div style={{ color: '#4B5563', fontSize: 13, lineHeight: 1.65 }}>{h.d}</div>
              </div>
            </div>
          ))}
        </FadeUp>
      </div>

      <FadeUp>
        <div style={{ textAlign: 'center', padding: '72px 48px', borderRadius: 22, background: 'rgba(6,11,22,0.95)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 120%, ${C}18 0%, transparent 60%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ width: 56, height: 56, margin: '0 auto 18px', background: 'rgba(255,255,255,0.05)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)' }}><Ic n="lock" c={C} s={24} /></div>
            <Badge C={C}>Auditoría</Badge>
            <h3 style={{ fontSize: 'clamp(26px,3vw,42px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 16 }}>Seguridad a prueba de gestores.</h3>
            <p style={{ color: '#4B5563', fontSize: 16, maxWidth: 480, margin: '0 auto', lineHeight: 1.8 }}>Toda modificación deja rastro. Las tarifas por hora, cuotas fijas y márgenes están blindados para que tus informes sean impecables.</p>
          </div>
        </div>
      </FadeUp>
    </div>
  </section>
);

const RadarViz = ({ C }: { C: string }) => (
  <div style={{ position: 'relative', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {[220, 165, 110, 58].map((r, i) => (
      <div key={r} style={{ position: 'absolute', width: r, height: r, borderRadius: '50%', border: `1px solid rgba(255,255,255,${.06 - i * .01})` }} />
    ))}
    <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: `conic-gradient(from 0deg, transparent 0deg, ${C}14 22deg, transparent 23deg)`, animation: 'radar-spin 4s linear infinite' }} />
    {[{ a: 40, r: 72 }, { a: 135, r: 95 }, { a: 250, r: 52 }, { a: 310, r: 80 }].map((p, i) => {
      const rad = p.a * Math.PI / 180, x = Math.cos(rad) * p.r + 110, y = Math.sin(rad) * p.r + 110;
      return <div key={i} style={{ position: 'absolute', left: x, top: y, width: i === 0 ? 6 : 4, height: i === 0 ? 6 : 4, borderRadius: '50%', background: C, boxShadow: `0 0 ${i === 0 ? 12 : 6}px ${C}`, transform: 'translate(-50%,-50%)', opacity: i === 0 ? 1 : .6 }} />;
    })}
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: C, boxShadow: `0 0 16px ${C}, 0 0 32px ${C}44`, zIndex: 2 }} />
  </div>
);

// ── Section 4 ────────────────────────────────────────────────────────────────
const Section4 = ({ C, CM, price }: { C: string; CM: string; price: string }) => {
  const benefits = [
    { n: 'clock', color: '#F59E0B', t: 'Tiempo', d: 'Ficha horas y asigna gastos en 3 segundos desde cualquier dispositivo.' },
    { n: 'wallet', color: '#10B981', t: 'Dinero', d: 'Detecta fugas de capital y proyectos en rojo antes de que termine el mes.' },
    { n: 'brain', color: '#8B5CF6', t: 'Salud Mental', d: 'Se acabó el estrés de cruzar Excels a las 11 de la noche los domingos.' },
    { n: 'crosshair', color: '#EF4444', t: 'Foco', d: 'Deja de microgestionar y vuelve a centrarte en lo que realmente da valor.' },
  ];
  const features = ['Usuarios y proyectos ilimitados', 'Dashboard de rentabilidad neta', 'Gestión de suscripciones (MRR)', 'Tickets de inconvenientes', 'Cronómetro integrado', 'Exportación para gestor', 'Gestión de IVA automática', 'Soporte prioritario'];
  const stars = useMemo(() => [...Array(22)].map((_, i) => ({ x: (i * 41 + 7) % 100, y: (i * 67 + 13) % 90, s: i % 6 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5, o: (i % 4 + 1) * 0.055 + 0.04 })), []);
  const navigate = useNavigate();

  return (
    <section id="pricing" style={{ padding: '110px 40px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <FadeUp style={{ textAlign: 'center', marginBottom: 56 }}>
          <Badge C={C}>El efecto HorasPRO</Badge>
          <h2 style={{ fontSize: 'clamp(34px,4vw,60px)', fontWeight: 900, letterSpacing: '-2px' }}>Con HorasPRO ahorrarás...</h2>
        </FadeUp>
        <FadeUp delay={.1}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 1,
            marginBottom: 96,
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.05)'
          }}>
            {benefits.map((b) => <BenefitQuad key={b.t} b={b} />)}
          </div>
        </FadeUp>

        <FadeUp>
          <div style={{ textAlign: 'center', position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '88px 48px 100px', background: 'rgba(5,9,18,1)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {stars.map((s, i) => <div key={i} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: '50%', background: 'white', opacity: s.o, pointerEvents: 'none' }} />)}
            <div style={{ position: 'absolute', bottom: -180, left: '50%', transform: 'translateX(-50%)', width: 800, height: 380, borderRadius: '50%', background: `radial-gradient(ellipse, ${C}45 0%, ${CM}20 35%, transparent 70%)`, filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <Badge C={C}>Transparencia total</Badge>
              <h2 style={{ fontSize: 'clamp(26px,3vw,40px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 44 }}>Crece sin fricciones. Precios claros.</h2>
              <div className="price-text" style={{ fontSize: 'clamp(72px,9vw,112px)', fontWeight: 900, letterSpacing: '-4px', lineHeight: 1, marginBottom: 10, color: 'white' }}>{price}</div>
              <div style={{ color: '#374151', fontSize: 15, marginBottom: 52 }}>/ mes · sin sorpresas</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, maxWidth: 500, margin: '0 auto 52px', textAlign: 'left' }}>
                {features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Ic n="check" c="#00E676" s={14} />
                    <span style={{ color: '#9CA3AF', fontSize: 14 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Btn primary onClick={() => navigate('/register')}>Empieza tu mes gratis</Btn>
              <div style={{ color: '#1F2937', fontSize: 12, marginTop: 14 }}>Sin tarjeta de crédito · Cancela cuando quieras</div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

const BenefitQuad = ({ b }: { b: { n: string; color: string; t: string; d: string; }; }) => {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: 44, background: h ? `${b.color}07` : 'rgba(6,11,22,0.95)', transition: 'background .3s', cursor: 'default',
        height: '100%'
      }}>
      <div style={{ width: 48, height: 48, borderRadius: 13, background: `${b.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, border: `1px solid ${b.color}22` }}>
        <Ic n={b.n} c={b.color} s={22} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 9, letterSpacing: '-.5px' }}>{b.t}</div>
      <div style={{ color: '#4B5563', fontSize: 14, lineHeight: 1.72 }}>{b.d}</div>
    </div>
  );
};

// ── Section 5 ────────────────────────────────────────────────────────────────
const Section5 = ({ C }: { C: string }) => {
  const navigate = useNavigate();
  const stars = useMemo(() => [...Array(45)].map((_, i) => ({ x: (i * 37 + 9) % 100, y: (i * 53 + 23) % 100, o: (i % 5 + 1) * 0.04, s: i % 8 === 0 ? 2 : 1.5 })), []);
  return (
    <>
    <section id="about" style={{ padding: '120px 40px', position: 'relative', textAlign: 'center', overflow: 'hidden' }}>
        {stars.map((s, i) => <div key={i} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: '50%', background: 'white', opacity: s.o, pointerEvents: 'none' }} />)}
        <FadeUp style={{ position: 'relative', zIndex: 2, maxWidth: 600, margin: '0 auto' }}>
          <Badge C={C}>Sobre el creador</Badge>
          <h2 style={{ fontSize: 'clamp(30px,4vw,54px)', fontWeight: 900, letterSpacing: '-2px', marginBottom: 24, lineHeight: 1.1 }}>Soy estudiante.<br />Y estaba cansado del software mediocre.</h2>
          <p style={{ color: '#4B5563', fontSize: 17, lineHeight: 1.85, marginBottom: 44 }}>HorasPRO no es una corporación sin alma. Es una herramienta construida desde las trincheras para devolver el control financiero a agencias y freelancers. Sin ruido, sin capital riesgo. Solo buen código.</p>
          <Btn onClick={() => window.open('https://tandemsoftware.es', '_blank')}>Conoce mi historia</Btn>
        </FadeUp>
      </section>

      <section style={{ padding: '40px 40px 120px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 220, background: `linear-gradient(to top,${C}44,transparent)`, filter: 'blur(56px)', pointerEvents: 'none' }} />
        <FadeUp style={{ maxWidth: 580, margin: '0 auto', position: 'relative' }}>
          <div style={{ background: 'rgba(6,11,22,0.96)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '64px 48px', boxShadow: `0 0 80px ${C}12` }}>
            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '70%', height: 1, background: `linear-gradient(90deg,transparent,${C},transparent)`, animation: 'neon-pulse 3s ease-in-out infinite' }} />
            <Badge C={C}>Aprende rápido</Badge>
            <h2 style={{ fontSize: 'clamp(26px,3vw,38px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 16 }}>Simula tu rentabilidad en 3 clics.</h2>
            <p style={{ color: '#4B5563', fontSize: 15, lineHeight: 1.8, marginBottom: 36 }}>Prueba la demo interactiva en el navegador. No guarda tus datos y no te pedirá tarjeta de crédito.</p>
            <Btn primary onClick={() => navigate('/register')}>Abrir Simulador Local</Btn>
          </div>
        </FadeUp>
      </section>

      <footer style={{ padding: '56px 40px 36px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${C}44,transparent)`, animation: 'neon-pulse 4s ease-in-out infinite' }} />
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeUp style={{ textAlign: 'center', marginBottom: 60 }}>
            <h3 style={{ fontSize: 'clamp(20px,2.5vw,32px)', fontWeight: 800, letterSpacing: '-.5px', color: '#D1D5DB' }}>La herramienta que usan las agencias que ganan dinero.</h3>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}><Ic n="target" c={C} s={19} /><span style={{ fontSize: 17, fontWeight: 800 }}>HorasPRO</span></div>
              <p style={{ color: '#374151', fontSize: 13, lineHeight: 1.75, maxWidth: 210 }}>Control financiero real para agencias y freelancers que quieren crecer con la cabeza fría.</p>
              <div style={{ display: 'flex', gap: 14, marginTop: 20 }}>
                {['github', 'twitter'].map(n => (
                  <a key={n} href="#" style={{ opacity: .4, transition: 'opacity .2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                    <Ic n={n} c="#9CA3AF" s={18} />
                  </a>
                ))}
              </div>
            </div>
            {[{ title: 'Producto', links: [{ l: 'Funcionalidades', h: '#features' }, { l: 'Precios', h: '#pricing' }] }, { title: 'Compañía', links: [{ l: 'Sobre mí', h: '#about' }, { l: 'Contacto', h: 'mailto:hola@gainora.io' }] }].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 18 }}>{col.title}</div>
                {col.links.map(link => <FooterLink key={link.l} href={link.h}>{link.l}</FooterLink>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 24, color: '#1F2937', fontSize: 12, textAlign: 'center' }}>© 2026 HorasPRO. Todos los derechos reservados.</div>
        </div>
      </footer>
    </>
  );
};

const FooterLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
  const [h, setH] = useState(false);
  const scroll = (e: React.MouseEvent) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  return <a href={href} onClick={scroll} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ display: 'block', color: h ? '#9CA3AF' : '#374151', textDecoration: 'none', fontSize: 14, marginBottom: 11, transition: 'color .2s' }}>{children}</a>;
};


// ── App ───────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const C = '#00D4FF';
  const CM = '#0066FF';
  const price = '9,99€';
  const heroHeadline = 'Descubre cuánto\nganas realmente.';

  useEffect(() => {
    document.body.classList.add('landing-active');
    return () => {
      document.body.classList.remove('landing-active');
    };
  }, []);

  return (
    <div className="landing-page">
      <Navbar C={C} />
      <Hero C={C} CM={CM} headline={heroHeadline} />
      <Highlights C={C} />
      <Section2 C={C} />
      <Section3 C={C} />
      <Section4 C={C} CM={CM} price={price} />
      <Section5 C={C} />
    </div>
  );
}
