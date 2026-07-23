/**
 * patternAnalyzer.ts
 *
 * STEP 3 of the Memory Intelligence Layer.
 * Computes intelligence from retrieved memories — patterns, trends,
 * correlations, and user profile statistics — before any LLM call.
 *
 * This module is the analytical engine of EchoOS. Every derived insight
 * provides evidence the AI can cite in its responses.
 */

import type { MemoryCategory } from '@/config/constants';
import type { MemoryBundle } from './memoryRetriever';

// ── Types ───────────────────────────────────────────────────

export interface NamedCount {
  name: string;
  count: number;
}

export interface RatingDistribution {
  range: string;
  count: number;
}

export interface MoodRating {
  mood: string;
  avgRating: number;
  count: number;
}

export interface PeriodGenre {
  period: string;
  genres: string[];
}

export interface PatternAnalysis {
  /** High-level user profile summary. */
  userProfile: {
    totalEntries: number;
    entryCounts: Record<MemoryCategory, number>;
    avgMovieRating: number | null;
    avgFoodRating: number | null;
    avgTravelRating: number | null;
    topGenres: NamedCount[];
    topCuisines: NamedCount[];
    topDestinations: NamedCount[];
    favoriteDirectors: string[];
    favoriteActors: string[];
    favoriteDishes: string[];
    averageYearlyActivity: number;
    mostActiveCategory: MemoryCategory | null;
    highestRatedMovie: { title: string; rating: number } | null;
    mostRewatchedMovie: { title: string; count: number } | null;
  };

  /** Temporal trends and preference evolution. */
  trends: {
    oldestMemory: { type: MemoryCategory; title: string } | null;
    newestMemory: { type: MemoryCategory; title: string } | null;
    genreEvolution: PeriodGenre[];
    ratingTrend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
    preferenceEvolution: string[];
    seasonalPreferences: { season: string; topCategory: string }[];
  };

  /** Frequency and cadence metrics. */
  frequencies: {
    watchFrequency: string;
    travelFrequency: string;
    diningFrequency: string;
    rewatchRate: number;
    wishlistCompletionRate: number;
    averageTripsPerYear: number;
    averageMoviesPerYear: number;
  };

  /** Cross-category correlation insights. */
  correlations: {
    moodVsRatings: MoodRating[];
    weekendHabits: string[];
    genreTimeShift: string[];
    travelMoviePattern: string;
    moodToCategory: { mood: string; topCategory: string; count: number }[];
  };

  /** Statistical distributions. */
  distributions: {
    ratingDistribution: RatingDistribution[];
    moodDistribution: NamedCount[];
    yearDistribution: { year: number; count: number }[];
  };

  /** Recent activity snapshot. */
  recentActivity: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
    hasRecentData: boolean;
  };
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Get a numeric timestamp from a FireDate (supports both Timestamp and number).
 */
interface TimestampLike {
  toMillis?: () => number;
}

function getTimestamp(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  if (typeof d === 'object' && d !== null && 'toMillis' in d && typeof (d as TimestampLike).toMillis === 'function') {
    return (d as TimestampLike).toMillis!();
  }
  return Date.now();
}

// ── Main analyzer ──────────────────────────────────────────

/**
 * Analyze patterns, trends, and correlations from a bundle of memories.
 * Returns a comprehensive PatternAnalysis object.
 *
 * This is called BEFORE the Groq request so the context builder can
 * include structured intelligence instead of raw data dumps.
 */
