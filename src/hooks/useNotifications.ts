import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import * as notifService from '@/services/firestore/notifications';
import type { NotificationType, MemoryCategory } from '@/types';

/** Query all notifications for the current user. */
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.uid],
    queryFn: () => notifService.fetchNotifications(user!.uid),
    enabled: !!user?.uid,
    refetchInterval: 30_000, // poll every 30s for new reminder notifications
  });
}

/** Get the count of unread notifications (from cached data). */
export function useUnreadCount(): number {
  const { data } = useNotifications();
  return data?.filter((n) => !n.read).length ?? 0;
}

/** Mark a single notification as read. */
export function useMarkRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notifService.markNotificationRead(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.uid] });
    },
  });
}

/** Mark all notifications as read. */
export function useMarkAllRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notifService.markAllNotificationsRead(user!.uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.uid] });
    },
  });
}

/** Create a system notification (used by the reminder checker). */
export function useCreateNotification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: NotificationType;
      title: string;
      message: string;
      linkedEntryId?: string;
      linkedCategory?: MemoryCategory;
      reminderId?: string;
    }) =>
      notifService.addNotification(user!.uid, {
        ...data,
        read: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.uid] });
    },
  });
}

/** Delete a notification. */
export function useDeleteNotification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notifService.deleteNotification(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.uid] });
    },
  });
}
