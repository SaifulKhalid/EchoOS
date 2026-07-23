/**
 * _legacy.ts
 *
 * Legacy exports for backward compatibility.
 * These functions are deprecated — use the memory/ layer instead.
 */

import type { MemoryBundle } from '@/memory';

export interface MemoryInsights {
  totalMovies: number;
  totalFood: number;
  totalTravel: number;
  totalNotes: number;
  totalWishlist: number;
  totalEntries: number;
  topGenres: { name: string; count: number }[];
  topCuisines: { name: string; count: number }[];
  topDestinations: { name: string; count: number }[];
  avgMovieRating: number | null;
  avgFoodRating: number | null;
  avgTravelRating: number | null;
  completedWishlist: number;
  totalTripDays: number;
  favoriteDirectors: string[];
  favoriteActors: string[];
  moodDistribution: { mood: string; count: number }[];
}

/**
 * @deprecated Use `analyzePatterns` from `@/memory` instead.
 */
export function computeMemoryInsights(memories: MemoryBundle): MemoryInsights {
  const movies = memories.movies;
  const food = memories.food;
  const travel = memories.travel;
  const notes = memories.notes;
  const wishlist = memories.wishlist;

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

  const destCounts = new Map<string, number>();
  for (const t of travel) {
    destCounts.set(t.destination, (destCounts.get(t.destination) ?? 0) + 1);
  }
  const topDestinations = [...destCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

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

  const moodCounts = new Map<string, number>();
  const allEntries = [...movies, ...food, ...travel, ...notes, ...wishlist];
  for (const e of allEntries) {
    if (e.mood) {
      moodCounts.set(e.mood, (moodCounts.get(e.mood) ?? 0) + 1);
    }
  }
  const moodDistribution = [...moodCounts.entries()]
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalMovies: movies.length,
    totalFood: food.length,
    totalTravel: travel.length,
    totalNotes: notes.length,
    totalWishlist: wishlist.length,
    totalEntries: allEntries.length,
    topGenres,
    topCuisines,
    topDestinations,
    avgMovieRating,
    avgFoodRating,
    avgTravelRating,
    completedWishlist: wishlist.filter((w) => w.done).length,
    totalTripDays: travel.reduce((s, t) => s + (t.durationDays ?? 0), 0),
    favoriteDirectors,
    favoriteActors,
    moodDistribution,
  };
}

/**
 * @deprecated Use `buildStructuredContext` from `@/memory` instead.
 */
export function formatInsights(insights: MemoryInsights): string {
  const lines: string[] = ['## Computed Patterns & Statistics'];

  if (insights.totalEntries > 0) {
    lines.push(`Total memories logged: ${insights.totalEntries}`);
    lines.push(`- Movies: ${insights.totalMovies} | Food: ${insights.totalFood} | Travel: ${insights.totalTravel} | Notes: ${insights.totalNotes} | Wishlist: ${insights.totalWishlist}`);
  }

  if (insights.topGenres.length > 0) {
    lines.push(`Top movie genres: ${insights.topGenres.map((g) => `${g.name} (${g.count})`).join(', ')}`);
  }

  if (insights.topCuisines.length > 0) {
    lines.push(`Top cuisines: ${insights.topCuisines.map((c) => `${c.name} (${c.count})`).join(', ')}`);
  }

  if (insights.topDestinations.length > 0) {
    lines.push(`Most visited destinations: ${insights.topDestinations.map((d) => `${d.name} (${d.count}x)`).join(', ')}`);
  }

  if (insights.avgMovieRating != null) {
    lines.push(`Average movie rating: ${insights.avgMovieRating.toFixed(1)}/10`);
  }
  if (insights.avgFoodRating != null) {
    lines.push(`Average food rating: ${insights.avgFoodRating.toFixed(1)}/10`);
  }
  if (insights.avgTravelRating != null) {
    lines.push(`Average travel rating: ${insights.avgTravelRating.toFixed(1)}/10`);
  }

  if (insights.favoriteDirectors.length > 0) {
    lines.push(`Favorite directors: ${insights.favoriteDirectors.join(', ')}`);
  }
  if (insights.favoriteActors.length > 0) {
    lines.push(`Favorite actors: ${insights.favoriteActors.join(', ')}`);
  }

  if (insights.moodDistribution.length > 0) {
    lines.push(`Mood distribution: ${insights.moodDistribution.map((m) => `${m.mood} (${m.count})`).join(', ')}`);
  }

  if (insights.completedWishlist > 0 && insights.totalWishlist > 0) {
    const pct = Math.round((insights.completedWishlist / insights.totalWishlist) * 100);
    lines.push(`Wishlist progress: ${pct}% complete (${insights.completedWishlist}/${insights.totalWishlist})`);
  }

  if (insights.totalTripDays > 0) {
    lines.push(`Total days traveled: ${insights.totalTripDays}`);
  }

  return lines.join('\n');
}
