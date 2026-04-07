// ============================================================================
// Badge.tsx — Etiqueta de estado / pill indicator
// ============================================================================

import clsx from 'clsx';

type BadgeVariant = 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?:     boolean;
  children: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  blue:   'bg-[rgba(10,132,255,0.10)]   text-[#0A84FF]',
  green:  'bg-[rgba(48,209,88,0.10)]    text-[#25A244]',
  orange: 'bg-[rgba(255,159,10,0.12)]   text-[#C87800]',
  red:    'bg-[rgba(255,69,58,0.10)]    text-[#D93025]',
  gray:   'bg-[rgba(0,0,0,0.06)]        text-[#6E6E73]',
  purple: 'bg-[rgba(191,90,242,0.10)]   text-[#9A33C7]',
};

const dotStyles: Record<BadgeVariant, string> = {
  blue:   'bg-[#0A84FF]',
  green:  'bg-[#30D158]',
  orange: 'bg-[#FF9F0A]',
  red:    'bg-[#FF453A]',
  gray:   'bg-[#86868B]',
  purple: 'bg-[#BF5AF2]',
};

export default function Badge({
  variant   = 'gray',
  dot       = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5',
        'px-2 py-0.5 rounded-full',
        'text-[11px] font-medium whitespace-nowrap',
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotStyles[variant],
          )}
        />
      )}
      {children}
    </span>
  );
}
