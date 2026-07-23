import type { WishlistEntry } from '@/types';
import { MOODS } from '@/config/constants';

const MOOD_BG: Record<string, string> = {
  joy: 'bg-mood-joy/60',
  calm: 'bg-mood-calm/60',
  love: 'bg-mood-love/60',
  sad: 'bg-mood-sad/60',
  awe: 'bg-mood-awe/60',
  neutral: 'bg-mood-neutral/60',
};

const CATEGORY_STYLE: Record<string, string> = {
  movie: 'bg-accent/15 text-accent-soft border-accent/20',
  place: 'bg-mood-calm/15 text-mood-calm border-mood-calm/20',
  food: 'bg-mood-joy/15 text-mood-joy border-mood-joy/20',
  book: 'bg-mood-awe/15 text-mood-awe border-mood-awe/20',
  product: 'bg-mood-neutral/15 text-mood-neutral border-mood-neutral/20',
};

const CATEGORY_ICON: Record<string, string> = {
  movie: '🎬',
  place: '📍',
  food: '🍽️',
  book: '📚',
  product: '🛍️',
};

/**
 * Wishlist item card. Shows the category badge, title, note preview,
 * done status with strikethrough, and mood accent bar.
 */
export function WishlistCard({
  entry,
  onClick,
}: {
  entry: WishlistEntry;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-glass-lg ${
        entry.done ? 'opacity-60' : ''
      }`}
    >
      {/* Mood accent bar */}
      <div
        className={`absolute inset-x-0 top-0 h-1 transition-opacity ${
          entry.mood
            ? (MOOD_BG[entry.mood] ?? 'bg-white/20')
            : 'bg-white/10'
        } ${entry.mood ? 'opacity-70' : 'opacity-0'}`}
      />

      {/* Done checkmark */}
      {entry.done && (
        <div className="absolute right-3 top-3 text-mood-calm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      )}

      {/* Category badge */}
      <div className="mb-2.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
            CATEGORY_STYLE[entry.category] ?? 'bg-white/10 text-white/50'
          }`}
        >
          {CATEGORY_ICON[entry.category] ?? ''}
          {entry.category}
        </span>
      </div>

      {/* Title */}
      <p
        className={`mb-1 text-sm font-medium ${
          entry.done
            ? 'text-white/55 line-through'
            : 'text-white/90 group-hover:text-white'
        }`}
      >
        {entry.title}
      </p>

      {/* Note preview */}
      {entry.note && (
        <p className="line-clamp-2 text-xs text-white/60">{entry.note}</p>
      )}

      {/* Mood */}
      {entry.mood && (
        <div className="mt-2">
          <span className="text-[10px] text-white/55">
            {MOODS.find((m) => m.id === entry.mood)?.label}
          </span>
        </div>
      )}
    </button>
  );
}
