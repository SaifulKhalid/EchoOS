import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getRepository } from '@/services/memory';
import type { MovieEntry } from '@/types';

const movieRepo = getRepository<MovieEntry>('movie');

/** Query all movie entries for the current user. */
export function useMovies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['movies', user?.uid],
    queryFn: () => movieRepo.fetchAll(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Add a movie entry (quick-add from TMDB or full create). */
export function useAddMovie() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<MovieEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
      movieRepo.add(user!.uid, data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['movies', user?.uid] });
      const previous = queryClient.getQueryData(['movies', user?.uid]);
      queryClient.setQueryData(['movies', user?.uid], (old: MovieEntry[] | undefined) => {
        const optimistic = { id: 'optimistic-' + Date.now(), createdAt: Date.now(), updatedAt: Date.now(), ...newData } as MovieEntry;
        return old ? [optimistic, ...old] : [optimistic];
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['movies', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['movies', user?.uid] });
    },
  });
}

/** Partial update to an existing movie entry. */
export function useUpdateMovie() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<MovieEntry, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => movieRepo.update(user!.uid, id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['movies', user?.uid] });
      const previous = queryClient.getQueryData(['movies', user?.uid]);
      queryClient.setQueryData(['movies', user?.uid], (old: MovieEntry[] | undefined) => {
        return old?.map((item) => item.id === id ? { ...item, ...data } : item);
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['movies', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['movies', user?.uid] });
    },
  });
}

/** Delete a movie entry by id. */
export function useDeleteMovie() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => movieRepo.delete(user!.uid, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['movies', user?.uid] });
      const previous = queryClient.getQueryData(['movies', user?.uid]);
      queryClient.setQueryData(['movies', user?.uid], (old: MovieEntry[] | undefined) => {
        return old?.filter((item) => item.id !== id);
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['movies', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['movies', user?.uid] });
    },
  });
}
