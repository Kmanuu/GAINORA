// ============================================================================
// BottomNav.tsx — Barra de navegación inferior estilo iOS (solo móvil/tablet)
// ============================================================================

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

export default function BottomNav() {
  return (
    <nav
      className={clsx(
        'lg:hidden',                             // Oculto en desktop
        'fixed bottom-0 left-0 right-0 z-40',
        'flex items-end justify-around',
        'bg-[rgba(255,255,255,0.88)] backdrop-blur-[20px]',
        'border-t border-[rgba(0,0,0,0.08)]',
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
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center',
              'py-2 px-3 min-w-[52px]',
              'transition-all duration-150',
              isActive ? 'text-[#0A84FF]' : 'text-[#86868B]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded-[10px]',
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
