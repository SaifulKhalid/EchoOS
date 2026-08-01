import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getRepository } from '@/services/memory';
import type { GoalEntry, GoalCheckIn } from '@/types';

const goalRepo = getRepository<GoalEntry>('goal');

/** Query all goal entries for the current user. */
export function useGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goal', user?.uid],
    queryFn: () => goalRepo.fetchAll(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Add a new goal entry. */
export function useAddGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<GoalEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
      goalRepo.add(user!.uid, data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['goal', user?.uid] });
      const previous = queryClient.getQueryData(['goal', user?.uid]);
      queryClient.setQueryData(['goal', user?.uid], (old: GoalEntry[] | undefined) => {
        const optimistic: GoalEntry = {
          ...newData,
          id: 'optimistic-' + Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return old ? [optimistic, ...old] : [optimistic];
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['goal', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', user?.uid] });
    },
  });
}

/** Log a check-in for a goal. */
export function useLogCheckIn() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      goalId,
      checkIn,
    }: {
      goalId: string;
      checkIn: Omit<GoalCheckIn, 'date'>;
    }) => {
      const goals = await goalRepo.fetchAll(user!.uid);
      const target = goals.find((g) => g.id === goalId);
      if (!target) throw new Error('Goal not found');

      const fullCheckIn: GoalCheckIn = { date: Date.now(), ...checkIn };
      const checkIns = [...(target.checkIns ?? []), fullCheckIn];
      const streak = checkIn.completed !== false ? (target.streak ?? 0) + 1 : 0;
      const completedCount = checkIns.filter((c) => c.completed).length;
      const completionRate = Math.round((completedCount / checkIns.length) * 100);

      await goalRepo.update(user!.uid, goalId, {
        checkIns,
        streak,
        completionRate,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', user?.uid] });
    },
  });
}

/** Partial update to an existing goal. */
export function useUpdateGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<GoalEntry, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => goalRepo.update(user!.uid, id, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', user?.uid] });
    },
  });
}

/** Delete a goal by id. */
export function useDeleteGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalRepo.delete(user!.uid, id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', user?.uid] });
    },
  });
}
