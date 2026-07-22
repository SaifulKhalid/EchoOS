import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import * as movieService from '@/services/firestore/movies';
import type { MovieEntry } from '@/types';

/** Query all movie entries for the current user. */
export function useMovies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['movies', user?.uid],
    queryFn: () => movieService.fetchMovies(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Add a movie entry (quick-add from TMDB or full create). */
export function useAddMovie() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<MovieEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
      movieService.addMovie(user!.uid, data),
    onSuccess: () => {
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
    }) => movieService.updateMovie(user!.uid, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies', user?.uid] });
    },
  });
}

/** Delete a movie entry by id. */
export function useDeleteMovie() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => movieService.deleteMovie(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies', user?.uid] });
    },
  });
}
