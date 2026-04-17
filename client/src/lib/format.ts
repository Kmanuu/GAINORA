// ============================================================================
// format.ts — Funciones de formato reutilizables
// ============================================================================

/** Formatea un número con separadores de miles y decimales en español */
export function fmt(n: number, decimals = 2) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formatea minutos como "Xh Ym" */
export function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Formatea segundos como "HH:MM:SS" (para timer) */
export function fmtTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Formatea una fecha ISO como "DD mes YYYY" en español */
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Formatea una fecha ISO corta como "DD/MM" */
export function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
  });
}

/** Convierte un valor string/number/null a number de forma segura */
export function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : parseFloat(v) || 0;
}

/** Formatea moneda en euros */
export function fmtCurrency(n: number, decimals = 2) {
  return `${fmt(n, decimals)} €`;
}

/** Devuelve saludo según la hora */
export function greeting() {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
