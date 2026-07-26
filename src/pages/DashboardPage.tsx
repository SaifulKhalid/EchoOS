import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSparkle, IconBell, IconAlertTriangle } from '@/components/ui/icons';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useTimeline } from '@/hooks/useTimeline';
import { useUnreadCount } from '@/hooks/useNotifications';
import { MOODS, MONTH_ABBREVIATIONS } from '@/config/constants';
import { formatDistanceToNow } from '@/utils/dates';
import type { ReactNode } from 'react';

/**
 * Dashboard — a living portrait of your memories and taste.
 * Wired to live data from useAnalytics + useTimeline + useNotifications.
 */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// ── Constants ────────────────────────────────────────────
const CAT_ICON: Record<string, string> = {
  movie: '🎬',
  food: '🍽️',
  travel: '✈️',
  note: '💭',
  wishlist: '⭐',
};

const MOOD_EMOJI: Record<string, string> = {
  joy: '😊',
  calm: '😌',
  love: '🥰',
  sad: '😢',
  awe: '😮',
  neutral: '😐',
};

// ── Sub-components ───────────────────────────────────────

function Tile({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={item} className={className}>
      <GlassCard className="h-full">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/70">{title}</h3>
        </div>
        {children}
      </GlassCard>
    </motion.div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  badge,
}: {
  icon: string;
  label: string;
  value: string | number;
  badge?: string;
}) {
  return (
    <GlassCard className="flex flex-col items-center py-5 text-center">
      <span className="text-2xl">{icon}</span>
      <span className="mt-2 font-display text-2xl font-semibold">{value}</span>
      <span className="mt-0.5 text-xs text-white/50">{label}</span>
      {badge && (
        <span className="mt-1.5 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent-soft">
          {badge}
        </span>
      )}
    </GlassCard>
  );
}

