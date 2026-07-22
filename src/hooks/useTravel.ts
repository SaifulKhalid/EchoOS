import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import * as travelService from '@/services/firestore/travel';
import type { TravelEntry } from '@/types';

/** Query all travel entries for the current user. */
export function useTravel() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['travel', user?.uid],
    queryFn: () => travelService.fetchTravel(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Add a travel entry. */
export function useAddTravel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TravelEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
      travelService.addTravel(user!.uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel', user?.uid] });
    },
  });
}

/** Partial update to an existing travel entry. */
export function useUpdateTravel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<TravelEntry, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => travelService.updateTravel(user!.uid, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel', user?.uid] });
    },
  });
}

/** Delete a travel entry by id. */
export function useDeleteTravel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => travelService.deleteTravel(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel', user?.uid] });
    },
  });
}
