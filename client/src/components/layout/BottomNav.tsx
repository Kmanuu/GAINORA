// ============================================================================
// BottomNav.tsx — Barra de navegación inferior estilo iOS (solo móvil/tablet)
// ============================================================================

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  BarChart3,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

interface Tab {
  label: string;
  path:  string;
  icon:  React.ElementType;
}

const TABS: Tab[] = [
  { label: 'Inicio',     path: '/dashboard',    icon: LayoutDashboard },
  { label: 'Proyectos',  path: '/proyectos',    icon: FolderKanban    },
  { label: 'Horas',      path: '/horas',        icon: Clock           },
  { label: 'Informes',   path: '/informes',     icon: BarChart3       },
  { label: 'Ajustes',    path: '/ajustes',      icon: Settings        },
];

function useTimerActive() {
  const [active, setActive] = useState(() => !!localStorage.getItem('hp_timer_start'));
  useEffect(() => {
    const check = () => setActive(!!localStorage.getItem('hp_timer_start'));
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);
  return active;
}

export default function BottomNav() {
  const timerActive = useTimerActive();
  return (
    <nav
      aria-label="Navegación principal"
      className={clsx(
        'lg:hidden',                             // Oculto en desktop
        'fixed bottom-0 left-0 right-0 z-40',
        'flex items-end justify-around',
        'bg-[rgba(255,255,255,0.88)] dark:bg-[rgba(22,22,28,0.92)] backdrop-blur-[20px]',
        'border-t border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.06)]',
        'px-2',
        // Safe area para iPhone X+
        'pb-[env(safe-area-inset-bottom)]',
      )}
      style={{ minHeight: '56px' }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          aria-label={tab.label}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center',
              'py-2 px-3 min-w-[52px]',
              'transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)] focus-visible:ring-offset-1 rounded-[8px]',
              isActive ? 'text-[#0A84FF]' : 'text-[#86868B]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={clsx(
                  'relative flex items-center justify-center w-8 h-8 rounded-[10px]',
                  'transition-all duration-150',
                  isActive
                    ? 'bg-[rgba(10,132,255,0.10)] scale-[1.08]'
                    : 'scale-100',
                )}
              >
                <tab.icon
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {tab.path === '/horas' && timerActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF453A] animate-pulse border-2 border-white" />
                )}
              </span>
              <span
                className={clsx(
                  'text-[10px] mt-0.5 font-medium leading-tight',
                  isActive ? 'text-[#0A84FF]' : 'text-[#86868B]',
                )}
              >
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
