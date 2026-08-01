import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getRepository } from '@/services/memory';
import type { FoodEntry } from '@/types';

const foodRepo = getRepository<FoodEntry>('food');

/** Query all food entries for the current user. */
export function useFood() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['food', user?.uid],
    queryFn: () => foodRepo.fetchAll(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Add a food entry. */
export function useAddFood() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
      foodRepo.add(user!.uid, data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['food', user?.uid] });
      const previous = queryClient.getQueryData(['food', user?.uid]);
      queryClient.setQueryData(['food', user?.uid], (old: FoodEntry[] | undefined) => {
        const optimistic = { id: 'optimistic-' + Date.now(), createdAt: Date.now(), updatedAt: Date.now(), ...newData } as FoodEntry;
        return old ? [optimistic, ...old] : [optimistic];
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['food', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['food', user?.uid] });
    },
  });
}

/** Partial update to an existing food entry. */
export function useUpdateFood() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => foodRepo.update(user!.uid, id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['food', user?.uid] });
      const previous = queryClient.getQueryData(['food', user?.uid]);
      queryClient.setQueryData(['food', user?.uid], (old: FoodEntry[] | undefined) => {
        return old?.map((item) => item.id === id ? { ...item, ...data } : item);
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['food', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['food', user?.uid] });
    },
  });
}

/** Delete a food entry by id. */
export function useDeleteFood() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => foodRepo.delete(user!.uid, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['food', user?.uid] });
      const previous = queryClient.getQueryData(['food', user?.uid]);
      queryClient.setQueryData(['food', user?.uid], (old: FoodEntry[] | undefined) => {
        return old?.filter((item) => item.id !== id);
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['food', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['food', user?.uid] });
    },
  });
}
