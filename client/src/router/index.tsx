// ============================================================================
// router/index.tsx — Definición de rutas con React Router
// ============================================================================

/* eslint-disable react-refresh/only-export-components */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth }        from '@/context/AuthContext';
import AppLayout          from '@/components/layout/AppLayout';
import LoginPage          from '@/pages/auth/LoginPage';
import RegisterPage       from '@/pages/auth/RegisterPage';
import DashboardPage      from '@/pages/DashboardPage';
import NotFoundPage       from '@/pages/NotFoundPage';
import type { ReactNode } from 'react';

// Lazy-load: páginas pesadas o secundarias se cargan bajo demanda. La
// landing además incluye CSS propio que no debe cargar para usuarios
// autenticados.
const LandingPage        = lazy(() => import('@/pages/LandingPage'));
const ProjectsPage       = lazy(() => import('@/pages/ProjectsPage'));
const HorasPage          = lazy(() => import('@/pages/HorasPage'));
const FixedCostsPage     = lazy(() => import('@/pages/FixedCostsPage'));
const VarCostsPage       = lazy(() => import('@/pages/VarCostsPage'));
const SettingsPage       = lazy(() => import('@/pages/SettingsPage'));
const ProjectDetailPage  = lazy(() => import('@/pages/ProjectDetailPage'));
const ClientsPage        = lazy(() => import('@/pages/ClientsPage'));
const PlansPage          = lazy(() => import('@/pages/PlansPage'));
const ContractDetailPage = lazy(() => import('@/pages/ContractDetailPage'));
const CobrosPage         = lazy(() => import('@/pages/CobrosPage'));
const InvoicesPage       = lazy(() => import('@/pages/InvoicesPage'));
const ReportsPage        = lazy(() => import('@/pages/ReportsPage'));
const HelpPage           = lazy(() => import('@/pages/HelpPage'));

/** Skeleton fallback mientras se descarga el chunk de la página. */
function PageFallback() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1100px] mx-auto space-y-4">
      <div className="skeleton h-8 w-48 mb-2" />
      <div className="skeleton h-32 rounded-[16px]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="skeleton h-48 rounded-[16px]" />
        <div className="skeleton h-48 rounded-[16px]" />
      </div>
    </div>
  );
}

function L({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

// ---------------------------------------------------------------------------
// Guards de ruta
// ---------------------------------------------------------------------------

/** Redirige a /login si no está autenticado */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Redirige al dashboard si ya está autenticado */
function RequireGuest({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const router = createBrowserRouter([
  // Raíz → Landing Page
  {
    path: '/',
    element: (
      <RequireGuest>
        <L><LandingPage /></L>
      </RequireGuest>
    ),
  },

  // Rutas públicas (auth)
  {
    path: '/login',
    element: (
      <RequireGuest>
        <LoginPage />
      </RequireGuest>
    ),
  },
  {
    path: '/register',
    element: (
      <RequireGuest>
        <RegisterPage />
      </RequireGuest>
    ),
  },

  // Rutas protegidas (dentro del layout con sidebar)
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/dashboard',         element: <DashboardPage /> },
      { path: '/proyectos',         element: <L><ProjectsPage /></L>       },
      { path: '/proyectos/:id',     element: <L><ProjectDetailPage /></L>  },
      { path: '/clientes',          element: <L><ClientsPage /></L>        },
      { path: '/planes',            element: <L><PlansPage /></L>          },
      { path: '/contratos/:id',     element: <L><ContractDetailPage /></L> },
      { path: '/cobros',            element: <L><CobrosPage /></L>         },
      { path: '/facturas',          element: <L><InvoicesPage /></L>       },
      { path: '/horas',             element: <L><HorasPage /></L>          },
      { path: '/costes-fijos',      element: <L><FixedCostsPage /></L>     },
      { path: '/costes-variables',  element: <L><VarCostsPage /></L>       },
      { path: '/informes',          element: <L><ReportsPage /></L>        },
      { path: '/ayuda',             element: <L><HelpPage /></L>           },
      { path: '/ajustes',           element: <L><SettingsPage /></L>       },
    ],
  },

  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
