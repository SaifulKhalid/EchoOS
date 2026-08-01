import type { TravelEntry } from '@/types';
import { StarRating } from '@/components/ui/StarRating';
import { MOODS, MOOD_BG } from '@/config/constants';
import { IconTravel } from '@/components/ui/icons';
import { formatDateRange } from '@/utils/dates';

export function TravelCard({
  entry,
  onClick,
}: {
  entry: TravelEntry;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Edit travel entry: ${entry.destination}`}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-glass-lg"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 transition-opacity ${
          entry.mood
            ? (MOOD_BG[entry.mood] ?? 'bg-white/20')
            : 'bg-white/10'
        } ${entry.mood ? 'opacity-70' : 'opacity-0'}`}
      />

      {entry.favorite && (
        <div className="absolute right-3 top-3 text-mood-love drop-shadow-lg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 20s-7-4.4-9.2-8.4A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5.6C19 15.6 12 20 12 20Z" />
          </svg>
        </div>
      )}

      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-gradient/20 text-accent-soft">
          <IconTravel width={18} height={18} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-white/90 group-hover:text-white">
              {entry.destination}
            </p>
            {entry.status === 'planned' && (
              <span className="rounded-full bg-accent/20 border border-accent/30 px-1.5 py-0.5 text-[9px] font-semibold text-accent-soft">
                PLANNED
              </span>
            )}
          </div>
          <p className="truncate text-xs text-white/55">
            {formatDateRange(entry.startDate, entry.endDate)}
            {entry.durationDays ? ` · ${entry.durationDays} day${entry.durationDays !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </div>

      <div className="mb-2.5 flex items-center justify-between gap-2">
        <StarRating value={entry.rating ?? 0} size="sm" interactive={false} />
        {entry.budget != null && (
          <span className="shrink-0 text-xs font-medium text-white/50">
            ${entry.budget.toLocaleString()}
          </span>
        )}
      </div>

      {entry.companions && entry.companions.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {entry.companions.slice(0, 3).map((name) => (
            <span
              key={name}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60"
            >
              {name}
            </span>
          ))}
          {entry.companions.length > 3 && (
            <span className="text-[10px] text-white/55">
              +{entry.companions.length - 3}
            </span>
          )}
        </div>
      )}

      {entry.places && entry.places.length > 0 && (
        <p className="truncate text-[11px] text-white/55">
          {entry.places.slice(0, 2).join(' · ')}
          {entry.places.length > 2 ? ' …' : ''}
        </p>
      )}

      {entry.mood && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] text-white/55">
            {MOODS.find((m) => m.id === entry.mood)?.label}
          </span>
        </div>
      )}
    </button>
  );
}
