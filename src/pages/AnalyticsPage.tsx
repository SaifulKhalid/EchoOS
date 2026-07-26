import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconAnalytics, IconAlertTriangle } from '@/components/ui/icons';
import { useAnalytics } from '@/hooks/useAnalytics';
import { MOODS, MONTH_ABBREVIATIONS } from '@/config/constants';

const MOOD_COLORS: Record<string, string> = {
  joy: '#ffd166',
  calm: '#4fd6e6',
  love: '#ff7eb6',
  sad: '#7c9cff',
  awe: '#b98bff',
  neutral: '#9aa0ac',
};

/**
 * Analytics page — charts and insights drawn entirely from the user's
 * own memories. All values are computed client-side from cached data.
 */
export default function AnalyticsPage() {
  const data = useAnalytics();

  if (data.isLoading) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Your memories, in numbers." />
        <LoadingState />
      </>
    );
  }

  if (data.error) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Your memories, in numbers." />
        <GlassCard className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mood-love/15 text-mood-love">
            <IconAlertTriangle />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">Failed to load data</p>
            <p className="mt-1 text-xs text-white/60">{(data.error as Error).message || 'An unexpected error occurred.'}</p>
          </div>
          <button onClick={() => window.location.reload()} className="btn-ghost text-sm">Retry</button>
        </GlassCard>
      </>
    );
  }

  if (data.totalEntries === 0) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Your memories, in numbers." />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-accent-soft">
            <IconAnalytics width={26} height={26} />
          </div>
          <p className="text-sm text-white/50">No data yet. Start logging memories to see insights here.</p>
        </div>
      </>
    );
  }

  const maxMonthlyCount = Math.max(...data.monthlyActivity.map((m) => m.count), 1);

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Charts and trends drawn entirely from your own memories."
      />

      <div className="space-y-5">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard icon="🎬" label="Movies" value={data.counts.movie} />
          <KpiCard icon="🍽️" label="Meals" value={data.counts.food} />
          <KpiCard icon="✈️" label="Trips" value={data.counts.travel} />
          <KpiCard icon="💭" label="Notes" value={data.counts.note} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard icon="⭐" label="Wishlist Items" value={data.wishlistTotal} badge={data.wishlistDone > 0 ? `${data.wishlistDone} done` : undefined} />
          <KpiCard icon="💰" label="Total Budget" value={`$${data.totalBudget.toLocaleString()}`} />
          <KpiCard icon="📅" label="Total Days Traveled" value={`${data.totalTripDays}d`} />
        </div>

        {/* ── Ratings ── */}
        {[data.avgMovieRating, data.avgFoodRating, data.avgTravelRating].some((r) => r != null) && (
          <GlassCard>
            <h3 className="mb-4 text-sm font-medium text-white/70">Average Ratings</h3>
            <div className="space-y-3">
              {data.avgMovieRating != null && (
                <RatingBar label="Movies" value={data.avgMovieRating} max={10} />
              )}
              {data.avgFoodRating != null && (
                <RatingBar label="Food" value={data.avgFoodRating} max={10} />
              )}
              {data.avgTravelRating != null && (
                <RatingBar label="Travel" value={data.avgTravelRating} max={10} />
              )}
            </div>
          </GlassCard>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {/* ── Top Genres ── */}
          {data.topGenres.length > 0 && (
            <GlassCard>
              <h3 className="mb-4 text-sm font-medium text-white/70">Top Movie Genres</h3>
              <div className="space-y-2.5">
                {data.topGenres.map((g) => {
                  const pct = (g.count / Math.max(...data.topGenres.map((x) => x.count), 1)) * 100;
                  return (
                    <div key={g.name}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-white/70">{g.name}</span>
                        <span className="text-white/55">{g.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-accent-gradient"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* ── Mood Distribution ── */}
          {data.topMoods.length > 0 && (
            <GlassCard>
              <h3 className="mb-4 text-sm font-medium text-white/70">Mood Distribution</h3>
              <div className="space-y-2.5">
                {data.topMoods.map((m) => {
                  const moodMeta = MOODS.find((x) => x.id === m.id);
                  const pct = (m.count / data.totalEntries) * 100;
                  return (
                    <div key={m.id}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-white/70">{moodMeta?.label ?? m.id}</span>
                        <span className="text-white/55">
                          {Math.round(pct)}% ({m.count})
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: moodMeta?.id
                              ? MOOD_COLORS[moodMeta.id]
                              : '#9aa0ac',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* ── Cuisines ── */}
          {data.cuisineCounts.length > 0 && (
            <GlassCard>
              <h3 className="mb-4 text-sm font-medium text-white/70">Cuisine Preferences</h3>
              <div className="space-y-2.5">
                {data.cuisineCounts.map((c) => {
                  const pct = (c.count / Math.max(...data.cuisineCounts.map((x) => x.count), 1)) * 100;
                  return (
                    <div key={c.name}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-white/70">{c.name}</span>
                        <span className="text-white/55">{c.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-mood-joy"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* ── Languages ── */}
          {data.topLanguages.length > 0 && (
            <GlassCard>
              <h3 className="mb-4 text-sm font-medium text-white/70">Movie Languages</h3>
              <div className="space-y-2.5">
                {data.topLanguages.map((l) => {
                  const pct = (l.count / Math.max(...data.topLanguages.map((x) => x.count), 1)) * 100;
                  return (
                    <div key={l.name}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-white/70">{l.name}</span>
                        <span className="text-white/55">{l.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-accent-soft"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>

        {/* ── Monthly Activity ── */}
        {data.monthlyActivity.some((m) => m.count > 0) && (
          <GlassCard>
            <h3 className="mb-4 text-sm font-medium text-white/70">
              Monthly Activity ({new Date().getFullYear()})
            </h3>
            <div className="flex items-end gap-1.5 sm:gap-2.5">
              {data.monthlyActivity.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(m.count / maxMonthlyCount) * 120}px` }}
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
          </GlassCard>
        )}

        {/* ── Extra stats card ── */}
        <GlassCard>
          <h3 className="mb-3 text-sm font-medium text-white/70">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <Stat label="Total Entries" value={data.totalEntries} />
            <Stat label="Total Budget" value={`$${data.totalBudget.toLocaleString()}`} />
            <Stat label="Avg Meal Price" value={data.avgMealPrice != null ? `$${data.avgMealPrice.toFixed(2)}` : '—'} />
            <Stat label="Avg Trip Duration" value={data.avgTripDuration != null ? `${data.avgTripDuration.toFixed(1)} days` : '—'} />
            <Stat label="Wishlist Progress" value={data.wishlistTotal > 0 ? `${Math.round((data.wishlistDone / data.wishlistTotal) * 100)}%` : '—'} />
            <Stat label="Total Days Traveled" value={`${data.totalTripDays}d`} />
            <Stat label="Avg Movie Rating" value={data.avgMovieRating != null ? `${data.avgMovieRating.toFixed(1)}/10` : '—'} />
            <Stat label="Avg Food Rating" value={data.avgFoodRating != null ? `${data.avgFoodRating.toFixed(1)}/10` : '—'} />
          </div>
        </GlassCard>
      </div>
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

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
        <span className="mt-1.5 rounded-full bg-mood-calm/15 px-2 py-0.5 text-[10px] text-mood-calm">
          {badge}
        </span>
      )}
    </GlassCard>
  );
}

function RatingBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/70">{label}</span>
        <span className="text-white/50">
          {value.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            pct > 75
              ? 'bg-mood-joy'
              : pct > 50
                ? 'bg-accent'
                : pct > 25
                  ? 'bg-accent-soft'
                  : 'bg-white/30'
          }`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-white/70">{value}</p>
      <p className="mt-0.5 text-white/55">{label}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-32 rounded-2xl" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    </div>
  );
}
