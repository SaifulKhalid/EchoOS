import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconFood, IconSparkle } from '@/components/ui/icons';
import { FoodCard } from '@/components/food/FoodCard';
import { FoodFormModal } from '@/components/food/FoodFormModal';
import { useFood } from '@/hooks/useFood';
import type { FoodEntry } from '@/types';
import { dateSortKey } from '@/utils/dates';

type SortKey = 'date' | 'rating' | 'price' | 'restaurant';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Recent' },
  { key: 'rating', label: 'Rating' },
  { key: 'price', label: 'Price' },
  { key: 'restaurant', label: 'Name' },
];

/**
 * Food page — log restaurants and meals with ratings, moods, and notes.
 * Entries display in a clean card grid with sort and filter controls.
 */
export default function FoodPage() {
  const { data: entries, isLoading } = useFood();
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('date');
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
        case 'price':
          return (a.price ?? 0) - (b.price ?? 0);
        case 'restaurant':
          return a.restaurant.localeCompare(b.restaurant);
        case 'date':
        default:
          return dateSortKey(b.date) - dateSortKey(a.date);
      }
    });

    return list;
  }, [entries, sortBy, filterFavorites]);

  return (
    <>
      <PageHeader
        title="Food"
        subtitle="Restaurants, cafés, and dishes worth remembering."
        action={
          <button
            onClick={() => setAdding(true)}
            className="btn-primary text-sm"
          >
            <IconSparkle width={16} height={16} />
            Add Meal
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
                    ? 'bg-accent-gradient text-ink-950'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/50 hover:text-white/70">
            <input
              type="checkbox"
              checked={filterFavorites}
              onChange={(e) => setFilterFavorites(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-accent focus:ring-accent"
            />
            Favorites only
          </label>

          <span className="ml-auto text-xs text-white/35">
            {displayed.length} meal{displayed.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingGrid />
      ) : displayed.length === 0 && !filterFavorites ? (
        <EmptyState
          icon={<IconFood width={26} height={26} />}
          title="No meals logged yet"
          description="Click 'Add Meal' above to log your first restaurant or dish."
        />
      ) : displayed.length === 0 && filterFavorites ? (
        <EmptyState
          icon={<IconFood width={26} height={26} />}
          title="No favorite meals yet"
          description='Uncheck "Favorites only" to see all entries, or mark a meal as a favorite.'
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
              <FoodCard entry={entry} onClick={() => setEditing(entry)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add modal */}
      {adding && <FoodFormModal onClose={() => setAdding(false)} />}

      {/* Edit modal */}
      {editing && (
        <FoodFormModal entry={editing} onClose={() => setEditing(null)} />
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
              <div className="skeleton h-3.5 w-24" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
          <div className="mb-3 space-y-1.5">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-3/4" />
          </div>
          <div className="skeleton h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
