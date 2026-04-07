// ============================================================================
// Button.tsx — Botón estilo Apple (primario, secundario, ghost, destructivo)
// ============================================================================

import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

type Variant  = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size     = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  icon?:     ReactNode;
  children?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-[#0A84FF] text-white hover:bg-[#0070E0] active:bg-[#0060C0] ' +
    'shadow-[0_1px_4px_rgba(10,132,255,0.30)] hover:shadow-[0_2px_8px_rgba(10,132,255,0.40)]',
  secondary:
    'bg-white text-[#1D1D1F] border border-[rgba(0,0,0,0.10)] ' +
    'hover:bg-[#F5F5F7] active:bg-[#EBEBED] shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
  ghost:
    'bg-transparent text-[#0A84FF] hover:bg-[rgba(10,132,255,0.08)] active:bg-[rgba(10,132,255,0.14)]',
  danger:
    'bg-[#FF453A] text-white hover:bg-[#E63B30] active:bg-[#CC3329] ' +
    'shadow-[0_1px_4px_rgba(255,69,58,0.30)]',
};

const sizeStyles: Record<Size, string> = {
  sm:  'h-8  px-3   text-[13px] font-medium rounded-[8px]  gap-1.5',
  md:  'h-10 px-4   text-[14px] font-medium rounded-[10px] gap-2',
  lg:  'h-12 px-6   text-[15px] font-semibold rounded-[12px] gap-2',
};

export default function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  icon,
  children,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center select-none',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF] focus-visible:ring-offset-1',
        'active:scale-[0.97]',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
        </>
      )}
    </button>
  );
}

function Spinner({ size }: { size: Size }) {
  const dim = size === 'sm' ? 12 : size === 'lg' ? 18 : 15;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
