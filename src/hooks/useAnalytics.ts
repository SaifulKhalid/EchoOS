import { useMemo } from 'react';
import { useMovies } from './useMovies';
import { useFood } from './useFood';
import { useTravel } from './useTravel';
import { useNotes } from './useNotes';
import { useWishlist } from './useWishlist';
import { dateToMillis } from '@/utils/dates';
import type { MoodId, MemoryCategory } from '@/config/constants';

// ── Types ───────────────────────────────────────────────────

export interface AnalyticsData {
  // Entry counts
  counts: Record<MemoryCategory, number>;
  totalEntries: number;

  // Ratings
  avgMovieRating: number | null;
  avgFoodRating: number | null;
  avgTravelRating: number | null;

  // Top genres (movies)
  topGenres: { name: string; count: number }[];

  // Mood distribution
  moodCounts: Partial<Record<MoodId, number>>;
  topMoods: { id: MoodId; count: number }[];

  // Food insights
  cuisineCounts: { name: string; count: number }[];
  avgMealPrice: number | null;

  // Movie insights
  topLanguages: { name: string; count: number }[];

  // Travel insights
  totalBudget: number;
  avgTripDuration: number | null;
  totalTripDays: number;

  // Monthly activity (current year)
  monthlyActivity: { month: number; count: number }[];

  // Wishlist
  wishlistDone: number;
  wishlistTotal: number;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i);

/**
 * Derives all analytics and insights from the cached collection data.
 * All values are computed synchronously via useMemo — no extra Firestore reads.
 */
export function useAnalytics() {
  const movies = useMovies();
  const food = useFood();
  const travel = useTravel();
  const notes = useNotes();
  const wishlist = useWishlist();

  const isLoading =
    movies.isLoading || food.isLoading || travel.isLoading || notes.isLoading || wishlist.isLoading;

  const error = movies.error || food.error || travel.error || notes.error || wishlist.error;

  const data = useMemo<AnalyticsData>(() => {
    const movieData = movies.data ?? [];
    const foodData = food.data ?? [];
    const travelData = travel.data ?? [];
    const noteData = notes.data ?? [];
    const wishlistData = wishlist.data ?? [];

    // ── Entry counts ──────────────────────────────────────────
    const counts: Record<string, number> = {
      movie: movieData.length,
      food: foodData.length,
      travel: travelData.length,
      note: noteData.length,
      wishlist: wishlistData.length,
    };

    // ── Average ratings ───────────────────────────────────────
    const ratedMovies = movieData.filter((m) => m.rating != null);
    const avgMovieRating =
      ratedMovies.length > 0
        ? ratedMovies.reduce((s, m) => s + (m.rating ?? 0), 0) / ratedMovies.length
        : null;

    const ratedFood = foodData.filter((f) => f.rating != null);
    const avgFoodRating =
      ratedFood.length > 0
        ? ratedFood.reduce((s, f) => s + (f.rating ?? 0), 0) / ratedFood.length
        : null;

    const ratedTravel = travelData.filter((t) => t.rating != null);
    const avgTravelRating =
      ratedTravel.length > 0
        ? ratedTravel.reduce((s, t) => s + (t.rating ?? 0), 0) / ratedTravel.length
        : null;

    // ── Top genres (movies) ───────────────────────────────────
    const genreCounts = new Map<string, number>();
    for (const m of movieData) {
      for (const g of m.genres ?? []) {
        genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
      }
    }
    const topGenres = [...genreCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Mood distribution ─────────────────────────────────────
    const moodCounts = new Map<string, number>();
    const allEntries = [...movieData, ...foodData, ...travelData, ...noteData, ...wishlistData];
    for (const e of allEntries) {
      if (e.mood) {
        moodCounts.set(e.mood, (moodCounts.get(e.mood) ?? 0) + 1);
      }
    }
    const topMoods = [...moodCounts.entries()]
      .map(([id, count]) => ({ id: id as MoodId, count }))
      .sort((a, b) => b.count - a.count);

    // ── Cuisine counts ────────────────────────────────────────
    const cuisineMap = new Map<string, number>();
    for (const f of foodData) {
      if (f.cuisine) {
        cuisineMap.set(f.cuisine, (cuisineMap.get(f.cuisine) ?? 0) + 1);
      }
    }
    const cuisineCounts = [...cuisineMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // ── Average meal price ────────────────────────────────────
    const pricedMeals = foodData.filter((f) => f.price != null);
    const avgMealPrice =
      pricedMeals.length > 0
        ? pricedMeals.reduce((s, f) => s + (f.price ?? 0), 0) / pricedMeals.length
        : null;

    // ── Top languages (movies) ────────────────────────────────
    const langCounts = new Map<string, number>();
    for (const m of movieData) {
      if (m.language) {
        langCounts.set(m.language, (langCounts.get(m.language) ?? 0) + 1);
      }
    }
    const topLanguages = [...langCounts.entries()]
      .map(([name, count]) => ({ name: name.toUpperCase(), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ── Travel insights ───────────────────────────────────────
    const totalBudget = travelData.reduce((s, t) => s + (t.budget ?? 0), 0);
    const tripsWithDuration = travelData.filter((t) => t.durationDays != null);
    const avgTripDuration =
      tripsWithDuration.length > 0
        ? tripsWithDuration.reduce((s, t) => s + (t.durationDays ?? 0), 0) / tripsWithDuration.length
        : null;
    const totalTripDays = travelData.reduce((s, t) => s + (t.durationDays ?? 0), 0);

    // ── Monthly activity (current year) ───────────────────────
    const currentYear = new Date().getFullYear();
    const monthlyCounts = new Map<number, number>();
    for (const month of MONTHS) monthlyCounts.set(month, 0);

    for (const e of allEntries) {
      const obj = e as unknown as Record<string, unknown>;
      const raw = 'watchDate' in e ? obj.watchDate : 'date' in e ? obj.date : 'startDate' in e ? obj.startDate : null;
      const date = dateToMillis(raw as Parameters<typeof dateToMillis>[0]);
      if (date) {
        const d = new Date(date);
        if (d.getFullYear() === currentYear) {
          monthlyCounts.set(d.getMonth(), (monthlyCounts.get(d.getMonth()) ?? 0) + 1);
        }
      }
    }
    const monthlyActivity = MONTHS.map((month) => ({
      month,
      count: monthlyCounts.get(month) ?? 0,
    }));

    // ── Wishlist progress ─────────────────────────────────────
    const wishlistDone = wishlistData.filter((w) => w.done).length;
    const wishlistTotal = wishlistData.length;

    return {
      counts: counts as Record<MemoryCategory, number>,
      totalEntries: allEntries.length,
      avgMovieRating,
      avgFoodRating,
      avgTravelRating,
      topGenres,
      moodCounts: Object.fromEntries(moodCounts) as Partial<Record<MoodId, number>>,
      topMoods,
      cuisineCounts,
      avgMealPrice,
      topLanguages,
      totalBudget,
      avgTripDuration,
      totalTripDays,
      monthlyActivity,
      wishlistDone,
      wishlistTotal,
    };
  }, [movies.data, food.data, travel.data, notes.data, wishlist.data]);

  return { ...data, isLoading, error } as AnalyticsData & { isLoading: boolean; error: unknown };
}
