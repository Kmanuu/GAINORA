// ============================================================================
// SegmentedControl.tsx — Control segmentado estilo iOS (radio horizontal)
// ============================================================================
// Uso:
//   <SegmentedControl
//      value={status}
//      onChange={setStatus}
//      options={[
//        { value: 'active', label: 'Activos' },
//        { value: 'done',   label: 'Cerrados' },
//      ]}
//   />
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface Props<T extends string> {
  value:     T;
  onChange:  (val: T) => void;
  options:   Option<T>[];
  fullWidth?: boolean;
  size?:     'sm' | 'md';
  className?: string;
}

export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  fullWidth = false,
  size      = 'md',
  className,
}: Props<T>) {
  const activeIdx = options.findIndex((o) => o.value === value);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const btn = container.querySelector<HTMLButtonElement>(`[data-idx="${activeIdx}"]`);
    if (btn) {
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [activeIdx, options.length]);

  const heightClass = size === 'sm' ? 'h-8' : 'h-10';
  const textClass   = size === 'sm' ? 'text-[12.5px]' : 'text-[13.5px]';

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative inline-flex items-center rounded-[10px] p-0.5',
        'bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.08)]',
        heightClass,
        fullWidth && 'w-full',
        className,
      )}
    >
      {/* Indicador deslizante */}
      {indicator.width > 0 && (
        <div
          className="absolute top-0.5 bottom-0.5 rounded-[8px] bg-[var(--color-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-all duration-[220ms] ease-[cubic-bezier(0.19,1,0.22,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}

      {options.map((opt, idx) => (
        <button
          key={opt.value}
          data-idx={idx}
          type="button"
          onClick={() => onChange(opt.value)}
          className={clsx(
            'relative flex items-center justify-center gap-1.5 px-3 h-full',
            'font-medium select-none whitespace-nowrap rounded-[8px]',
            'transition-colors duration-150',
            fullWidth && 'flex-1',
            textClass,
            value === opt.value
              ? 'text-[var(--color-text)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]',
          )}
        >
          {opt.icon}
          <span>{opt.label}</span>
          {opt.count !== undefined && (
            <span
              className={clsx(
                'ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-semibold',
                value === opt.value
                  ? 'bg-[var(--color-blue-subtle)] text-[var(--color-blue)]'
                  : 'bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.08)] text-[var(--color-text-tertiary)]',
              )}
            >
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