export function analyzePatterns(memories: MemoryBundle): PatternAnalysis {
  const { movies, food, travel, notes, wishlist } = memories;
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

  // ── Combine all entries for global analysis ──────────────
  const allEntries = [
    ...movies.map((e) => ({ ...e, _type: 'movie' as MemoryCategory })),
    ...food.map((e) => ({ ...e, _type: 'food' as MemoryCategory })),
    ...travel.map((e) => ({ ...e, _type: 'travel' as MemoryCategory })),
    ...notes.map((e) => ({ ...e, _type: 'note' as MemoryCategory })),
    ...wishlist.map((e) => ({ ...e, _type: 'wishlist' as MemoryCategory })),
  ];

  // ── Entry counts per category ────────────────────────────
  const entryCounts: Record<MemoryCategory, number> = {
    movie: movies.length,
    food: food.length,
    travel: travel.length,
    note: notes.length,
    wishlist: wishlist.length,
  };

  const totalEntries = allEntries.length;

  // Determine most active category
  let mostActiveCategory: MemoryCategory | null = null;
  let maxCount = 0;
  for (const [cat, count] of Object.entries(entryCounts) as [MemoryCategory, number][]) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveCategory = cat;
    }
  }

  // ── Average ratings ──────────────────────────────────────
  const ratedMovies = movies.filter((m) => m.rating != null);
  const avgMovieRating =
    ratedMovies.length > 0
      ? ratedMovies.reduce((s, m) => s + (m.rating ?? 0), 0) / ratedMovies.length
      : null;

  const ratedFood = food.filter((f) => f.rating != null);
  const avgFoodRating =
    ratedFood.length > 0
      ? ratedFood.reduce((s, f) => s + (f.rating ?? 0), 0) / ratedFood.length
      : null;

  const ratedTravel = travel.filter((t) => t.rating != null);
  const avgTravelRating =
    ratedTravel.length > 0
      ? ratedTravel.reduce((s, t) => s + (t.rating ?? 0), 0) / ratedTravel.length
      : null;

  // ── Highest rated movie ──────────────────────────────────
  let highestRatedMovie: { title: string; rating: number } | null = null;
  if (ratedMovies.length > 0) {
    const sorted = [...ratedMovies].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    highestRatedMovie = { title: sorted[0].title, rating: sorted[0].rating ?? 0 };
  }

  // ── Most rewatched movie ─────────────────────────────────
  const rewatchCounts = new Map<string, number>();
  for (const m of movies) {
    if (m.rewatch) {
      rewatchCounts.set(m.title, (rewatchCounts.get(m.title) ?? 0) + 1);
    }
  }
  let mostRewatchedMovie: { title: string; count: number } | null = null;
  for (const [title, count] of rewatchCounts) {
    if (!mostRewatchedMovie || count > mostRewatchedMovie.count) {
      mostRewatchedMovie = { title, count };
    }
  }

  // ── Top genres ───────────────────────────────────────────
  const genreCounts = new Map<string, number>();
  for (const m of movies) {
    for (const g of m.genres ?? []) {
      genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Top cuisines ─────────────────────────────────────────
  const cuisineCounts = new Map<string, number>();
  for (const f of food) {
    if (f.cuisine) {
      cuisineCounts.set(f.cuisine, (cuisineCounts.get(f.cuisine) ?? 0) + 1);
    }
  }
  const topCuisines = [...cuisineCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── Top destinations ─────────────────────────────────────
  const destCounts = new Map<string, number>();
  for (const t of travel) {
    destCounts.set(t.destination, (destCounts.get(t.destination) ?? 0) + 1);
  }
  const topDestinations = [...destCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── Favorite directors & actors ──────────────────────────
  const directorCounts = new Map<string, number>();
  const actorCounts = new Map<string, number>();
  for (const m of movies) {
    if (m.director) {
      directorCounts.set(m.director, (directorCounts.get(m.director) ?? 0) + 1);
    }
    for (const a of m.cast ?? []) {
      actorCounts.set(a, (actorCounts.get(a) ?? 0) + 1);
    }
  }
  const favoriteDirectors = [...directorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const favoriteActors = [...actorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // ── Favorite dishes ──────────────────────────────────────
  const dishCounts = new Map<string, number>();
  for (const f of food) {
    for (const d of f.favoriteDishes ?? []) {
      dishCounts.set(d, (dishCounts.get(d) ?? 0) + 1);
    }
  }
  const favoriteDishes = [...dishCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // ── Oldest & newest memories ─────────────────────────────
  const sortedByDate = [...allEntries].sort(
    (a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt),
  );
  const oldestMemory = sortedByDate.length > 0
    ? {
        type: sortedByDate[0]._type,
        title: extractTitle(sortedByDate[0]),
      }
    : null;
  const newestMemory = sortedByDate.length > 0
    ? {
        type: sortedByDate[sortedByDate.length - 1]._type,
        title: extractTitle(sortedByDate[sortedByDate.length - 1]),
      }
    : null;

  // ── Rating distribution ──────────────────────────────────
  const ratingBuckets = new Map<string, number>();
  for (const m of ratedMovies) {
    const r = m.rating ?? 0;
    const bucket = r >= 9 ? '9-10' : r >= 7 ? '7-8' : r >= 5 ? '5-6' : r >= 3 ? '3-4' : '1-2';
    ratingBuckets.set(bucket, (ratingBuckets.get(bucket) ?? 0) + 1);
  }
  const ratingDistribution = [...ratingBuckets.entries()]
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => {
      const order = ['1-2', '3-4', '5-6', '7-8', '9-10'];
      return order.indexOf(a.range) - order.indexOf(b.range);
    });

  // ── Mood distribution ────────────────────────────────────
  const moodCounts = new Map<string, number>();
  for (const e of allEntries) {
    if (e.mood) {
      moodCounts.set(e.mood, (moodCounts.get(e.mood) ?? 0) + 1);
    }
  }
  const moodDistribution = [...moodCounts.entries()]
    .map(([mood, count]) => ({ name: mood, count }))
    .sort((a, b) => b.count - a.count);

  // ── Year distribution ────────────────────────────────────
  const yearCounts = new Map<number, number>();
  for (const e of allEntries) {
    const ts = getTimestamp(e.createdAt);
    if (ts > 0) {
      const year = new Date(ts).getFullYear();
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
    }
  }
  const yearDistribution = [...yearCounts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  // ── Average yearly activity ──────────────────────────────
  const yearsWithData = yearDistribution.length;
  const averageYearlyActivity = yearsWithData > 0
    ? Math.round(totalEntries / yearsWithData)
    : 0;

  // ── Watch / travel / dining frequency ────────────────────
  const recentMovies = movies.filter(
    (m) => getTimestamp(m.watchDate ?? m.createdAt) > oneYearAgo,
  ).length;
  const watchFrequency =
    recentMovies > 0
      ? `${Math.round(recentMovies / Math.max(1, yearsWithData))} per year`
      : 'No recent activity';

  const recentTravel = travel.filter(
    (t) => getTimestamp(t.startDate ?? t.createdAt) > oneYearAgo,
  ).length;
  const travelFrequency =
    recentTravel > 0
      ? `${Math.round(recentTravel / Math.max(1, yearsWithData))} trips per year`
      : 'No recent trips';

  const recentFood = food.filter(
    (f) => getTimestamp(f.date ?? f.createdAt) > oneYearAgo,
  ).length;
  const diningFrequency =
    recentFood > 0
      ? `${Math.round(recentFood / Math.max(1, yearsWithData))} logged meals per year`
      : 'No recent dining logs';

  // ── Rewatch rate ─────────────────────────────────────────
  const rewatchRate =
    movies.length > 0
      ? Math.round((movies.filter((m) => m.rewatch).length / movies.length) * 100)
      : 0;

  // ── Wishlist completion rate ─────────────────────────────
  const completedWishlist = wishlist.filter((w) => w.done).length;
  const wishlistCompletionRate =
    wishlist.length > 0
      ? Math.round((completedWishlist / wishlist.length) * 100)
      : 0;

  // ── Average trips & movies per year ─────────────────────
  const averageTripsPerYear = yearsWithData > 0
    ? Math.round((travel.length / yearsWithData) * 10) / 10
    : 0;

  const averageMoviesPerYear = yearsWithData > 0
    ? Math.round((movies.length / yearsWithData) * 10) / 10
    : 0;

  // ── Mood vs ratings correlations ─────────────────────────
  const moodRatingMap = new Map<string, { sum: number; count: number }>();
  for (const m of ratedMovies) {
    if (m.mood) {
      const entry = moodRatingMap.get(m.mood) ?? { sum: 0, count: 0 };
      entry.sum += m.rating ?? 0;
      entry.count += 1;
      moodRatingMap.set(m.mood, entry);
    }
  }
  for (const f of ratedFood) {
    if (f.mood) {
      const entry = moodRatingMap.get(f.mood) ?? { sum: 0, count: 0 };
      entry.sum += f.rating ?? 0;
      entry.count += 1;
      moodRatingMap.set(f.mood, entry);
    }
  }
  const moodVsRatings: MoodRating[] = [...moodRatingMap.entries()]
    .map(([mood, { sum, count }]) => ({
      mood,
      avgRating: Math.round((sum / count) * 10) / 10,
      count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);

  // ── Mood to category correlation ─────────────────────────
  const moodCategoryMap = new Map<string, Map<string, number>>();
  for (const e of allEntries) {
    if (e.mood) {
      if (!moodCategoryMap.has(e.mood)) {
        moodCategoryMap.set(e.mood, new Map());
      }
      const catMap = moodCategoryMap.get(e.mood)!;
      catMap.set(e._type, (catMap.get(e._type) ?? 0) + 1);
    }
  }
  const moodToCategory = [...moodCategoryMap.entries()]
    .map(([mood, catMap]) => {
      let topCategory = '';
      let topCount = 0;
      for (const [cat, count] of catMap) {
        if (count > topCount) {
          topCategory = cat;
          topCount = count;
        }
      }
      return { mood, topCategory, count: topCount };
    })
    .sort((a, b) => b.count - a.count);

  // ── Seasonal preferences ─────────────────────────────────
  const seasonData = new Map<string, Map<string, number>>();
  for (const e of allEntries) {
    const ts = getTimestamp(e.createdAt);
    if (ts > 0) {
      const month = new Date(ts).getMonth();
      const season =
        month >= 2 && month <= 4 ? 'spring' :
        month >= 5 && month <= 7 ? 'summer' :
        month >= 8 && month <= 10 ? 'fall' :
        'winter';
      if (!seasonData.has(season)) seasonData.set(season, new Map());
      const catMap = seasonData.get(season)!;
      catMap.set(e._type, (catMap.get(e._type) ?? 0) + 1);
    }
  }
  const seasonalPreferences = [...seasonData.entries()]
    .map(([season, catMap]) => {
      let topCategory = '';
      let topCount = 0;
      for (const [cat, count] of catMap) {
        if (count > topCount) {
          topCategory = cat;
          topCount = count;
        }
      }
      return { season, topCategory };
    })
    .sort((a, b) => {
      const order = ['spring', 'summer', 'fall', 'winter'];
      return order.indexOf(a.season) - order.indexOf(b.season);
    });

  // ── Genre evolution over time ────────────────────────────
  const genreByPeriod = new Map<string, Set<string>>();
  const sortedMovies = [...movies].sort(
    (a, b) => getTimestamp(a.watchDate ?? a.createdAt) - getTimestamp(b.watchDate ?? b.createdAt),
  );
  const chunkSize = Math.max(1, Math.floor(sortedMovies.length / 3));
  for (let i = 0; i < sortedMovies.length; i += chunkSize) {
    const chunk = sortedMovies.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const startDate = new Date(getTimestamp(chunk[0].watchDate ?? chunk[0].createdAt));
    const endDate = new Date(getTimestamp(chunk[chunk.length - 1].watchDate ?? chunk[chunk.length - 1].createdAt));
    const period = `${startDate.getFullYear()}-${endDate.getFullYear()}`;
    const genres = new Set<string>();
    for (const m of chunk) {
      for (const g of m.genres ?? []) {
        genres.add(g);
      }
    }
    genreByPeriod.set(period, genres);
  }
  const genreEvolution = [...genreByPeriod.entries()]
    .map(([period, genres]) => ({ period, genres: [...genres] }));

  // ── Rating trend ─────────────────────────────────────────
  let ratingTrend: 'improving' | 'declining' | 'stable' | 'insufficient_data' = 'insufficient_data';
  if (ratedMovies.length >= 4) {
    const mid = Math.floor(ratedMovies.length / 2);
    const firstHalf = ratedMovies.slice(0, mid);
    const secondHalf = ratedMovies.slice(mid);
    const firstAvg =
      firstHalf.reduce((s, m) => s + (m.rating ?? 0), 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((s, m) => s + (m.rating ?? 0), 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    ratingTrend = diff > 0.5 ? 'improving' : diff < -0.5 ? 'declining' : 'stable';
  }

  // ── Preference evolution descriptions ────────────────────
  const preferenceEvolution: string[] = [];
  if (ratingTrend === 'improving') {
    preferenceEvolution.push('Movie ratings are trending upward — getting more selective or better at picking films.');
  } else if (ratingTrend === 'declining') {
    preferenceEvolution.push('Movie ratings are trending downward — might be in a critical phase or picking riskier films.');
  }
  if (favoriteDirectors.length > 0) {
    preferenceEvolution.push(`${favoriteDirectors[0]} is the most-watched director.`);
  }
  if (topGenres.length > 0) {
    preferenceEvolution.push(`${topGenres[0].name} is the top genre (${topGenres[0].count} films).`);
  }

  // ── Weekend habits ───────────────────────────────────────
  const weekendEntries = allEntries.filter((e) => {
    const ts = getTimestamp(e.createdAt);
    if (ts === 0) return false;
    const day = new Date(ts).getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  });
  const weekendHabits: string[] = [];
  const weekendMovies = weekendEntries.filter((e) => e._type === 'movie').length;
  const weekendFood = weekendEntries.filter((e) => e._type === 'food').length;
  const weekendTravel = weekendEntries.filter((e) => e._type === 'travel').length;
  if (weekendMovies > weekendFood && weekendMovies > weekendTravel) {
    weekendHabits.push('Most weekend activity is movie-related.');
  } else if (weekendFood > weekendMovies && weekendFood > weekendTravel) {
    weekendHabits.push('Most weekend activity involves dining out.');
  } else if (weekendTravel > 0) {
    weekendHabits.push('Weekends often involve travel or trips.');
  }

  // ── Genre time shift (genre evolution description) ───────
  const genreTimeShift: string[] = [];
  if (genreEvolution.length >= 2) {
    const early = genreEvolution[0];
    const late = genreEvolution[genreEvolution.length - 1];
    const newGenres = late.genres.filter((g) => !early.genres.includes(g));
    if (newGenres.length > 0) {
      genreTimeShift.push(
        `New genres emerged: ${newGenres.slice(0, 3).join(', ')}.`,
      );
    }
  }

  // ── Travel-movie pattern ─────────────────────────────────
  let travelMoviePattern = 'No clear travel-movie correlation detected.';
  const travelMonths = new Set(
    travel.map((t) => {
      const ts = getTimestamp(t.startDate ?? t.createdAt);
      return ts > 0 ? new Date(ts).getMonth() : -1;
    }),
  );
  const movieMonths = new Set(
    movies.map((m) => {
      const ts = getTimestamp(m.watchDate ?? m.createdAt);
      return ts > 0 ? new Date(ts).getMonth() : -1;
    }),
  );
  if (travelMonths.size > 0 && movieMonths.size > 0) {
    const overlap = [...travelMonths].filter((m) => m >= 0 && movieMonths.has(m));
    if (overlap.length > Math.min(travelMonths.size, movieMonths.size) * 0.5) {
      travelMoviePattern =
        'Travel and movie watching often happen in the same months — suggesting post-trip relaxation movie sessions.';
    }
  }

  // ── Recent activity ──────────────────────────────────────
  const last7Days = allEntries.filter((e) => getTimestamp(e.createdAt) > now - 7 * 86400000).length;
  const last30Days = allEntries.filter((e) => getTimestamp(e.createdAt) > now - 30 * 86400000).length;
  const last90Days = allEntries.filter((e) => getTimestamp(e.createdAt) > now - 90 * 86400000).length;

  return {
    userProfile: {
      totalEntries,
      entryCounts,
      avgMovieRating,
      avgFoodRating,
      avgTravelRating,
      topGenres,
      topCuisines,
      topDestinations,
      favoriteDirectors,
      favoriteActors,
      favoriteDishes,
      averageYearlyActivity,
      mostActiveCategory,
      highestRatedMovie,
      mostRewatchedMovie,
    },
    trends: {
      oldestMemory,
      newestMemory,
      genreEvolution,
      ratingTrend,
      preferenceEvolution,
      seasonalPreferences,
    },
    frequencies: {
      watchFrequency,
      travelFrequency,
      diningFrequency,
      rewatchRate,
      wishlistCompletionRate,
      averageTripsPerYear,
      averageMoviesPerYear,
    },
    correlations: {
      moodVsRatings,
      weekendHabits,
      genreTimeShift,
      travelMoviePattern,
      moodToCategory,
    },
    distributions: {
      ratingDistribution,
      moodDistribution,
      yearDistribution,
    },
    recentActivity: {
      last7Days,
      last30Days,
      last90Days,
      hasRecentData: last90Days > 0,
    },
  };
}

// ── Internal helpers ───────────────────────────────────────

function extractTitle(entry: { title?: string; restaurant?: string; destination?: string; text?: string }): string {
  if (entry.title) return entry.title;
  if (entry.restaurant) return entry.restaurant;
  if (entry.destination) return entry.destination;
  if (entry.text) return entry.text.slice(0, 60);
  return 'Untitled';
}
