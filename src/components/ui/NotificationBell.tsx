import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead, useDeleteNotification } from '@/hooks/useNotifications';
import { IconBell, IconCheckCircle, IconX } from '@/components/ui/icons';
import { formatDistanceToNow } from '@/utils/dates';
import type { NotificationType } from '@/types';

const TYPE_META: Record<NotificationType, { bg: string; label: string }> = {
  reminder: { bg: 'bg-accent/20', label: 'Reminder' },
  milestone: { bg: 'bg-mood-joy/20', label: 'Milestone' },
  system: { bg: 'bg-white/10', label: 'System' },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const { data: notifications } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/10 hover:text-white/90"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <IconBell width={19} height={19} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-mood-love px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="glass-strong absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-white/10 shadow-glass-lg animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-medium text-white/80">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-accent-soft transition-colors hover:text-white"
                >
                  <IconCheckCircle width={13} height={13} />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <IconBell width={24} height={24} className="text-white/20" />
                  <p className="text-sm text-white/55">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = TYPE_META[n.type];
                  const time = formatDistanceToNow(n.createdAt);
                  return (
                    <div
                      key={n.id}
                      className={`group flex items-start gap-3 border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/5 ${
                        !n.read ? 'bg-accent/[0.02]' : ''
                      }`}
                    >
                      {/* Type dot */}
                      <div
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.bg}`}
                      >
                        <span className="text-[8px] font-medium text-white/60">
                          {n.type === 'reminder' ? '⏰' : n.type === 'milestone' ? '🎉' : 'ℹ️'}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-white/80">
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="shrink-0 rounded-full bg-accent px-1.5 py-[1px] text-[9px] font-medium text-white">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-white/60">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-white/55">{time}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            onClick={() => markRead.mutate(n.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-white/55 hover:bg-white/10 hover:text-white/80"
                            aria-label="Mark as read"
                          >
                            <IconCheckCircle width={13} height={13} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotif.mutate(n.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-white/55 hover:bg-mood-love/20 hover:text-mood-love"
                          aria-label="Dismiss"
                        >
                          <IconX width={13} height={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
