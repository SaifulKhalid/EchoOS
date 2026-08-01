import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ROUTES } from '@/config/constants';

/**
 * Gates authenticated routes. While auth is resolving we show the loading
 * screen; unauthenticated users are redirected to /login, preserving the
 * attempted path so we can return them there after sign-in.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen label="Restoring session" />;

  if (!user) {
    const fromLocation = location.pathname === ROUTES.login ? undefined : location;
    return <Navigate to={ROUTES.login} replace state={{ from: fromLocation }} />;
  }

  return <>{children}</>;
}
