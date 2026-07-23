import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type ToastVariant } from '@/services/toastStore';
import { IconCheckCircle, IconX, IconSparkle, IconBell } from '@/components/ui/icons';

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: JSX.Element }> = {
  success: {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    icon: <IconCheckCircle width={16} height={16} className="text-emerald-400" />,
  },
  error: {
    bg: 'bg-mood-love/15',
    border: 'border-mood-love/30',
    icon: <IconX width={16} height={16} className="text-mood-love" />,
  },
  info: {
    bg: 'bg-accent/15',
    border: 'border-accent/30',
    icon: <IconSparkle width={16} height={16} className="text-accent-soft" />,
  },
  warning: {
    bg: 'bg-mood-joy/15',
    border: 'border-mood-joy/30',
    icon: <IconBell width={16} height={16} className="text-mood-joy" />,
  },
};

/**
 * Renders active toasts in a fixed bottom-left stack.
 * Each toast auto-dismisses after its duration, or can be dismissed manually.
 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[60] flex flex-col-reverse gap-2 pointer-events-none md:bottom-6 md:left-6 md:right-auto md:w-96">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-glass-lg backdrop-blur-xl ${style.bg} ${style.border}`}
            >
              <span className="mt-0.5 shrink-0">{style.icon}</span>
              <p className="flex-1 text-sm text-white/85">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    removeToast(toast.id);
                  }}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-accent-soft transition-colors hover:bg-white/10"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded-lg p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
                aria-label="Dismiss"
              >
                <IconX width={14} height={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
