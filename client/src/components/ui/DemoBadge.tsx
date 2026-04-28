// ============================================================================
// DemoBadge.tsx — Marca discreta para identificar registros de demo
// ============================================================================
// Aparece junto al nombre/título de cualquier entidad marcada como demo
// (cliente, proyecto, contrato, factura serie DEMO, coste fijo). Color
// púrpura suave coherente con la sección "Datos demo" de Ajustes.
// ============================================================================

import clsx from 'clsx';

interface DemoBadgeProps {
  /** Si false o ausente, no se renderiza nada (cómodo para listas). */
  show?:    boolean;
  /** Texto alternativo (default: "demo"). */
  label?:   string;
  /** Clases extra para el wrapper. */
  className?: string;
}

export default function DemoBadge({ show = true, label = 'demo', className }: DemoBadgeProps) {
  if (!show) return null;
  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-[1px] rounded-full text-[10px] font-semibold uppercase tracking-[0.04em]',
        'bg-[var(--color-purple-subtle)] text-[var(--color-purple)]',
        'select-none align-middle',
        className,
      )}
      title="Este registro es parte de los datos demo. Lo puedes borrar desde Ajustes → Datos demo."
    >
      {label}
    </span>
  );
}
