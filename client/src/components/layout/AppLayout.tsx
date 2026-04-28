// ============================================================================
// AppLayout.tsx — Layout principal responsive
// Desktop (lg+): sidebar lateral fijo
// Móvil/tablet:  barra de navegación inferior iOS
// ============================================================================

import { type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar             from './Sidebar';
import BottomNav           from './BottomNav';
import FloatingHelpButton  from './FloatingHelpButton';
import OnboardingWizard    from '@/components/OnboardingWizard';
import CommandPalette      from '@/components/ui/CommandPalette';

interface AppLayoutProps {
  children?: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-full bg-[var(--color-bg)] transition-colors duration-300">

      {/* Sidebar — solo visible en desktop (lg+) */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <main
        className={[
          'flex-1 overflow-y-auto overflow-x-hidden',
          'lg:ml-[240px]',
          'pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0',
        ].join(' ')}
      >
        {children ?? <Outlet />}
      </main>

      {/* BottomNav — solo visible en móvil/tablet */}
      <BottomNav />

      {/* Wizard de onboarding — se renderiza encima de todo dentro del contexto del router */}
      <OnboardingWizard />

      {/* Command Palette global — ⌘K / Ctrl+K */}
      <CommandPalette />

      {/* Botón flotante de ayuda contextual */}
      <FloatingHelpButton />
    </div>
  );
}
