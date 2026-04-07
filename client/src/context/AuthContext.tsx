// ============================================================================
// AuthContext.tsx — Estado global de autenticación
// ============================================================================
// Provee: user, tenant, isAuthenticated, isLoading, login, register, logout
// Persiste tokens en localStorage. Restaura sesión al recargar la página.
// ============================================================================

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { AuthUser, AuthTenant, AuthResponse } from '@/types';

// ---------------------------------------------------------------------------
// Tipos del contexto
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user:            AuthUser | null;
  tenant:          AuthTenant | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:           (params: LoginParams) => Promise<void>;
  register:        (params: RegisterParams) => Promise<void>;
  logout:          () => void;
}

interface LoginParams {
  email:      string;
  password:   string;
  tenantSlug: string;
}

interface RegisterParams {
  tenantName: string;
  tenantSlug: string;
  fullName:   string;
  email:      string;
  password:   string;
}

// ---------------------------------------------------------------------------
// Helpers de localStorage
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  accessToken:  'accessToken',
  refreshToken: 'refreshToken',
  user:         'hp_user',
  tenant:       'hp_tenant',
} as const;

function saveSession(res: AuthResponse) {
  localStorage.setItem(STORAGE_KEYS.accessToken,  res.accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, res.refreshToken);
  localStorage.setItem(STORAGE_KEYS.user,   JSON.stringify(res.user));
  localStorage.setItem(STORAGE_KEYS.tenant, JSON.stringify(res.tenant));
}

function clearSession() {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}

function loadSession(): { user: AuthUser; tenant: AuthTenant } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    const rawTenant = localStorage.getItem(STORAGE_KEYS.tenant);
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!raw || !rawTenant || !token) return null;
    return {
      user:   JSON.parse(raw) as AuthUser,
      tenant: JSON.parse(rawTenant) as AuthTenant,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser   | null>(null);
  const [tenant,    setTenant]    = useState<AuthTenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sesión al montar (refresca token si es necesario)
  useEffect(() => {
    const session = loadSession();
    if (session) {
      setUser(session.user);
      setTenant(session.tenant);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (params: LoginParams) => {
    const res = await api.post<AuthResponse>('/auth/login', params);
    saveSession(res);
    setUser(res.user);
    setTenant(res.tenant);
  }, []);

  const register = useCallback(async (params: RegisterParams) => {
    const res = await api.post<AuthResponse>('/auth/register', params);
    saveSession(res);
    setUser(res.user);
    setTenant(res.tenant);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setTenant(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
