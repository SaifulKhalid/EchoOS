import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import * as wishlistService from '@/services/firestore/wishlist';
import type { WishlistEntry } from '@/types';

/** Query all wishlist items for the current user. */
export function useWishlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wishlist', user?.uid],
    queryFn: () => wishlistService.fetchWishlist(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Add a wishlist item. */
export function useAddWishlistItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
      wishlistService.addWishlistItem(user!.uid, data),
    onSuccess: () => {
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
    }) => wishlistService.updateWishlistItem(user!.uid, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', user?.uid] });
    },
  });
}

/** Delete a wishlist item by id. */
export function useDeleteWishlistItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => wishlistService.deleteWishlistItem(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', user?.uid] });
    },
  });
}
