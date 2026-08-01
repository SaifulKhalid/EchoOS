import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconTravel, IconSparkle, IconAlertTriangle } from '@/components/ui/icons';
import { TravelCard } from '@/components/travel/TravelCard';
import { TravelFormModal } from '@/components/travel/TravelFormModal';
import { useTravel } from '@/hooks/useTravel';
import type { TravelEntry } from '@/types';
import { dateSortKey } from '@/utils/dates';

type SortKey = 'startDate' | 'rating' | 'budget' | 'destination';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'startDate', label: 'Recent' },
  { key: 'rating', label: 'Rating' },
  { key: 'budget', label: 'Budget' },
  { key: 'destination', label: 'Name' },
];

/**
 * Travel page — log destinations, budgets, companions, and favorite moments.
 * Entries display in a card grid with sort and filter controls.
 */
export default function TravelPage() {
  const { data: entries, isLoading, error } = useTravel();
  const [editing, setEditing] = useState<TravelEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('startDate');
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Sort & filter
  const displayed = useMemo(() => {
    if (!entries) return [];
    let list = [...entries];

    if (filterFavorites) list = list.filter((e) => e.favorite);

    list.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'budget':
          return (b.budget ?? 0) - (a.budget ?? 0);
        case 'destination':
          return a.destination.localeCompare(b.destination);
        case 'startDate':
        default:
          return dateSortKey(b.startDate) - dateSortKey(a.startDate);
      }
    });

    return list;
  }, [entries, sortBy, filterFavorites]);

  return (
    <>
      <PageHeader
        title="Travel"
        subtitle="Destinations, budgets, companions, and favorite moments."
        action={
          <button
            onClick={() => setAdding(true)}
            className="btn-primary text-sm"
          >
            <IconSparkle width={16} height={16} />
            Add Trip
          </button>
        }
      />

      {/* Sort & filter toolbar */}
      {displayed.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
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

          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60 hover:text-white/70">
            <input
              type="checkbox"
              checked={filterFavorites}
              onChange={(e) => setFilterFavorites(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-accent focus:ring-accent"
            />
            Favorites only
          </label>

          <span className="ml-auto text-xs text-white/55">
            {displayed.length} trip{displayed.length !== 1 ? 's' : ''}
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
      ) : displayed.length === 0 && !filterFavorites ? (
        <EmptyState
          icon={<IconTravel width={26} height={26} />}
          title="No trips logged yet"
          description="Click 'Add Trip' above to log your first adventure."
        />
      ) : displayed.length === 0 && filterFavorites ? (
        <EmptyState
          icon={<IconTravel width={26} height={26} />}
          title="No favorite trips yet"
          description='Uncheck "Favorites only" to see all entries, or mark a trip as a favorite.'
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {displayed.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <TravelCard entry={entry} onClick={() => setEditing(entry)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modals */}
      {adding && <TravelFormModal onClose={() => setAdding(false)} />}
      {editing && (
        <TravelFormModal entry={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

/* ── Loading skeleton grid ─────────────────────────────────── */

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="skeleton h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-28" />
              <div className="skeleton h-3 w-20" />
            </div>
          </div>
          <div className="mb-3 space-y-1.5">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-2/3" />
          </div>
          <div className="skeleton h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
