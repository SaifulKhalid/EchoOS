import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { queryClient } from '@/services/queryClient';
import { router } from '@/router';

/**
 * App root: wires the provider stack.
 * QueryClient (data cache) → ErrorBoundary → Auth (session) → Router.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
