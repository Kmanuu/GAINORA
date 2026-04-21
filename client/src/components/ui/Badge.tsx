// ============================================================================
// Badge.tsx — Etiqueta de estado / pill indicator (soporta dark mode)
// ============================================================================

import type { ReactNode } from 'react';
import clsx from 'clsx';

type BadgeVariant = 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'purple';
type BadgeSize    = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?:    BadgeSize;
  dot?:     boolean;
  pulse?:   boolean;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  blue:   'bg-[var(--color-blue-subtle)]   text-[var(--color-blue)]',
  green:  'bg-[var(--color-green-subtle)]  text-[#25A244] dark:text-[#5CE67D]',
  orange: 'bg-[var(--color-orange-subtle)] text-[#C87800] dark:text-[#FFB545]',
  red:    'bg-[var(--color-red-subtle)]    text-[#D93025] dark:text-[#FF6961]',
  gray:   'bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.08)] text-[var(--color-text-secondary)]',
  purple: 'bg-[var(--color-purple-subtle)] text-[#9A33C7] dark:text-[#D07DF5]',
};

const dotColors: Record<BadgeVariant, string> = {
  blue:   'bg-[#0A84FF]',
  green:  'bg-[#30D158]',
  orange: 'bg-[#FF9F0A]',
  red:    'bg-[#FF453A]',
  gray:   'bg-[#86868B]',
  purple: 'bg-[#BF5AF2]',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-[12px] gap-1.5',
};

export default function Badge({
  variant   = 'gray',
  size      = 'sm',
  dot       = false,
  pulse     = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {dot && (
        <span className="relative flex w-1.5 h-1.5 shrink-0">
          {pulse && (
            <span
              className={clsx(
                'absolute inset-0 rounded-full animate-ping opacity-75',
                dotColors[variant],
              )}
            />
          )}
          <span
            className={clsx(
              'relative w-1.5 h-1.5 rounded-full',
              dotColors[variant],
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
}
