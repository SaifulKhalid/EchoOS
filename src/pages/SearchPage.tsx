import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSearch, IconX } from '@/components/ui/icons';
import { useSearch } from '@/hooks/useSearch';
import { MEMORY_CATEGORIES, MOODS } from '@/config/constants';
import { formatDateLong } from '@/utils/dates';
import type { ReactNode } from 'react';

/**
 * Search page — full-text search across all memories with category,
 * mood, rating, and date-range filters. All search is client-side
 * from the cached timeline data — zero extra Firestore reads.
 */

const CAT_ICON: Record<string, string> = {
  movie: '🎬',
  food: '🍽️',
  travel: '✈️',
  note: '💭',
  wishlist: '⭐',
};

const CAT_LABEL: Record<string, string> = {
  movie: 'Movies',
  food: 'Food',
  travel: 'Travel',
  note: 'Notes',
  wishlist: 'Wishlist',
};

const RATING_OPTIONS = [null, 7, 5, 3] as const;

export default function SearchPage() {
  const {
    results,
    isLoading,
    filters,
    hasActiveFilters,
    setQuery,
    toggleCategory,
    toggleMood,
    setMinRating,
    setDateRange,
    clearFilters,
  } = useSearch();

  return (
    <>
      <PageHeader
        title="Search"
        subtitle="Find any memory across all categories."
      />

      {/* ── Search bar ── */}
      <div className="relative mb-4">
        <IconSearch
          width={18}
          height={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/55"
        />
        <input
          autoFocus
          value={filters.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, notes, reviews, destinations…"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-11 py-3.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-accent/40 focus:bg-white/[0.07] transition-colors"
        />
        {filters.query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/55 hover:text-white/70 transition-colors"
            aria-label="Clear search"
          >
            <IconX width={16} height={16} />
          </button>
        )}
      </div>

      {/* ── Filters row ── */}
      <div className="mb-6 space-y-3">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {MEMORY_CATEGORIES.map((cat) => (
            <FilterPill
              key={cat}
              active={filters.categories.includes(cat)}
              onClick={() => toggleCategory(cat)}
            >
              {CAT_ICON[cat]} {CAT_LABEL[cat]}
            </FilterPill>
          ))}
        </div>

        {/* Mood pills */}
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <FilterPill
              key={m.id}
              active={filters.moods.includes(m.id)}
              onClick={() => toggleMood(m.id)}
            >
              {m.label}
            </FilterPill>
          ))}
        </div>

        {/* Rating + Date filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-white/55">Rating:</span>
          {RATING_OPTIONS.map((r) => (
            <FilterPill
              key={r ?? 'any'}
              active={filters.minRating === r}
              onClick={() => setMinRating(r)}
            >
              {r == null ? 'Any' : `${r}+`}
            </FilterPill>
          ))}

          <span className="ml-2 text-[11px] text-white/55">From:</span>
          <input
            type="date"
            value={filters.dateFrom ? new Date(filters.dateFrom).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const val = e.target.value;
              const fromMs = val ? new Date(val + 'T00:00:00').getTime() : null;
              setDateRange(fromMs, filters.dateTo);
            }}
            className="w-32 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-accent/40"
          />

          <span className="text-[11px] text-white/55">To:</span>
          <input
            type="date"
            value={filters.dateTo ? new Date(filters.dateTo).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const val = e.target.value;
              const toMs = val ? new Date(val + 'T23:59:59').getTime() : null;
              setDateRange(filters.dateFrom, toMs);
            }}
            className="w-32 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-accent/40"
          />

          {hasActiveFilters && (
            <button
              onClick={() => clearFilters()}
              className="ml-auto text-xs text-accent-soft hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : hasActiveFilters && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/55">
            <IconSearch width={24} height={24} />
          </div>
          <p className="text-sm text-white/50">No results match your search criteria.</p>
          <button
            onClick={() => clearFilters()}
            className="mt-3 text-xs text-accent-soft hover:text-white transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          <p className="mb-3 text-xs text-white/55">
            {results.length} result{results.length !== 1 ? 's' : ''}
            {hasActiveFilters && filters.query && ` for "${filters.query}"`}
          </p>
          {results.map((entry) => (
            <motion.div
              key={entry.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <GlassCard className="flex items-start gap-3 py-3 px-4">
                {/* Category badge */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm">
                  {CAT_ICON[entry.type] ?? '📌'}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white/80">{entry.title}</p>
                    <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-[1px] text-[9px] text-white/55">
                      {CAT_LABEL[entry.type] ?? entry.type}
                    </span>
                  </div>

                  {entry.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-white/60">{entry.subtitle}</p>
                  )}

                  {/* Match snippet */}
                  {entry.matchSnippet && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-accent-soft/70 italic">
                      …{entry.matchSnippet}…
                    </p>
                  )}

                  <div className="mt-1 flex items-center gap-3 text-[11px] text-white/55">
                    {entry.date > 0 && <span>{formatDateLong(entry.date)}</span>}
                    {entry.rating != null && (
                      <span className="text-mood-joy">{entry.rating}/10</span>
                    )}
                    {entry.done != null && (
                      <span>{entry.done ? '✅ Done' : '⬜ Pending'}</span>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/55">
            <IconSearch width={24} height={24} />
          </div>
          <p className="text-sm text-white/50">
            Type a query or select filters to search across all your memories.
          </p>
        </div>
      )}
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-all ${
        active
          ? 'border-accent/40 bg-accent/15 text-accent-soft'
          : 'border-white/10 bg-white/5 text-white/55 hover:border-white/20 hover:text-white/80'
      }`}
    >
      {children}
    </button>
  );
}
