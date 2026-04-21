// ============================================================================
// EmptyState.tsx — Estado vacío reutilizable estilo Apple
// ============================================================================

import { type ReactNode } from 'react';
import Card   from './Card';
import Button from './Button';

interface EmptyStateProps {
  icon:         ReactNode;
  iconBg?:      string;
  title:        string;
  description:  string;
  actionLabel?: string;
  actionIcon?:  ReactNode;
  onAction?:    () => void;
}

export default function EmptyState({
  icon,
  iconBg = 'var(--color-blue-subtle)',
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
}: EmptyStateProps) {
  return (
    <Card padding="lg" className="flex flex-col items-center py-14 text-center animate-fade-up">
      <div
        className="relative w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-float"
        style={{ background: iconBg }}
      >
        <span
          className="absolute inset-0 rounded-full opacity-40"
          style={{ background: iconBg, filter: 'blur(20px)' }}
        />
        <span className="relative">{icon}</span>
      </div>
      <p className="text-[17px] font-semibold text-[var(--color-text)] tracking-tight">{title}</p>
      <p className="text-[14px] text-[var(--color-text-secondary)] mt-1 max-w-[320px] leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          variant="primary"
          icon={actionIcon}
          onClick={onAction}
          className="mt-6"
        >
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
