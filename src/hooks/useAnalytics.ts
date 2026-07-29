import { useMemo } from 'react';
import { useMovies } from './useMovies';
import { useFood } from './useFood';
import { useTravel } from './useTravel';
import { useNotes } from './useNotes';
import { useWishlist } from './useWishlist';
import { analyzePatterns } from '@/memory';
import type { MoodId, MemoryCategory } from '@/config/constants';

export interface AnalyticsData {
  counts: Record<MemoryCategory, number>;
  totalEntries: number;
  avgMovieRating: number | null;
  avgFoodRating: number | null;
  avgTravelRating: number | null;
  topGenres: { name: string; count: number }[];
  moodCounts: Partial<Record<MoodId, number>>;
  topMoods: { id: MoodId; count: number }[];
  cuisineCounts: { name: string; count: number }[];
  avgMealPrice: number | null;
  topLanguages: { name: string; count: number }[];
  totalBudget: number;
  avgTripDuration: number | null;
  totalTripDays: number;
  monthlyActivity: { month: number; count: number }[];
  wishlistDone: number;
  wishlistTotal: number;
}

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

    const patterns = analyzePatterns({
      movies: movieData,
      food: foodData,
      travel: travelData,
      notes: noteData,
      wishlist: wishlistData,
    });

    const { userProfile, frequencies, distributions } = patterns;

    return {
      counts: userProfile.entryCounts,
      totalEntries: userProfile.totalEntries,
      avgMovieRating: userProfile.avgMovieRating,
      avgFoodRating: userProfile.avgFoodRating,
      avgTravelRating: userProfile.avgTravelRating,
      topGenres: userProfile.topGenres,
      cuisineCounts: userProfile.topCuisines,
      avgMealPrice: userProfile.avgMealPrice,
      topLanguages: userProfile.topLanguages,
      totalBudget: userProfile.totalBudget,
      avgTripDuration: userProfile.avgTripDuration,
      totalTripDays: userProfile.totalTripDays,
      monthlyActivity: distributions.monthlyActivity,
      wishlistDone: frequencies.wishlistDone,
      wishlistTotal: frequencies.wishlistTotal,
      moodCounts: Object.fromEntries(
        distributions.moodDistribution.map((m) => [m.name, m.count]),
      ) as Partial<Record<MoodId, number>>,
      topMoods: distributions.moodDistribution.map((m) => ({
        id: m.name as MoodId,
        count: m.count,
      })),
    };
  }, [movies.data, food.data, travel.data, notes.data, wishlist.data]);

  return { ...data, isLoading, error } as AnalyticsData & { isLoading: boolean; error: unknown };
}
