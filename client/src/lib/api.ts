// ============================================================================
// api.ts — Cliente HTTP base para la API de HorasPRO
// ============================================================================
// Incluye auto-refresh de token: si una petición devuelve 401,
// intenta renovar el accessToken con el refreshToken y reintenta una vez.
// Si el refresh falla, limpia la sesión y redirige a /login.
// ============================================================================

const BASE_URL = "/api";

// ---------------------------------------------------------------------------
// Error tipado
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  code?:  string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.code   = code;
  }
}

// ---------------------------------------------------------------------------
// Helpers de sesión
// ---------------------------------------------------------------------------

function getAccessToken()  { return localStorage.getItem('accessToken'); }
function getRefreshToken() { return localStorage.getItem('refreshToken'); }

// Decodifica el payload de un JWT sin verificar firma (solo lectura local).
// Devuelve null si el token no es parseable.
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// True si el token expira en los próximos `skewSeconds` segundos.
function isTokenExpiring(token: string, skewSeconds = 15): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 < Date.now() + skewSeconds * 1000;
}

function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken',  accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearSession() {
  ['accessToken', 'refreshToken', 'hp_user', 'hp_tenant'].forEach((k) =>
    localStorage.removeItem(k),
  );
}

// ---------------------------------------------------------------------------
// Refresh (sin pasar por apiFetch para evitar bucle infinito)
// ---------------------------------------------------------------------------

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  // Deduplica llamadas simultáneas al refresh
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: refreshToken }),
    });

    if (!res.ok) {
      clearSession();
      window.location.replace('/login');
      throw new Error('Refresh failed');
    }

    const data = await res.json() as { accessToken: string; refreshToken: string };
    saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// ---------------------------------------------------------------------------
// Fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Wrapper de fetch preconfigurado.
 * - Añade Authorization header con el accessToken.
 * - Si recibe 401, intenta refrescar el token y reintenta la petición UNA vez.
 * - Si el refresh falla, redirige a /login.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  _retry = true,   // flag interno para evitar bucle infinito
): Promise<T> {
  let token = getAccessToken();

  // Refresh proactivo: si el access token ya está expirado o a punto de
  // expirar, refrescar antes de mandar la petición. Evita el 401 visible
  // en consola que aparecía cada vez que se reabría la app con token
  // caducado en localStorage.
  if (token && isTokenExpiring(token) && getRefreshToken() && _retry) {
    try {
      token = await doRefresh();
    } catch {
      // doRefresh ya redirigió a /login si el refresh token también caducó.
      throw new ApiError('Sesión expirada', 401);
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Auto-refresh en 401
  if (res.status === 401 && _retry) {
    try {
      const newToken = await doRefresh();
      // Reintenta la petición original con el nuevo token
      return apiFetch<T>(path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        },
      }, false);
    } catch {
      // doRefresh ya limpió la sesión y redirigió
      throw new ApiError('Sesión expirada', 401);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(
      body.error || body.message || `HTTP ${res.status}`,
      res.status,
      body.code,
    );
  }

  // 204 No Content
  if (res.status === 204) return null as T;

  return res.json();
}

// ---------------------------------------------------------------------------
// Shortcuts
// ---------------------------------------------------------------------------

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),

  post: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  patch: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  put: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (path: string) =>
    apiFetch(path, { method: 'DELETE' }),

  /** Descarga un blob (p.ej. PDF) con auth. Devuelve Blob. */
  async blob(path: string): Promise<Blob> {
    const token = getAccessToken();
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(body.error || `HTTP ${res.status}`, res.status, body.code);
    }
    return res.blob();
  },
};
