// ============================================================================
// App.tsx — Entrada principal de la aplicación HorasPRO
// ============================================================================

import { RouterProvider }      from 'react-router-dom';
import { AuthProvider }        from '@/context/AuthContext';
import { ThemeProvider }       from '@/context/ThemeContext';
import { OnboardingProvider }  from '@/context/OnboardingContext';
import { ToastProvider }       from '@/components/ui/Toast';
import { ConfirmProvider }     from '@/components/ui/ConfirmDialog';
import { router }              from '@/router';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OnboardingProvider>
          <ToastProvider>
            <ConfirmProvider>
              <RouterProvider router={router} />
            </ConfirmProvider>
          </ToastProvider>
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
