import type { FoodEntry } from '@/types';
import { StarRating } from '@/components/ui/StarRating';
import { MOODS } from '@/config/constants';
import { IconFood } from '@/components/ui/icons';
import { formatDateLong } from '@/utils/dates';

// Static map for Tailwind JIT detection — dynamic string interpolation
// of class names would be stripped from the production CSS bundle.
const MOOD_BG: Record<string, string> = {
  joy: 'bg-mood-joy/60',
  calm: 'bg-mood-calm/60',
  love: 'bg-mood-love/60',
  sad: 'bg-mood-sad/60',
  awe: 'bg-mood-awe/60',
  neutral: 'bg-mood-neutral/60',
};

/**
 * Food entry card for the grid display. Shows restaurant name, cuisine,
 * price, rating, mood accent, and favorite dishes.
 */
export function FoodCard({
  entry,
  onClick,
}: {
  entry: FoodEntry;
  onClick: () => void;
}) {

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-glass-lg"
    >
      {/* Mood accent bar */}
      <div
        className={`absolute inset-x-0 top-0 h-1 transition-opacity ${
          entry.mood
            ? (MOOD_BG[entry.mood] ?? 'bg-white/20')
            : 'bg-white/10'
        } ${entry.mood ? 'opacity-70' : 'opacity-0'}`}
      />

      {/* Favorite heart */}
      {entry.favorite && (
        <div className="absolute right-3 top-3 text-mood-love drop-shadow-lg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 20s-7-4.4-9.2-8.4A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5.6C19 15.6 12 20 12 20Z" />
          </svg>
        </div>
      )}

      {/* Restaurant icon + name */}
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-gradient/20 text-accent-soft">
          <IconFood width={18} height={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/90 group-hover:text-white">
            {entry.restaurant}
          </p>
          {entry.cuisine && (
            <p className="truncate text-xs text-white/40">{entry.cuisine}</p>
          )}
        </div>
      </div>

      {/* Rating + Price row */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <StarRating value={entry.rating ?? 0} size="sm" interactive={false} />
        {entry.price != null && (
          <span className="shrink-0 text-xs font-medium text-white/50">
            ${entry.price.toFixed(2)}
          </span>
        )}
      </div>

      {/* Favorite dishes */}
      {entry.favoriteDishes && entry.favoriteDishes.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {entry.favoriteDishes.slice(0, 2).map((dish) => (
            <span
              key={dish}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/45"
            >
              {dish}
            </span>
          ))}
          {entry.favoriteDishes.length > 2 && (
            <span className="text-[10px] text-white/30">
              +{entry.favoriteDishes.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: date + mood */}
      <div className="flex items-center justify-between gap-2">
        {entry.date && (
          <p className="text-[11px] text-white/35">
            {formatDateLong(entry.date)}
          </p>
        )}
        {entry.mood && (
          <span className="shrink-0 text-[11px] text-white/40">
            {MOODS.find((m) => m.id === entry.mood)?.label}
          </span>
        )}
      </div>
    </button>
  );
}


