import type { NoteEntry } from '@/types';
import { MOODS } from '@/config/constants';
import { formatDateShort } from '@/utils/dates';

const MOOD_BG: Record<string, string> = {
  joy: 'bg-mood-joy/60',
  calm: 'bg-mood-calm/60',
  love: 'bg-mood-love/60',
  sad: 'bg-mood-sad/60',
  awe: 'bg-mood-awe/60',
  neutral: 'bg-mood-neutral/60',
};

const TYPE_STYLE: Record<string, string> = {
  idea: 'bg-accent/15 text-accent-soft border-accent/20',
  journal: 'bg-mood-calm/15 text-mood-calm border-mood-calm/20',
  thought: 'bg-mood-awe/15 text-mood-awe border-mood-awe/20',
};

const TYPE_LABEL: Record<string, string> = {
  idea: 'Idea',
  journal: 'Journal',
  thought: 'Thought',
};

/**
 * Note card for the grid display. Shows type badge, title (if set),
 * a text preview, date, and mood accent bar.
 */
export function NoteCard({
  entry,
  onClick,
}: {
  entry: NoteEntry;
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

      {/* Type badge + date */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
            TYPE_STYLE[entry.type] ?? 'bg-white/10 text-white/50'
          }`}
        >
          {TYPE_LABEL[entry.type] ?? entry.type}
        </span>
        {entry.date && (
          <span className="text-[10px] text-white/35">
            {formatDateShort(entry.date)}
          </span>
        )}
      </div>

      {/* Title */}
      {entry.title && (
        <p className="mb-1 truncate text-sm font-medium text-white/90 group-hover:text-white">
          {entry.title}
        </p>
      )}

      {/* Text preview */}
      <p className="line-clamp-4 text-xs leading-relaxed text-white/50">
        {entry.text}
      </p>

      {/* Mood label */}
      {entry.mood && (
        <div className="mt-2">
          <span className="text-[10px] text-white/35">
            {MOODS.find((m) => m.id === entry.mood)?.label}
          </span>
        </div>
      )}
    </button>
  );
}


