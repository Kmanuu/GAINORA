// ============================================================================
// AppLayout.tsx — Layout principal responsive
// Desktop (lg+): sidebar lateral fijo
// Móvil/tablet:  barra de navegación inferior iOS
// ============================================================================

import { type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar    from './Sidebar';
import BottomNav  from './BottomNav';

interface AppLayoutProps {
  children?: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-full bg-[#F5F5F7]">

      {/* Sidebar — solo visible en desktop (lg+) */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <main
        className={[
          'flex-1 overflow-y-auto overflow-x-hidden',
          // Desktop: margen izquierdo por el sidebar
          'lg:ml-[240px]',
          // Móvil: padding inferior para la barra de navegación (56px + safe area)
          'pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0',
        ].join(' ')}
      >
        {children ?? <Outlet />}
      </main>

      {/* BottomNav — solo visible en móvil/tablet */}
      <BottomNav />
    </div>
  );
}
