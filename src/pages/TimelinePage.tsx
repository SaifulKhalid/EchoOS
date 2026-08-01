import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconTimeline, IconAlertTriangle } from '@/components/ui/icons';
import { TimelineItem } from '@/components/timeline/TimelineItem';
import { useTimeline, type TimelineEntry } from '@/hooks/useTimeline';
import { MEMORY_CATEGORIES, MOODS } from '@/config/constants';

type TimeRange = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear';

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'lastWeek', label: 'Last Week' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'thisYear', label: 'This Year' },
];

/**
 * Timeline page — a scrollable, chronological feed of every memory
 * across all categories. Supports filtering by category, mood, time range,
 * and full-text search.
 */
export default function TimelinePage() {
  const { entries, isLoading, error } = useTimeline();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMood, setFilterMood] = useState<string>('all');
  const [filterRange, setFilterRange] = useState<TimeRange>('all');

  // Sort & filter
  const displayed = useMemo(() => {
    let list = entries;

    if (filterCategory !== 'all') {
      list = list.filter((e) => e.type === filterCategory);
    }
    if (filterMood !== 'all') {
      list = list.filter((e) => e.mood === filterMood);
    }

    if (filterRange !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      list = list.filter((e) => {
        const d = e.date;
        switch (filterRange) {
          case 'today':
            return d >= startOfToday;
          case 'yesterday':
            return d >= startOfToday - oneDayMs && d < startOfToday;
          case 'thisWeek': {
            const dayOfWeek = now.getDay();
            const startOfWeek = startOfToday - dayOfWeek * oneDayMs;
            return d >= startOfWeek;
          }
          case 'lastWeek': {
            const dayOfWeek = now.getDay();
            const startOfThisWeek = startOfToday - dayOfWeek * oneDayMs;
            const startOfLastWeek = startOfThisWeek - 7 * oneDayMs;
            return d >= startOfLastWeek && d < startOfThisWeek;
          }
          case 'thisMonth': {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            return d >= startOfMonth;
          }
          case 'lastMonth': {
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
            const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            return d >= startOfLastMonth && d < startOfThisMonth;
          }
          case 'thisYear': {
            const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
            return d >= startOfYear;
          }
          default:
            return true;
        }
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subtitle?.toLowerCase().includes(q) ||
          e.preview?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [entries, filterCategory, filterMood, filterRange, search]);

  // Group by year → month
  const groups = useMemo(() => {
    const map = new Map<string, { month: number; year: number; items: TimelineEntry[] }[]>();

    for (const entry of displayed) {
      const d = new Date(entry.date);
      const year = d.getFullYear();
      const month = d.getMonth();

      let yearGroup = map.get(String(year));
      if (!yearGroup) {
        yearGroup = [];
        map.set(String(year), yearGroup);
      }

      let monthGroup = yearGroup.find((g) => g.month === month);
      if (!monthGroup) {
        monthGroup = { year, month, items: [] };
        yearGroup.push(monthGroup);
      }
      monthGroup.items.push(entry);
    }

    // Sort: years descending, months descending
    const sorted = [...map.entries()].sort(([a], [b]) => Number(b) - Number(a));
    for (const [, months] of sorted) {
      months.sort((a, b) => b.month - a.month);
    }

    return sorted;
  }, [displayed]);

  return (
    <>
      <PageHeader
        title="Timeline"
        subtitle="Every memory, in order — your life, scrollable."
      />

      {/* Filters + search */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Category filter */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
          <FilterButton active={filterCategory === 'all'} onClick={() => setFilterCategory('all')}>
            All
          </FilterButton>
          {MEMORY_CATEGORIES.map((cat) => (
            <FilterButton
              key={cat}
              active={filterCategory === cat}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </FilterButton>
          ))}
        </div>

        {/* Mood filter */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
          <FilterButton active={filterMood === 'all'} onClick={() => setFilterMood('all')}>
            Any mood
          </FilterButton>
          {MOODS.map((m) => (
            <FilterButton
              key={m.id}
              active={filterMood === m.id}
              onClick={() => setFilterMood(m.id)}
            >
              {m.label}
            </FilterButton>
          ))}
        </div>

        {/* Time range filter */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
          {TIME_RANGES.map((tr) => (
            <FilterButton
              key={tr.id}
              active={filterRange === tr.id}
              onClick={() => setFilterRange(tr.id)}
            >
              {tr.label}
            </FilterButton>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories…"
            className="w-44 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 placeholder-white/30 outline-none transition-colors focus:border-accent/40 focus:bg-white/10 sm:w-56"
          />
        </div>
      </div>

      {/* Count */}
      {displayed.length > 0 && (
        <p className="mb-4 text-xs text-white/55">
          {displayed.length} memory{displayed.length !== 1 ? 'ies' : ''}
          {displayed.length !== entries.length
            ? ` (filtered from ${entries.length})`
            : ''}
        </p>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingFeed />
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
      ) : displayed.length === 0 && (filterCategory !== 'all' || filterMood !== 'all' || search) ? (
        <EmptyState
          icon={<IconTimeline width={26} height={26} />}
          title="No matching memories"
          description="Try adjusting your filters or search query."
        />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<IconTimeline width={26} height={26} />}
          title="No memories yet"
          description="Start logging movies, food, travel, notes, or wishlist items — they'll all appear here."
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([year, months]) => (
            <motion.div
              key={year}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Year header */}
              <h2 className="mb-3 font-display text-lg font-semibold text-white/80">
                {year}
              </h2>

              {months.map((monthGroup) => (
                <div key={`${year}-${monthGroup.month}`} className="mb-4">
                  {/* Month header */}
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/55">
                    {new Date(Number(year), monthGroup.month).toLocaleDateString('en-US', { month: 'long' })}
                  </h3>

                  {/* Entries */}
                  <div className="space-y-2">
                    {monthGroup.items.map((entry, i) => (
                      <motion.div
                        key={entry.key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.02 }}
                      >
                        <TimelineItem
                          entry={entry}
                          onClick={() => {
                            // Future: open the relevant edit modal
                            // For now, do nothing (the entry is view-only on timeline)
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Filter pill button ──────────────────────────────────── */

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

/* ── Loading skeleton feed ───────────────────────────────── */

function LoadingFeed() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <div className="skeleton h-14 w-10 shrink-0 rounded-lg sm:h-20 sm:w-14" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="skeleton h-4 w-14 rounded-full" />
              <div className="skeleton h-4 w-20" />
            </div>
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
