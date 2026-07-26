import type { NoteEntry } from '@/types';
import { MOODS, MOOD_BG, NOTE_TYPE_STYLE, NOTE_TYPE_LABEL } from '@/config/constants';
import { formatDateShort } from '@/utils/dates';

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
      aria-label={`Edit note: ${entry.title ?? (entry.text.length > 40 ? entry.text.slice(0, 40) + '…' : entry.text)}`}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-glass-lg"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 transition-opacity ${
          entry.mood
            ? (MOOD_BG[entry.mood] ?? 'bg-white/20')
            : 'bg-white/10'
        } ${entry.mood ? 'opacity-70' : 'opacity-0'}`}
      />

      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
            NOTE_TYPE_STYLE[entry.type] ?? 'bg-white/10 text-white/50'
          }`}
        >
          {NOTE_TYPE_LABEL[entry.type] ?? entry.type}
        </span>
        {entry.date && (
          <span className="text-[10px] text-white/55">
            {formatDateShort(entry.date)}
          </span>
        )}
      </div>

      {entry.title && (
        <p className="mb-1 truncate text-sm font-medium text-white/90 group-hover:text-white">
          {entry.title}
        </p>
      )}

      <p className="line-clamp-4 text-xs leading-relaxed text-white/50">
        {entry.text}
      </p>

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
