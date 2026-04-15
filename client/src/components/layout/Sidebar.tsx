// ============================================================================
// Sidebar.tsx — Navegación lateral estilo macOS Sonoma
// ============================================================================

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  Receipt,
  TrendingDown,
  BarChart3,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';

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
  { label: 'Horas',       path: '/horas',          icon: Clock           },
];

const costsNav: NavItem[] = [
  { label: 'Costes fijos',    path: '/costes-fijos',    icon: Receipt      },
  { label: 'Costes variables', path: '/costes-variables', icon: TrendingDown },
];

const analysisNav: NavItem[] = [
  { label: 'Informes', path: '/informes', icon: BarChart3 },
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40',
        'flex flex-col',
        'w-[240px] h-full',
        'bg-[rgba(255,255,255,0.82)] backdrop-blur-[24px]',
        'border-r border-[rgba(0,0,0,0.07)]',
      )}
    >
      {/* Logo + tenant */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div
            className={clsx(
              'w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0',
              'bg-[#0A84FF] shadow-[0_2px_8px_rgba(10,132,255,0.35)]',
            )}
          >
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#1D1D1F] leading-tight">
              HorasPRO
            </p>
            <p className="text-[11px] text-[#86868B] truncate leading-tight">
              {tenant?.name ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Separador */}
      <div className="mx-4 h-px bg-[rgba(0,0,0,0.06)]" />

      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <SectionLabel label="Principal" />
        {mainNav.map((item) => (
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
        <div className="mx-1 h-px bg-[rgba(0,0,0,0.06)] mb-3" />

        <NavItem label="Ajustes" path="/ajustes" icon={Settings} />

        {/* User chip */}
        <div className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-[10px]">
          <div
            className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
              'bg-[rgba(10,132,255,0.12)] text-[#0A84FF]',
              'text-[12px] font-semibold',
            )}
          >
            {user?.fullName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-[#1D1D1F] truncate leading-tight">
              {user?.fullName ?? '—'}
            </p>
            <p className="text-[10px] text-[#86868B] truncate leading-tight">
              {user?.role ?? '—'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className={clsx(
              'p-1.5 rounded-[7px] text-[#86868B]',
              'hover:bg-[rgba(255,69,58,0.08)] hover:text-[#FF453A]',
              'transition-colors duration-150',
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
    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868B]">
      {label}
    </p>
  );
}

function NavItem({ label, path, icon: Icon }: NavItem) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-3 py-2 rounded-[10px]',
          'text-[13.5px] font-medium',
          'transition-all duration-150',
          isActive
            ? 'bg-[rgba(10,132,255,0.10)] text-[#0A84FF]'
            : 'text-[#3A3A3C] hover:bg-[rgba(0,0,0,0.05)] hover:text-[#1D1D1F]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={clsx(
              'w-4 h-4 shrink-0',
              isActive ? 'text-[#0A84FF]' : 'text-[#6E6E73]',
            )}
            strokeWidth={isActive ? 2.2 : 1.8}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}