function BarItem({ label, count, max, color }: { label: string; count: number; max: number; color?: string }) {
  const pct = (count / Math.max(max, 1)) * 100;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/70">{label}</span>
        <span className="text-white/55">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color ?? 'bg-accent-gradient'}`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2.5">
      <p className="text-xs text-white/70">{value}</p>
      <p className="mt-0.5 text-[10px] text-white/55">{label}</p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────

export default function DashboardPage() {
  const data = useAnalytics();
  const { entries, error: timelineError } = useTimeline();
  const unreadCount = useUnreadCount();

  const hasError = data.error || timelineError;

  // ── Computer AI insights from data ────────────────────
  const insights = useMemo(() => {
    const lines: string[] = [];
    const mc = data.counts;
    const total = data.totalEntries;

    if (total > 0) {
      lines.push(`You have logged ${total} memories across all categories.`);

      // Top category
      const topCat = (Object.entries(mc) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
      if (topCat && topCat[1] > 0) {
        const label = topCat[0] === 'movie' ? 'movies'
          : topCat[0] === 'food' ? 'meals'
          : topCat[0] === 'travel' ? 'trips'
          : topCat[0] === 'note' ? 'notes'
          : 'wishlist items';
        lines.push(`Your most logged category is **${label}** (${topCat[1]} entries).`);
      }

      // Genre streak
      if (data.topGenres.length > 0) {
        const topGenre = data.topGenres[0];
        lines.push(`Your top movie genre is **${topGenre.name}** (${topGenre.count} films).`);
      }

      // Mood pattern
      if (data.topMoods.length > 0) {
        const topMood = data.topMoods[0];
        const moodLabel = MOODS.find((m) => m.id === topMood.id)?.label ?? topMood.id;
        lines.push(`You feel **${moodLabel.toLowerCase()}** most often when logging memories.`);
      }

      // Rating streak
      if (data.avgMovieRating != null && data.avgMovieRating >= 7) {
        lines.push('You tend to rate movies highly — great taste!');
      } else if (data.avgMovieRating != null && data.avgMovieRating < 5) {
        lines.push('You are a tough critic when it comes to movies.');
      }

      // Travel
      if (data.totalTripDays > 0) {
        lines.push(`You have spent **${data.totalTripDays} days** traveling.`);
      }

      // Wishlist
      if (data.wishlistTotal > 0 && data.wishlistDone > 0) {
        const pct = Math.round((data.wishlistDone / data.wishlistTotal) * 100);
        lines.push(`You have completed **${pct}%** of your wishlist.`);
      }
    }

    return lines.length > 0 ? lines : ['Start logging memories and EchoOS will surface patterns here.'];
  }, [data]);

  // Loading state
  if (data.isLoading) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="A living portrait of your memories and taste." />
        <div className="space-y-4">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="skeleton h-56 rounded-2xl lg:col-span-2" />
            <div className="skeleton h-56 rounded-2xl" />
          </div>
        </div>
      </>
    );
  }

  if (hasError) {
    const errorMsg = data.error || timelineError;
    return (
      <>
        <PageHeader title="Dashboard" subtitle="A living portrait of your memories and taste." />
        <GlassCard className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mood-love/15 text-mood-love">
            <IconAlertTriangle />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">Failed to load data</p>
            <p className="mt-1 text-xs text-white/60">{(errorMsg as Error).message || 'An unexpected error occurred.'}</p>
          </div>
          <button onClick={() => window.location.reload()} className="btn-ghost text-sm">Retry</button>
        </GlassCard>
      </>
    );
  }

  // ── Derived values ──────────────────────────────────────
  const recentEntries = entries.slice(0, 6);
  const maxMonthlyCount = Math.max(...data.monthlyActivity.map((m) => m.count), 1);
  const maxGenreCount = Math.max(...data.topGenres.map((g) => g.count), 1);
  const currentYear = new Date().getFullYear();



  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="A living portrait of your memories and taste."
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {/* ── AI Insight — dynamic computed text ──────────────── */}
        <motion.div variants={item}>
          <GlassCard className="relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-gradient text-ink-950 shadow-glow">
                <IconSparkle width={20} height={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-xs uppercase tracking-wider text-accent-soft">
                  AI Insight
                </p>
                <div className="space-y-1">
                  {insights.map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.35 }}
                      className="text-sm text-white/80"
                    >
                      {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <span key={j} className="font-medium text-white">
                            {part.slice(2, -2)}
                          </span>
                        ) : (
                          part
                        ),
                      )}
                    </motion.p>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── KPI Row ─────────────────────────────────────────── */}
        <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            icon="🎬"
            label="Movies"
            value={data.counts.movie}
            badge={data.avgMovieRating != null ? `${data.avgMovieRating.toFixed(1)} avg` : undefined}
          />
          <KpiCard
            icon="🍽️"
            label="Meals"
            value={data.counts.food}
            badge={data.avgFoodRating != null ? `${data.avgFoodRating.toFixed(1)} avg` : undefined}
          />
          <KpiCard
            icon="✈️"
            label="Trips"
            value={data.counts.travel}
            badge={data.totalTripDays > 0 ? `${data.totalTripDays}d total` : undefined}
          />
          <KpiCard
            icon="📝"
            label="Notes"
            value={data.counts.note}
          />
        </motion.div>

        {/* ── Middle row: Recent + Monthly Activity ────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Recent Memories */}
          <Tile title="Recent Memories" className="lg:col-span-2">
            {recentEntries.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-white/55">
                No memories yet. Start logging!
              </div>
            ) : (
              <div className="-mx-1 space-y-1">
                {recentEntries.map((e) => (
                  <div
                    key={e.key}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]"
                  >
                    {/* Category badge */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm">
                      {CAT_ICON[e.type] ?? '📌'}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/80">{e.title}</p>
                      <p className="truncate text-xs text-white/55">
                        {e.subtitle ?? ''}
                        {e.subtitle && e.date ? ' · ' : ''}
                        {e.date ? formatDistanceToNow(e.date) : ''}
                      </p>
                    </div>

                    {/* Rating or mood */}
                    {e.rating != null && (
                      <span className="shrink-0 rounded-md bg-mood-joy/15 px-1.5 py-0.5 text-[10px] text-mood-joy">
                        {e.rating}/10
                      </span>
                    )}
                    {e.mood && !e.rating && (
                      <span className="shrink-0 text-sm">{MOOD_EMOJI[e.mood] ?? '😐'}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Tile>

          {/* Monthly Activity (this year) */}
          <Tile title={`Monthly Activity (${currentYear})`}>
            {data.monthlyActivity.some((m) => m.count > 0) ? (
              <div className="flex h-40 items-end gap-1.5 sm:gap-2">
                {data.monthlyActivity.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(m.count / maxMonthlyCount) * 100}px` }}
                      transition={{ duration: 0.6, delay: m.month * 0.03, ease: 'easeOut' }}
                      className="w-full rounded-t-md bg-accent-gradient"
                      style={{ minHeight: m.count > 0 ? '4px' : '0' }}
                    />
                    {m.count > 0 && (
                      <span className="text-[9px] text-white/55">{m.count}</span>
                    )}
                    <span className="text-[9px] text-white/55">
                      {MONTH_ABBREVIATIONS[m.month]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-xs text-white/55">
                No activity this year yet
              </div>
            )}
          </Tile>
        </div>

        {/* ── Bottom row: Genres + Quick Glance ────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Top Genres */}
          {data.topGenres.length > 0 && (
            <Tile title="Top Genres">
              <div className="space-y-2.5">
                {data.topGenres.map((g) => (
                  <BarItem key={g.name} label={g.name} count={g.count} max={maxGenreCount} />
                ))}
              </div>
            </Tile>
          )}

          {/* Quick Glance */}
          <Tile title="Quick Glance">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Total Entries" value={data.totalEntries} />
              <Stat
                label="Wishlist"
                value={
                  data.wishlistTotal > 0
                    ? `${Math.round((data.wishlistDone / data.wishlistTotal) * 100)}% done`
                    : '—'
                }
              />
              <Stat
                label="Avg Movie Rating"
                value={data.avgMovieRating != null ? `${data.avgMovieRating.toFixed(1)}/10` : '—'}
              />
              <Stat
                label="Avg Food Rating"
                value={data.avgFoodRating != null ? `${data.avgFoodRating.toFixed(1)}/10` : '—'}
              />
              <Stat
                label="Total Budget"
                value={data.totalBudget > 0 ? `$${data.totalBudget.toLocaleString()}` : '—'}
              />
              <Stat
                label="Total Days Traveled"
                value={data.totalTripDays > 0 ? `${data.totalTripDays}d` : '—'}
              />
              {data.topMoods.length > 0 && (
                <>
                  <Stat
                    label="Top Mood"
                    value={MOODS.find((m) => m.id === data.topMoods[0].id)?.label ?? data.topMoods[0].id}
                  />
                  <Stat
                    label="Avg Meal Price"
                    value={data.avgMealPrice != null ? `$${data.avgMealPrice.toFixed(2)}` : '—'}
                  />
                </>
              )}
            </div>
          </Tile>
        </div>

        {/* ── Unread notification prompt ───────────────────────── */}
        {unreadCount > 0 && (
          <motion.div variants={item}>
            <GlassCard className="flex items-center gap-3 border border-accent/20 bg-accent/[0.03]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent-soft">
                <IconBell width={17} height={17} />
              </div>
              <p className="flex-1 text-sm text-white/70">
                You have <span className="font-medium text-white">{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</span>.
              </p>
            </GlassCard>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
