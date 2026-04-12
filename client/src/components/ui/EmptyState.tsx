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
  iconBg = 'rgba(10,132,255,0.08)',
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
}: EmptyStateProps) {
  return (
    <Card padding="lg" className="flex flex-col items-center py-12 text-center animate-fade-up">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <p className="text-[16px] font-semibold text-[#1D1D1F]">{title}</p>
      <p className="text-[14px] text-[#6E6E73] mt-1 max-w-[280px]">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          variant="primary"
          icon={actionIcon}
          onClick={onAction}
          className="mt-5"
        >
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
