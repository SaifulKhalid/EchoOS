import { MOODS, TIMELINE_CATEGORY_META } from '@/config/constants';
import { StarRating } from '@/components/ui/StarRating';
import { formatDateShort } from '@/utils/dates';
import type { TimelineEntry } from '@/hooks/useTimeline';

export function TimelineItem({
  entry,
  onClick,
}: {
  entry: TimelineEntry;
  onClick: () => void;
}) {
  const meta = TIMELINE_CATEGORY_META[entry.type] ?? TIMELINE_CATEGORY_META.note;

  return (
    <button
      onClick={onClick}
      aria-label={`View ${meta.label}: ${entry.title}`}
      className="group flex w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-glass-lg sm:gap-4 sm:p-4"
    >
      {entry.thumb ? (
        <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5 sm:h-20 sm:w-14">
          <img
            src={entry.thumb}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg sm:h-12 sm:w-12 sm:text-xl">
          {meta.icon}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.color}`}
              >
                {meta.label}
              </span>
              <span className="text-[10px] text-white/55">
                {formatDateShort(entry.date)}
              </span>
              {entry.done && (
                <span className="text-[10px] text-mood-calm">✓ Done</span>
              )}
            </div>

            <p className="truncate text-sm font-medium text-white/90 group-hover:text-white">
              {entry.title}
            </p>

            {entry.subtitle && (
              <p className="mt-0.5 truncate text-xs text-white/60">
                {entry.subtitle}
              </p>
            )}
          </div>

          {entry.rating != null && (
            <div className="shrink-0">
              <StarRating value={entry.rating} size="sm" interactive={false} />
            </div>
          )}
        </div>

        {entry.preview && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/55">
            {entry.preview}
          </p>
        )}

        {entry.mood && (
          <div className="mt-1.5">
            <span className="text-[10px] text-white/55">
              {MOODS.find((m) => m.id === entry.mood)?.label}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
