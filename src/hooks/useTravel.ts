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
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['travel', user?.uid] });
      const previous = queryClient.getQueryData(['travel', user?.uid]);
      queryClient.setQueryData(['travel', user?.uid], (old: TravelEntry[] | undefined) => {
        const optimistic = { id: 'optimistic-' + Date.now(), createdAt: Date.now(), updatedAt: Date.now(), ...newData } as TravelEntry;
        return old ? [optimistic, ...old] : [optimistic];
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['travel', user?.uid], context.previous);
      }
    },
    onSettled: () => {
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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['travel', user?.uid] });
      const previous = queryClient.getQueryData(['travel', user?.uid]);
      queryClient.setQueryData(['travel', user?.uid], (old: TravelEntry[] | undefined) => {
        return old?.map((item) => item.id === id ? { ...item, ...data } : item);
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['travel', user?.uid], context.previous);
      }
    },
    onSettled: () => {
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['travel', user?.uid] });
      const previous = queryClient.getQueryData(['travel', user?.uid]);
      queryClient.setQueryData(['travel', user?.uid], (old: TravelEntry[] | undefined) => {
        return old?.filter((item) => item.id !== id);
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['travel', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['travel', user?.uid] });
    },
  });
}
