import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnalytics } from './useAnalytics';
import type { MovieEntry, FoodEntry, TravelEntry, NoteEntry, WishlistEntry } from '@/types';

// ── Mock all 5 collection hooks ────────────────────────────

let mockMovies: MovieEntry[] = [];
let mockFood: FoodEntry[] = [];
let mockTravel: TravelEntry[] = [];
let mockNotes: NoteEntry[] = [];
let mockWishlist: WishlistEntry[] = [];
let mockLoading = false;

vi.mock('./useMovies', () => ({
  useMovies: () => ({ data: mockMovies, isLoading: mockLoading }),
}));
vi.mock('./useFood', () => ({
  useFood: () => ({ data: mockFood, isLoading: mockLoading }),
}));
vi.mock('./useTravel', () => ({
  useTravel: () => ({ data: mockTravel, isLoading: mockLoading }),
}));
vi.mock('./useNotes', () => ({
  useNotes: () => ({ data: mockNotes, isLoading: mockLoading }),
}));
vi.mock('./useWishlist', () => ({
  useWishlist: () => ({ data: mockWishlist, isLoading: mockLoading }),
}));

// ── Helpers ─────────────────────────────────────────────────
// Use Record<string, unknown> to avoid TS2783 (duplicate property)
// when Partial<> intersects with a required field on the spread object.

