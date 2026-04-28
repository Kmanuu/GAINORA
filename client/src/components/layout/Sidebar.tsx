// ============================================================================
// Sidebar.tsx — Navegación lateral estilo macOS Sonoma
// ============================================================================

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Clock,
  Wallet,
  Receipt,
  FileText,
  TrendingDown,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  Sun,
  Moon,
  PlayCircle,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth }        from '@/context/AuthContext';
import { useTheme }       from '@/context/ThemeContext';
import { useOnboarding }  from '@/context/OnboardingContext';

// ---------------------------------------------------------------------------
// Datos de navegación
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  path:  string;
  icon:  React.ElementType;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard',   path: '/dashboard',      icon: LayoutDashboard },
  { label: 'Proyectos',   path: '/proyectos',      icon: FolderKanban    },
  { label: 'Clientes',    path: '/clientes',       icon: Users           },
  { label: 'Horas',       path: '/horas',          icon: Clock           },
];

const catalogNav: NavItem[] = [
  { label: 'Planes',      path: '/planes',         icon: Sparkles        },
];

const costsNav: NavItem[] = [
  { label: 'Cobros',           path: '/cobros',            icon: Wallet       },
  { label: 'Facturas',         path: '/facturas',          icon: FileText     },
  { label: 'Costes fijos',     path: '/costes-fijos',      icon: Receipt      },
  { label: 'Costes variables', path: '/costes-variables',  icon: TrendingDown },
];

const analysisNav: NavItem[] = [
  { label: 'Informes', path: '/informes', icon: BarChart3 },
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

function useTimerActive() {
  const [active, setActive] = useState(() => !!localStorage.getItem('hp_timer_start'));
  useEffect(() => {
    const check = () => setActive(!!localStorage.getItem('hp_timer_start'));
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);
  return active;
}

export default function Sidebar() {
  const { user, tenant, logout } = useAuth();
  const { isDark, toggleTheme }  = useTheme();
  const { open: openOnboarding } = useOnboarding();
  const navigate    = useNavigate();
  const timerActive = useTimerActive();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40',
        'flex flex-col',
        'w-[240px] h-full',
        'backdrop-blur-[24px] transition-colors duration-300',
        isDark
          ? 'bg-[rgba(22,22,28,0.82)] border-r border-[rgba(255,255,255,0.06)]'
          : 'bg-[rgba(255,255,255,0.82)] border-r border-[rgba(0,0,0,0.06)]',
      )}
    >
      {/* Logo + tenant + theme toggle */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
            title="Ir al Dashboard"
          >
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(180deg, #0A84FF 0%, #0060C0 100%)',
                boxShadow: '0 2px 8px rgba(10,132,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} fill="white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-[var(--color-text)] leading-tight tracking-[-0.01em]">
                HorasPRO
              </p>
              <p className="text-[11px] text-[var(--color-text-tertiary)] truncate leading-tight mt-0.5">
                {tenant?.name ?? '—'}
              </p>
            </div>
          </button>
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={clsx(
              'w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0',
              'transition-all duration-200',
              isDark
                ? 'bg-[rgba(255,255,255,0.06)] text-[var(--color-orange)] hover:bg-[rgba(255,255,255,0.10)]'
                : 'bg-[rgba(0,0,0,0.04)] text-[var(--color-text-secondary)] hover:bg-[rgba(0,0,0,0.08)] hover:text-[var(--color-orange)]',
            )}
          >
            {isDark
              ? <Moon className="w-4 h-4" strokeWidth={1.8} />
              : <Sun  className="w-4 h-4" strokeWidth={1.8} />
            }
          </button>
        </div>
      </div>

      {/* Separador */}
      <div className="mx-4 h-px bg-[var(--color-border)]" />

      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <SectionLabel label="Principal" />
        {mainNav.map((item) => (
          <NavItem key={item.path} {...item} badge={item.path === '/horas' && timerActive ? 'timer' : undefined} />
        ))}

        <div className="pt-4">
          <SectionLabel label="Catálogo" />
        </div>
        {catalogNav.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}

        <div className="pt-4">
          <SectionLabel label="Costes" />
        </div>
        {costsNav.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}

        <div className="pt-4">
          <SectionLabel label="Análisis" />
        </div>
        {analysisNav.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </nav>

      {/* Footer: user + acciones */}
      <div className="px-3 pb-4 space-y-0.5">
        <div className="mx-1 h-px bg-[var(--color-border)] mb-3" />

        <NavItem label="Ayuda"   path="/ayuda"   icon={BookOpen} />
        <NavItem label="Ajustes" path="/ajustes" icon={Settings} />

        {/* Tutorial — siempre disponible */}
        <button
          onClick={() => openOnboarding('main')}
          className={clsx(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px]',
            'text-[13px] font-medium transition-all duration-150',
            'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]',
          )}
        >
          <PlayCircle
            className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]"
            strokeWidth={1.8}
          />
          Repetir tutorial
        </button>

        {/* User chip */}
        <div className="flex items-center gap-1 mt-1 rounded-[10px]">
          <button
            onClick={() => navigate('/ajustes')}
            className={clsx(
              'flex items-center gap-2.5 flex-1 min-w-0 px-3 py-2 rounded-[10px] text-left',
              'transition-colors duration-150',
              'hover:bg-[var(--color-border)]',
            )}
            title="Ajustes de perfil"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[12px] font-semibold"
              style={{
                background: 'var(--color-blue-subtle)',
                color:      'var(--color-blue)',
              }}
            >
              {user?.fullName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-[var(--color-text)] truncate leading-tight">
                {user?.fullName ?? '—'}
              </p>
              <p className="text-[10px] text-[var(--color-text-tertiary)] truncate leading-tight mt-0.5">
                {user?.role ?? '—'}
              </p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className={clsx(
              'p-1.5 mr-1 rounded-[8px] text-[var(--color-text-tertiary)]',
              'hover:bg-[var(--color-red-subtle)] hover:text-[var(--color-red)]',
              'transition-colors duration-150 shrink-0',
            )}
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
      {label}
    </p>
  );
}

function NavItem({ label, path, icon: Icon, badge }: NavItem & { badge?: 'timer' }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-3 py-2 rounded-[10px]',
          'text-[13px] font-medium',
          'transition-all duration-150',
          isActive
            ? 'bg-[var(--color-blue-subtle)] text-[var(--color-blue)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={clsx(
              'w-4 h-4 shrink-0 transition-colors',
              isActive ? 'text-[var(--color-blue)]' : 'text-[var(--color-text-tertiary)]',
            )}
            strokeWidth={isActive ? 2.2 : 1.8}
          />
          {label}
          {badge === 'timer' && (
            <span className="ml-auto relative flex w-2 h-2 shrink-0">
              <span className="absolute inset-0 rounded-full bg-[var(--color-red)] animate-ping opacity-70" />
              <span className="relative w-2 h-2 rounded-full bg-[var(--color-red)]" />
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
