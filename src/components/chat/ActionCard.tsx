import { motion } from 'framer-motion';
import type { ActionDescriptor } from '@/types';

/** Emoji map for each action category. */
const CATEGORY_ICON: Record<ActionDescriptor['category'], string> = {
  movie: '🎬',
  food: '🍽️',
  travel: '✈️',
  note: '💭',
  wishlist: '⭐',
  goal: '🎯',
  search: '🔍',
  memory: '🧠',
};

const STATUS_ICON: Record<ActionDescriptor['status'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

/**
 * Compact inline card rendered above the AI text reply when the assistant
 * performed one or more AI Actions (addMovie, logTravel, …). Shows the
 * category icon, action title, subtitle, and a status indicator.
 */
export function ActionCard({
  action,
  index = 0,
}: {
  action: ActionDescriptor;
  index?: number;
}) {
  const icon = CATEGORY_ICON[action.category] ?? '⚡';
  const statusIcon = STATUS_ICON[action.status];
  const isOk = action.status === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className={`glass flex items-start gap-2.5 rounded-xl border p-3 ${
        isOk
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-red-400/20 bg-red-400/5'
      }`}
    >
      {/* Category icon */}
      <span className="mt-0.5 text-sm leading-none" role="img" aria-label={action.category}>
        {icon}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white/90">
          {action.verb && (
            <span className="mr-1 text-white/50">{action.verb}</span>
          )}
          {action.title}
        </p>
        {action.subtitle && (
          <p className="mt-0.5 truncate text-[11px] text-white/50">
            {action.subtitle}
          </p>
        )}
      </div>

      {/* Status */}
      <span
        className={`mt-0.5 text-xs font-bold ${
          isOk ? 'text-emerald-400' : 'text-red-400'
        }`}
        role="img"
        aria-label={action.status}
      >
        {statusIcon}
      </span>
    </motion.div>
  );
}

/**
 * Row of action cards — one per action performed in a single turn.
 * Renders nothing if the array is empty.
 */
export function ActionCardRow({
  actions,
}: {
  actions: ActionDescriptor[];
}) {
  if (actions.length === 0) return null;

  return (
    <div className="space-y-2">
      {actions.map((action, i) => (
        <ActionCard key={`${action.category}-${action.title}-${i}`} action={action} index={i} />
      ))}
    </div>
  );
}
