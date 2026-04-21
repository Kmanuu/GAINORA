// ============================================================================
// KpiCard.tsx — Tarjeta KPI con icono, valor grande, trend y sparkline
// ============================================================================

import { type ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card';
import Sparkline from './Sparkline';

type Tone = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'neutral';

interface Props {
  icon:   ReactNode;
  label:  string;
  value:  string;
  hint?:  string;
  /** delta en porcentaje. Positivo = sube, negativo = baja */
  delta?: number;
  /** 'up' o 'down' para forzar la dirección semántica (ej. costes donde bajar es bueno) */
  deltaBehavior?: 'higher-is-better' | 'lower-is-better';
  tone?:  Tone;
  spark?: number[];
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

const toneMap: Record<Tone, { iconBg: string; iconColor: string; spark: string }> = {
  blue:    { iconBg: 'bg-[var(--color-blue-subtle)]',   iconColor: 'text-[var(--color-blue)]',   spark: '#0A84FF' },
  green:   { iconBg: 'bg-[var(--color-green-subtle)]',  iconColor: 'text-[#25A244] dark:text-[#5CE67D]', spark: '#30D158' },
  orange:  { iconBg: 'bg-[var(--color-orange-subtle)]', iconColor: 'text-[#C87800] dark:text-[#FFB545]', spark: '#FF9F0A' },
  red:     { iconBg: 'bg-[var(--color-red-subtle)]',    iconColor: 'text-[#D93025] dark:text-[#FF6961]', spark: '#FF453A' },
  purple:  { iconBg: 'bg-[var(--color-purple-subtle)]', iconColor: 'text-[#9A33C7] dark:text-[#D07DF5]', spark: '#BF5AF2' },
  neutral: { iconBg: 'bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.08)]', iconColor: 'text-[var(--color-text-secondary)]', spark: '#86868B' },
};

export default function KpiCard({
  icon, label, value, hint, delta, deltaBehavior = 'higher-is-better',
  tone = 'blue', spark, loading, className, onClick,
}: Props) {
  const t = toneMap[tone];

  let deltaColor = 'text-[var(--color-text-secondary)]';
  let DeltaIcon = Minus;
  if (delta !== undefined && delta !== 0) {
    const goodUp = deltaBehavior === 'higher-is-better';
    const isPositive = (delta > 0 && goodUp) || (delta < 0 && !goodUp);
    deltaColor = isPositive ? 'text-[#25A244] dark:text-[#5CE67D]' : 'text-[#D93025] dark:text-[#FF6961]';
    DeltaIcon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  }

  return (
    <Card
      padding="md"
      hover={!!onClick}
      onClick={onClick}
      className={clsx('relative overflow-hidden', className)}
    >
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-10 w-10 rounded-[12px]" />
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-7 w-28" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-3">
            <div className={clsx(
              'w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0',
              t.iconBg, t.iconColor,
            )}>
              {icon}
            </div>
            {delta !== undefined && (
              <div className={clsx(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold',
                'bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.06)]',
                deltaColor,
              )}>
                <DeltaIcon className="w-3 h-3" strokeWidth={2.4} />
                {Math.abs(delta).toFixed(1)}%
              </div>
            )}
          </div>

          <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-1">
            {label}
          </p>
          <p className="text-[24px] font-semibold text-[var(--color-text)] leading-tight tracking-tight">
            {value}
          </p>
          {hint && (
            <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
              {hint}
            </p>
          )}

          {spark && spark.length > 1 && (
            <div className="mt-3 -mx-1">
              <Sparkline
                data={spark}
                color={t.spark}
                width={200}
                height={32}
                className="w-full"
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
