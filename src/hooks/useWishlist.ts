import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getRepository } from '@/services/memory';
import type { WishlistEntry } from '@/types';

const wishlistRepo = getRepository<WishlistEntry>('wishlist');

/** Query all wishlist items for the current user. */
export function useWishlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wishlist', user?.uid],
    queryFn: () => wishlistRepo.fetchAll(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Add a wishlist item. */
export function useAddWishlistItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
      wishlistRepo.add(user!.uid, data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist', user?.uid] });
      const previous = queryClient.getQueryData(['wishlist', user?.uid]);
      queryClient.setQueryData(['wishlist', user?.uid], (old: WishlistEntry[] | undefined) => {
        const optimistic = { id: 'optimistic-' + Date.now(), createdAt: Date.now(), updatedAt: Date.now(), ...newData } as WishlistEntry;
        return old ? [optimistic, ...old] : [optimistic];
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['wishlist', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', user?.uid] });
    },
  });
}

/** Partial update to an existing wishlist item. */
export function useUpdateWishlistItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => wishlistRepo.update(user!.uid, id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist', user?.uid] });
      const previous = queryClient.getQueryData(['wishlist', user?.uid]);
      queryClient.setQueryData(['wishlist', user?.uid], (old: WishlistEntry[] | undefined) => {
        return old?.map((item) => item.id === id ? { ...item, ...data } : item);
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['wishlist', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', user?.uid] });
    },
  });
}

/** Delete a wishlist item by id. */
export function useDeleteWishlistItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => wishlistRepo.delete(user!.uid, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist', user?.uid] });
      const previous = queryClient.getQueryData(['wishlist', user?.uid]);
      queryClient.setQueryData(['wishlist', user?.uid], (old: WishlistEntry[] | undefined) => {
        return old?.filter((item) => item.id !== id);
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['wishlist', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', user?.uid] });
    },
  });
}
