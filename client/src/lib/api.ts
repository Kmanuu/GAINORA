// ============================================================================
// api.ts — Cliente HTTP base para la API de HorasPRO
// ============================================================================

const BASE_URL = "http://localhost:3001/api";

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
// Fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Wrapper de fetch preconfigurado.
 * Añade Authorization header si hay token en localStorage.
 * Parsea la respuesta como JSON.
 * Lanza ApiError en caso de error HTTP.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("accessToken");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

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
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),

  patch: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  put: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),

  delete: (path: string) =>
    apiFetch(path, { method: "DELETE" }),
};
