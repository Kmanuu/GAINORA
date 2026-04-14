// ============================================================================
// router/index.tsx — Definición de rutas con React Router
// ============================================================================

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth }        from '@/context/AuthContext';
import AppLayout          from '@/components/layout/AppLayout';
import LoginPage          from '@/pages/auth/LoginPage';
import RegisterPage       from '@/pages/auth/RegisterPage';
import DashboardPage      from '@/pages/DashboardPage';
import ProjectsPage       from '@/pages/ProjectsPage';
import HorasPage          from '@/pages/HorasPage';
import FixedCostsPage     from '@/pages/FixedCostsPage';
import VarCostsPage       from '@/pages/VarCostsPage';
import SettingsPage       from '@/pages/SettingsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Guards de ruta
// ---------------------------------------------------------------------------

/** Redirige a /login si no está autenticado */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
  // Raíz → dashboard
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
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
      { path: '/dashboard',         element: <DashboardPage />  },
      { path: '/proyectos',         element: <ProjectsPage />       },
      { path: '/proyectos/:id',     element: <ProjectDetailPage />  },
      { path: '/horas',             element: <HorasPage />      },
      { path: '/costes-fijos',      element: <FixedCostsPage /> },
      { path: '/costes-variables',  element: <VarCostsPage />   },
      { path: '/ajustes',           element: <SettingsPage /> },
    ],
  },

  // 404
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
