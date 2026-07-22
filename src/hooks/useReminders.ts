import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useCreateNotification, useNotifications } from './useNotifications';
import { usePreferences } from './usePreferences';
import * as reminderService from '@/services/firestore/reminders';
import type { ReminderEntry, ReminderInterval, MemoryCategory } from '@/types';

/** Query all reminders for the current user. */
export function useReminders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['reminders', user?.uid],
    queryFn: () => reminderService.fetchReminders(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Add a new reminder. */
export function useAddReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      message: string;
      dueDate: number;
      interval: ReminderInterval;
      category?: MemoryCategory;
    }) =>
      reminderService.addReminder(user!.uid, {
        ...data,
        dueDate: data.dueDate,
        enabled: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', user?.uid] });
    },
  });
}

/** Update a reminder. */
export function useUpdateReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<ReminderEntry, 'id' | 'createdAt'>>;
    }) => reminderService.updateReminder(user!.uid, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', user?.uid] });
    },
  });
}

/** Delete a reminder. */
export function useDeleteReminder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reminderService.deleteReminder(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', user?.uid] });
    },
  });
}

/**
 * Polls every 30 seconds for due reminders and creates notifications.
 * Respects the user's `remindersEnabled` preference — when disabled the
 * polling interval is skipped entirely.
 * This hook should be mounted once in the app layout.
 */
export function useReminderChecker() {
  const { user } = useAuth();
  const { remindersEnabled } = usePreferences();
  const { data: reminders } = useReminders();
  const createNotification = useCreateNotification();
  const { data: notifications } = useNotifications();
  const checked = useRef<Set<string>>(new Set());

  const check = useCallback(() => {
    if (!reminders || !user || !remindersEnabled) return;

    const now = Date.now();
    for (const r of reminders) {
      if (!r.enabled) continue;
      const due = typeof r.dueDate === 'number' ? r.dueDate : r.dueDate.toMillis();
      if (due > now) continue;
      if (checked.current.has(r.id)) continue;

      // Avoid creating duplicate notifications
      const alreadyNotified = notifications?.some((n) => n.reminderId === r.id);
      if (alreadyNotified && r.interval === 'once') {
        checked.current.add(r.id);
        continue;
      }
      if (alreadyNotified) {
        // For recurring reminders, check if the last notification was > interval
        const lastNotif = notifications?.find((n) => n.reminderId === r.id);
        if (lastNotif) {
          const lastTime =
            typeof lastNotif.createdAt === 'number'
              ? lastNotif.createdAt
              : lastNotif.createdAt.toMillis();
          const intervalMs = getIntervalMs(r.interval);
          if (now - lastTime < intervalMs) continue;
        }
      }

      checked.current.add(r.id);
      createNotification.mutate({
        type: 'reminder',
        title: r.title,
        message: r.message,
        reminderId: r.id,
      });
    }
  }, [reminders, user, notifications, createNotification, remindersEnabled]);

  // Poll every 30 seconds
  useEffect(() => {
    if (!user || !remindersEnabled) return;
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [user, check, remindersEnabled]);
}

function getIntervalMs(interval: ReminderInterval): number {
  switch (interval) {
    case 'daily':
      return 86_400_000;
    case 'weekly':
      return 604_800_000;
    case 'monthly':
      return 2_592_000_000;
    default:
      return Infinity;
  }
}
