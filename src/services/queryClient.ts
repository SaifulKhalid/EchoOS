import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client. Defaults tuned for Firestore read economy:
 * generous staleTime means components reuse cached data instead of
 * re-reading Firestore, and we don't refetch on window focus.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — memories change rarely within a session
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
