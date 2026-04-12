// ============================================================================
// App.tsx — Entrada principal de la aplicación HorasPRO
// ============================================================================

import { RouterProvider }   from 'react-router-dom';
import { AuthProvider }     from '@/context/AuthContext';
import { ToastProvider }    from '@/components/ui/Toast';
import { ConfirmProvider }  from '@/components/ui/ConfirmDialog';
import { router }           from '@/router';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
