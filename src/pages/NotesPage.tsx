import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconNote, IconSparkle, IconAlertTriangle } from '@/components/ui/icons';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteFormModal } from '@/components/notes/NoteFormModal';
import { useNotes } from '@/hooks/useNotes';
import type { NoteEntry } from '@/types';
import { dateSortKey } from '@/utils/dates';

type SortKey = 'date' | 'title';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Recent' },
  { key: 'title', label: 'Title' },
];

const TYPE_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'idea', label: 'Ideas' },
  { id: 'journal', label: 'Journals' },
  { id: 'thought', label: 'Thoughts' },
];

/**
 * Notes page — capture ideas, journal entries, and fleeting thoughts
 * with mood and date tracking. Entries display in a card grid with
 * type-based filtering and sort controls.
 */
export default function NotesPage() {
  const { data: entries, isLoading, error } = useNotes();
  const [editing, setEditing] = useState<NoteEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [filterType, setFilterType] = useState('all');

  // Sort & filter
  const displayed = useMemo(() => {
    if (!entries) return [];
    let list = [...entries];

    if (filterType !== 'all') {
      list = list.filter((e) => e.type === filterType);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title ?? a.text).localeCompare(b.title ?? b.text);
        case 'date':
        default:
          return dateSortKey(b.date) - dateSortKey(a.date);
      }
    });

    return list;
  }, [entries, sortBy, filterType]);

  return (
    <>
      <PageHeader
        title="Notes"
        subtitle="Quick memories, thoughts, ideas, and journal entries."
        action={
          <button
            onClick={() => setAdding(true)}
            className="btn-primary text-sm"
          >
            <IconSparkle width={16} height={16} />
            New Note
          </button>
        }
      />

      {/* Filter & sort toolbar */}
      {entries && entries.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterType === f.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortBy === opt.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-white/55">
            {displayed.length} note{displayed.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingGrid />
      ) : error ? (
        <GlassCard className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mood-love/15 text-mood-love">
            <IconAlertTriangle />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">Failed to load data</p>
            <p className="mt-1 text-xs text-white/60">{(error as Error).message || 'An unexpected error occurred.'}</p>
          </div>
          <button onClick={() => window.location.reload()} className="btn-ghost text-sm">Retry</button>
        </GlassCard>
      ) : displayed.length === 0 && filterType !== 'all' ? (
        <EmptyState
          icon={<IconNote width={26} height={26} />}
          title="No notes in this category"
          description="Try selecting a different type above, or create a new note."
        />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<IconNote width={26} height={26} />}
          title="No notes yet"
          description="Click 'New Note' above to capture your first thought, idea, or journal entry."
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {displayed.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <NoteCard entry={entry} onClick={() => setEditing(entry)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modals */}
      {adding && <NoteFormModal onClose={() => setAdding(false)} />}
      {editing && (
        <NoteFormModal entry={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

/* ── Loading skeleton grid ─────────────────────────────────── */

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="skeleton h-4 w-14 rounded-full" />
            <div className="skeleton h-3 w-12" />
          </div>
          <div className="skeleton mb-2 h-4 w-3/4" />
          <div className="space-y-1.5">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
