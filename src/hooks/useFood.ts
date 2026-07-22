import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import * as foodService from '@/services/firestore/food';
import type { FoodEntry } from '@/types';

/** Query all food entries for the current user. */
export function useFood() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['food', user?.uid],
    queryFn: () => foodService.fetchFood(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Add a food entry. */
export function useAddFood() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
      foodService.addFood(user!.uid, data),
    onSuccess: () => {
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
    }) => foodService.updateFood(user!.uid, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food', user?.uid] });
    },
  });
}

/** Delete a food entry by id. */
export function useDeleteFood() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => foodService.deleteFood(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food', user?.uid] });
    },
  });
}
