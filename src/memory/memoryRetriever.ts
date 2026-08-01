/**
 * memoryRetriever.ts
 *
 * STEP 2 of the Memory Intelligence Layer.
 * Fetches only the memory categories relevant to the detected intent,
 * never the entire database. Supports optional time-range and limit
 * parameters for efficient retrieval.
 *
 * Reads through the MemoryRepository abstraction (ADR-0001) — never
 * touches Firestore directly — so the same code path serves Firestore
 * today and the Google Drive + IndexedDB mirror in a later phase.
 */

import { getRepository } from '@/services/memory';
import type { MemoryCategory } from '@/config/constants';
import type { MovieEntry, FoodEntry, TravelEntry, NoteEntry, WishlistEntry, GoalEntry } from '@/types';

export interface MemoryBundle {
  movies: MovieEntry[];
  food: FoodEntry[];
  travel: TravelEntry[];
  notes: NoteEntry[];
  wishlist: WishlistEntry[];
  goals: GoalEntry[];
}

export interface RetrievalResult {
  memories: MemoryBundle;
  totalCount: number;
  categoryCounts: Record<MemoryCategory, number>;
}

export interface RetrievalOptions {
  /** Which categories to fetch. If empty, fetches nothing. */
  categories?: MemoryCategory[];
  /** Maximum items per category. Default 50. */
  limitPerCategory?: number;
  /** Optional time range filter (epoch ms start). */
  since?: number;
  /** Optional time range filter (epoch ms end). */
  until?: number;
}

// ── Category → bundle key mapping ───────────────────────────
const CATEGORY_BUNDLE_KEY: Record<MemoryCategory, keyof MemoryBundle> = {
  movie: 'movies',
  food: 'food',
  travel: 'travel',
  note: 'notes',
  wishlist: 'wishlist',
  goal: 'goals',
};

// ── Main retriever ─────────────────────────────────────────

/**
 * Retrieve memories relevant to the detected intent.
 *
 * Only fetches categories specified in `categories`. If no categories
 * are provided, an empty bundle is returned (caller should use the
 * intent's default categories).
 *
 * @param uid - Firebase user ID
 * @param options - Retrieval options (categories, limits, time range)
 * @returns A RetrievalResult with the fetched memories and counts
 */
export async function retrieveMemories(
  uid: string,
  options: RetrievalOptions = {},
): Promise<RetrievalResult> {
  const {
    categories = [],
    limitPerCategory = 50,
    since,
    until,
  } = options;

  if (categories.length === 0) {
    return {
      memories: { movies: [], food: [], travel: [], notes: [], wishlist: [], goals: [] },
      totalCount: 0,
      categoryCounts: { movie: 0, food: 0, travel: 0, note: 0, wishlist: 0, goal: 0 },
    };
  }

  // Fetch all requested categories in parallel through the repository.
  const results = await Promise.all(
    categories.map(async (cat) => ({
      category: cat,
      items: await getRepository(cat).retrieve(uid, {
        since,
        until,
        limitPerCategory,
      }),
    })),
  );

  // Build the bundle. Fresh arrays every call — never reuse module-level
  // arrays, or aliasing across concurrent retrievals would corrupt results.
  const memories: MemoryBundle = {
    movies: [],
    food: [],
    travel: [],
    notes: [],
    wishlist: [],
    goals: [],
  };
  const categoryCounts: Record<MemoryCategory, number> = {
    movie: 0,
    food: 0,
    travel: 0,
    note: 0,
    wishlist: 0,
    goal: 0,
  };

  for (const { category, items } of results) {
    (memories as unknown as Record<string, unknown[]>)[CATEGORY_BUNDLE_KEY[category]] = items;
    categoryCounts[category] = items.length;
  }

  const totalCount = Object.values(categoryCounts).reduce((sum, c) => sum + c, 0);

  return {
    memories,
    totalCount,
    categoryCounts,
  };
}

/**
 * Fetch all memories across every category (for reflection / story generation
 * intents that need the full picture).
 *
 * @deprecated Use retrieveMemories with specific categories instead.
 */
export async function fetchAllMemories(uid: string): Promise<RetrievalResult> {
  const allCategories: MemoryCategory[] = ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'];
  return retrieveMemories(uid, { categories: allCategories, limitPerCategory: 100 });
}
