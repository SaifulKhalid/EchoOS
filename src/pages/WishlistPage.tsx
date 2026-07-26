import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconWishlist, IconSparkle, IconAlertTriangle } from '@/components/ui/icons';
import { WishlistCard } from '@/components/wishlist/WishlistCard';
import { WishlistFormModal } from '@/components/wishlist/WishlistFormModal';
import { useWishlist } from '@/hooks/useWishlist';
import type { WishlistEntry } from '@/types';

type SortKey = 'title' | 'category';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category' },
];

const CATEGORY_FILTERS: { id: string; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '' },
  { id: 'movie', label: 'Movies', icon: '🎬' },
  { id: 'place', label: 'Places', icon: '📍' },
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'book', label: 'Books', icon: '📚' },
  { id: 'product', label: 'Products', icon: '🛍️' },
];

/**
 * Wishlist page — keep track of movies, places, foods, books, and
 * products you want to experience. Items display in a card grid with
 * category filtering and a toggle to show/hide completed items.
 */
export default function WishlistPage() {
  const { data: entries, isLoading, error } = useWishlist();
  const [editing, setEditing] = useState<WishlistEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('title');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showDone, setShowDone] = useState(true);

  // Sort & filter
  const displayed = useMemo(() => {
    if (!entries) return [];
    let list = [...entries];

    if (filterCategory !== 'all') {
      list = list.filter((e) => e.category === filterCategory);
    }
    if (!showDone) {
      list = list.filter((e) => !e.done);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'category':
          return a.category.localeCompare(b.category);
        case 'title':
        default:
          return a.title.localeCompare(b.title);
      }
    });

    return list;
  }, [entries, sortBy, filterCategory, showDone]);

  return (
    <>
      <PageHeader
        title="Wishlist"
        subtitle="Movies, places, foods, books, and products to experience."
        action={
          <button
            onClick={() => setAdding(true)}
            className="btn-primary text-sm"
          >
            <IconSparkle width={16} height={16} />
            Add Item
          </button>
        }
      />

      {/* Filter & sort toolbar */}
      {entries && entries.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterCategory(f.id)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterCategory === f.id
                    ? 'bg-accent-gradient text-ink-950'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {f.icon && <span>{f.icon}</span>}
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
                    ? 'bg-accent-gradient text-ink-950'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60 hover:text-white/70">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-accent focus:ring-accent"
            />
            Show done
          </label>

          <span className="ml-auto text-xs text-white/55">
            {displayed.length} item{displayed.length !== 1 ? 's' : ''}
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
      ) : displayed.length === 0 && filterCategory !== 'all' ? (
        <EmptyState
          icon={<IconWishlist width={26} height={26} />}
          title="Nothing in this category"
          description="Try a different category above, or add a new item."
        />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<IconWishlist width={26} height={26} />}
          title="Your wishlist is empty"
          description="Click 'Add Item' above to start tracking things you want to experience."
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
              <WishlistCard entry={entry} onClick={() => setEditing(entry)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modals */}
      {adding && <WishlistFormModal onClose={() => setAdding(false)} />}
      {editing && (
        <WishlistFormModal entry={editing} onClose={() => setEditing(null)} />
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
          <div className="skeleton mb-3 h-4 w-20 rounded-full" />
          <div className="skeleton mb-2 h-4 w-3/4" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