function movie(overrides: Record<string, unknown>): MovieEntry {
  return {
    id: `movie-${Math.random()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tmdbId: 0,
    genres: [],
    title: '',
    ...overrides,
  } as unknown as MovieEntry;
}

function food(overrides: Record<string, unknown>): FoodEntry {
  return {
    id: `food-${Math.random()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    restaurant: '',
    ...overrides,
  } as unknown as FoodEntry;
}

function travel(overrides: Record<string, unknown>): TravelEntry {
  return {
    id: `travel-${Math.random()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    destination: '',
    ...overrides,
  } as unknown as TravelEntry;
}

function note(overrides: Record<string, unknown>): NoteEntry {
  return {
    id: `note-${Math.random()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    type: 'thought',
    text: '',
    ...overrides,
  } as unknown as NoteEntry;
}

function wishlist(overrides: Record<string, unknown>): WishlistEntry {
  return {
    id: `wishlist-${Math.random()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    category: 'movie',
    title: '',
    ...overrides,
  } as unknown as WishlistEntry;
}

// ── Tests ───────────────────────────────────────────────────

describe('useAnalytics', () => {
  beforeEach(() => {
    // Start with empty data for each test
    mockMovies = [];
    mockFood = [];
    mockTravel = [];
    mockNotes = [];
    mockWishlist = [];
    mockLoading = false;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Loading state ──────────────────────────────────────────

  it('reports isLoading when any collection is loading', () => {
    mockLoading = true;
    const { result } = renderHook(() => useAnalytics());
    expect(result.current.isLoading).toBe(true);
  });

  it('reports isLoading false when all collections are loaded', () => {
    const { result } = renderHook(() => useAnalytics());
    expect(result.current.isLoading).toBe(false);
  });

  // ── Empty data ─────────────────────────────────────────────

  it('returns zero counts and null averages with no data', () => {
    const { result } = renderHook(() => useAnalytics());

    expect(result.current.totalEntries).toBe(0);
    expect(result.current.counts.movie).toBe(0);
    expect(result.current.counts.food).toBe(0);
    expect(result.current.counts.travel).toBe(0);
    expect(result.current.counts.note).toBe(0);
    expect(result.current.counts.wishlist).toBe(0);
    expect(result.current.avgMovieRating).toBeNull();
    expect(result.current.avgFoodRating).toBeNull();
    expect(result.current.avgTravelRating).toBeNull();
    expect(result.current.totalBudget).toBe(0);
    expect(result.current.totalTripDays).toBe(0);
    expect(result.current.wishlistDone).toBe(0);
    expect(result.current.wishlistTotal).toBe(0);
  });

  // ── Entry counts ───────────────────────────────────────────

  it('counts entries per category', () => {
    mockMovies = [movie({ title: 'A' }), movie({ title: 'B' })];
    mockFood = [food({ restaurant: 'X' })];
    mockTravel = [travel({ destination: 'Y' })];
    mockNotes = [note({ text: 'Z' })];
    mockWishlist = [wishlist({ title: 'W' }), wishlist({ title: 'V' })];

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.counts.movie).toBe(2);
    expect(result.current.counts.food).toBe(1);
    expect(result.current.counts.travel).toBe(1);
    expect(result.current.counts.note).toBe(1);
    expect(result.current.counts.wishlist).toBe(2);
    expect(result.current.totalEntries).toBe(7);
  });

  // ── Average ratings ────────────────────────────────────────

  it('computes average movie rating from rated entries', () => {
    mockMovies = [
      movie({ title: 'A', rating: 8 }),
      movie({ title: 'B', rating: 6 }),
      movie({ title: 'C', rating: undefined }), // unrated should be excluded
    ];

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.avgMovieRating).toBe(7); // (8 + 6) / 2
  });

  it('returns null avgMovieRating when no movies have ratings', () => {
    mockMovies = [
      movie({ title: 'A', rating: undefined }),
      movie({ title: 'B', rating: undefined }),
    ];

    const { result } = renderHook(() => useAnalytics());
    expect(result.current.avgMovieRating).toBeNull();
  });

  it('computes average food rating', () => {
    mockFood = [
      food({ restaurant: 'A', rating: 9 }),
      food({ restaurant: 'B', rating: 5 }),
    ];

    const { result } = renderHook(() => useAnalytics());
    expect(result.current.avgFoodRating).toBe(7);
  });

  it('computes average travel rating', () => {
    mockTravel = [
      travel({ destination: 'A', rating: 10 }),
      travel({ destination: 'B', rating: 8 }),
      travel({ destination: 'C', rating: 6 }),
    ];

    const { result } = renderHook(() => useAnalytics());
    expect(result.current.avgTravelRating).toBe(8);
  });

  // ── Top genres ─────────────────────────────────────────────

  it('computes top genres sorted by frequency', () => {
    mockMovies = [
      movie({ title: 'A', genres: ['Action', 'Sci-Fi'] }),
      movie({ title: 'B', genres: ['Action'] }),
      movie({ title: 'C', genres: ['Drama', 'Sci-Fi'] }),
      movie({ title: 'D', genres: ['Comedy'] }),
      movie({ title: 'E', genres: ['Action'] }),
    ];

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.topGenres).toHaveLength(4);
    expect(result.current.topGenres[0]).toEqual({ name: 'Action', count: 3 });
    expect(result.current.topGenres[1]).toEqual({ name: 'Sci-Fi', count: 2 });
    expect(result.current.topGenres[2]).toEqual({ name: 'Drama', count: 1 });
    expect(result.current.topGenres[3]).toEqual({ name: 'Comedy', count: 1 });
  });

  it('limits top genres to 8', () => {
    const genres = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    mockMovies = genres.map((g, i) =>
      movie({ title: `Movie${i}`, genres: [g] }),
    );

    const { result } = renderHook(() => useAnalytics());
    expect(result.current.topGenres).toHaveLength(8);
  });

  it('returns empty array when no movies have genres', () => {
    mockMovies = [movie({ title: 'A', genres: [] })];
    const { result } = renderHook(() => useAnalytics());
    expect(result.current.topGenres).toEqual([]);
  });

  // ── Mood distribution ─────────────────────────────────────

  it('computes mood distribution across all entries', () => {
    mockMovies = [movie({ title: 'A', mood: 'joy' }), movie({ title: 'B', mood: 'joy' })];
    mockFood = [food({ restaurant: 'X', mood: 'calm' })];
    mockTravel = [travel({ destination: 'Y', mood: 'awe' })];
    mockNotes = [note({ text: 'Z', mood: 'joy' })];

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.moodCounts).toEqual({
      joy: 3,
      calm: 1,
      awe: 1,
    });

    expect(result.current.topMoods[0]).toEqual({ id: 'joy', count: 3 });
  });

  it('handles entries without a mood', () => {
    mockMovies = [movie({ title: 'A', mood: 'joy' }), movie({ title: 'B' })];

    const { result } = renderHook(() => useAnalytics());
    expect(result.current.moodCounts).toEqual({ joy: 1 });
  });

  // ── Cuisine counts ────────────────────────────────────────

  it('computes cuisine counts sorted by frequency', () => {
    mockFood = [
      food({ restaurant: 'A', cuisine: 'Italian' }),
      food({ restaurant: 'B', cuisine: 'Japanese' }),
      food({ restaurant: 'C', cuisine: 'Italian' }),
      food({ restaurant: 'D', cuisine: 'Thai' }),
    ];

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.cuisineCounts[0]).toEqual({ name: 'Italian', count: 2 });
    expect(result.current.cuisineCounts[1]).toEqual({ name: 'Japanese', count: 1 });
    expect(result.current.cuisineCounts[2]).toEqual({ name: 'Thai', count: 1 });
  });

  it('limits cuisine counts to 6', () => {
    const cuisines = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    mockFood = cuisines.map((c, i) =>
      food({ restaurant: `R${i}`, cuisine: c }),
    );

    const { result } = renderHook(() => useAnalytics());
    expect(result.current.cuisineCounts).toHaveLength(6);
  });

  // ── Average meal price ─────────────────────────────────────

  it('computes average meal price', () => {
    mockFood = [
      food({ restaurant: 'A', price: 15 }),
      food({ restaurant: 'B', price: 25 }),
      food({ restaurant: 'C', price: undefined }), // excluded
    ];

    const { result } = renderHook(() => useAnalytics());
    expect(result.current.avgMealPrice).toBe(20);
  });

  it('returns null avgMealPrice when no meals have prices', () => {
    mockFood = [food({ restaurant: 'A' })];
    const { result } = renderHook(() => useAnalytics());
    expect(result.current.avgMealPrice).toBeNull();
  });

  // ── Top languages ──────────────────────────────────────────

  it('computes top languages from movies', () => {
    mockMovies = [
      movie({ title: 'A', language: 'en' }),
      movie({ title: 'B', language: 'ja' }),
      movie({ title: 'C', language: 'en' }),
      movie({ title: 'D', language: 'fr' }),
    ];

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.topLanguages[0]).toEqual({ name: 'EN', count: 2 });
    // JA and FR both have count 1; stable sort preserves Map insertion order (ja before fr)
    expect(result.current.topLanguages[1]).toEqual({ name: 'JA', count: 1 });
    expect(result.current.topLanguages[2]).toEqual({ name: 'FR', count: 1 });
  });

  // ── Travel insights ────────────────────────────────────────

  it('computes total budget across all trips', () => {
    mockTravel = [
      travel({ destination: 'A', budget: 1000 }),
      travel({ destination: 'B', budget: 2500 }),
      travel({ destination: 'C' }), // no budget — excluded from sum
    ];

    const { result } = renderHook(() => useAnalytics());
    expect(result.current.totalBudget).toBe(3500);
  });

  it('computes average trip duration', () => {
    mockTravel = [
      travel({ destination: 'A', durationDays: 7 }),
      travel({ destination: 'B', durationDays: 14 }),
      travel({ destination: 'C' }), // no duration — excluded from avg
    ];

    const { result } = renderHook(() => useAnalytics());
    expect(result.current.avgTripDuration).toBe(10.5);
    expect(result.current.totalTripDays).toBe(21);
  });

  it('returns null avgTripDuration when no trips have duration', () => {
    mockTravel = [travel({ destination: 'A' })];
    const { result } = renderHook(() => useAnalytics());
    expect(result.current.avgTripDuration).toBeNull();
  });

  // ── Monthly activity ───────────────────────────────────────

  it('shows zeros for all months with no current-year data', () => {
    const currentYear = new Date().getFullYear();
    // Use a date from a previous year
    const lastYear = new Date(currentYear - 1, 5, 15).getTime();
    mockMovies = [movie({ title: 'A', watchDate: lastYear })];

    const { result } = renderHook(() => useAnalytics());

    for (const m of result.current.monthlyActivity) {
      expect(m.count).toBe(0);
    }
  });

  it('counts entries per month for the current year', () => {
    const year = new Date().getFullYear();
    const jan15 = new Date(year, 0, 15).getTime();
    const jan20 = new Date(year, 0, 20).getTime();
    const mar10 = new Date(year, 2, 10).getTime();

    mockMovies = [movie({ title: 'A', watchDate: jan15 })];
    mockFood = [food({ restaurant: 'X', date: jan20 })];
    mockTravel = [travel({ destination: 'Y', startDate: mar10 })];

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.monthlyActivity[0].count).toBe(2); // January
    expect(result.current.monthlyActivity[2].count).toBe(1); // March
    // All other months should be 0
    for (let m = 1; m <= 11; m++) {
      if (m !== 2) {
        // Skip March (index 2)
        expect(result.current.monthlyActivity[m].count).toBe(0);
      }
    }
  });

  it('extracts dates from watchDate, date, and startDate fields', () => {
    const year = new Date().getFullYear();
    mockMovies = [movie({ title: 'A', watchDate: new Date(year, 0, 1).getTime() })];
    mockFood = [food({ restaurant: 'X', date: new Date(year, 1, 1).getTime() })];
    mockTravel = [travel({ destination: 'Y', startDate: new Date(year, 2, 1).getTime() })];

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.monthlyActivity[0].count).toBe(1); // Jan
    expect(result.current.monthlyActivity[1].count).toBe(1); // Feb
    expect(result.current.monthlyActivity[2].count).toBe(1); // Mar
  });

  // ── Wishlist progress ──────────────────────────────────────

  it('counts done and total wishlist items', () => {
    mockWishlist = [
      wishlist({ title: 'A', done: true }),
      wishlist({ title: 'B', done: false }),
      wishlist({ title: 'C', done: true }),
      wishlist({ title: 'D' }), // undefined done
    ];

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.wishlistDone).toBe(2);
    expect(result.current.wishlistTotal).toBe(4);
  });

  // ── Complex integration scenario ───────────────────────────

  it('handles a complex real-world scenario', () => {
    const year = new Date().getFullYear();

    mockMovies = [
      movie({ title: 'Inception', genres: ['Action', 'Sci-Fi'], rating: 9, mood: 'awe', watchDate: new Date(year, 0, 15).getTime(), language: 'en' }),
      movie({ title: 'The Matrix', genres: ['Action', 'Sci-Fi'], rating: 8, mood: 'awe', watchDate: new Date(year, 0, 20).getTime(), language: 'en' }),
      movie({ title: 'Lost in Translation', genres: ['Drama'], rating: 7, mood: 'calm', watchDate: new Date(year, 2, 5).getTime(), language: 'ja' }),
      movie({ title: 'Old Movie', genres: ['Classic'], watchDate: new Date(year - 5, 5, 1).getTime() }),
    ];

    mockFood = [
      food({ restaurant: "Joe's", cuisine: 'Italian', price: 25, rating: 8, mood: 'joy', date: new Date(year, 1, 10).getTime() }),
      food({ restaurant: 'Sushi Bar', cuisine: 'Japanese', price: 40, rating: 9, mood: 'calm', date: new Date(year, 1, 25).getTime() }),
      food({ restaurant: 'Unrated', cuisine: 'Thai', price: 15 }),
    ];

    mockTravel = [
      travel({ destination: 'Tokyo', budget: 3000, durationDays: 10, rating: 10, mood: 'awe', startDate: new Date(year, 5, 1).getTime() }),
      travel({ destination: 'Paris', budget: 2000, durationDays: 7, rating: 8, startDate: new Date(year - 1, 6, 1).getTime() }), // last year
    ];

    mockNotes = [
      note({ text: 'Great day!', mood: 'joy' }),
    ];

    mockWishlist = [
      wishlist({ title: 'Visit Patagonia', done: true }),
      wishlist({ title: 'Learn Piano', done: false }),
    ];

    const { result } = renderHook(() => useAnalytics());

    // Entry counts
    expect(result.current.counts.movie).toBe(4);
    expect(result.current.counts.food).toBe(3);
    expect(result.current.counts.travel).toBe(2);
    expect(result.current.counts.note).toBe(1);
    expect(result.current.counts.wishlist).toBe(2);
    expect(result.current.totalEntries).toBe(12);

    // Average ratings
    expect(result.current.avgMovieRating).toBe(8); // (9+8+7)/3, excluding the unrated classic
    expect(result.current.avgFoodRating).toBe(8.5); // (8+9)/2
    expect(result.current.avgTravelRating).toBe(9); // (10+8)/2

    // Top genres (sorted)
    expect(result.current.topGenres[0]).toEqual({ name: 'Action', count: 2 });
    expect(result.current.topGenres[1]).toEqual({ name: 'Sci-Fi', count: 2 });

    // Mood distribution
    expect(result.current.moodCounts).toHaveProperty('awe', 3);
    expect(result.current.moodCounts).toHaveProperty('calm', 2);
    expect(result.current.moodCounts).toHaveProperty('joy', 2);

    // Cuisines
    expect(result.current.cuisineCounts).toHaveLength(3);

    // Average meal price (25+40+15)/3 = 26.666...
    expect(result.current.avgMealPrice).toBeCloseTo(26.67, 1);

    // Travel
    expect(result.current.totalBudget).toBe(5000);
    expect(result.current.avgTripDuration).toBe(8.5); // (10+7)/2
    expect(result.current.totalTripDays).toBe(17);

    // Monthly activity — only current year entries
    const jan = result.current.monthlyActivity[0].count; // Inception + Matrix
    const feb = result.current.monthlyActivity[1].count; // Joe's + Sushi Bar
    const mar = result.current.monthlyActivity[2].count; // Lost in Translation
    expect(jan).toBe(2);
    expect(feb).toBe(2);
    expect(mar).toBe(1);

    // Wishlist
    expect(result.current.wishlistDone).toBe(1);
    expect(result.current.wishlistTotal).toBe(2);
  });
});
