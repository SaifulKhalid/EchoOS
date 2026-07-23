/**
 * memoryRetriever.ts
 *
 * STEP 2 of the Memory Intelligence Layer.
 * Fetches only the memory categories relevant to the detected intent,
 * never the entire database. Supports optional time-range and limit
 * parameters for efficient queries.
 */

import { auth } from '@/firebase/config';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { MemoryCategory } from '@/config/constants';
import type { MovieEntry, FoodEntry, TravelEntry, NoteEntry, WishlistEntry } from '@/types';

export interface MemoryBundle {
  movies: MovieEntry[];
  food: FoodEntry[];
  travel: TravelEntry[];
  notes: NoteEntry[];
  wishlist: WishlistEntry[];
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

const CATEGORY_COLLECTION: Record<MemoryCategory, string> = {
  movie: 'movies',
  food: 'food',
  travel: 'travel',
  note: 'notes',
  wishlist: 'wishlist',
};

// ── Fetch helpers ──────────────────────────────────────────

/**
 * Fetch entries for a single category with configurable limits.
 */
async function fetchCategory<T>(
  uid: string,
  category: MemoryCategory,
  options: RetrievalOptions,
): Promise<T[]> {
  const collectionName = CATEGORY_COLLECTION[category];
  if (!collectionName) return [];

  const limitCount = options.limitPerCategory ?? 50;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Firestore QueryConstraint[] type
  const qConstraints: any[] = [orderBy('createdAt', 'desc')];

  // Apply time range if provided
  if (options.since) {
    qConstraints.push(where('createdAt', '>=', options.since));
  }
  if (options.until) {
    qConstraints.push(where('createdAt', '<=', options.until));
  }

  qConstraints.push(limit(limitCount));

  const q = query(collection(db, 'users', uid, collectionName), ...qConstraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
}

// ── Category fetcher mapping ───────────────────────────────

type FetchFn<T> = (uid: string, opts: RetrievalOptions) => Promise<T[]>;

const CATEGORY_FETCHERS: Record<MemoryCategory, FetchFn<MovieEntry | FoodEntry | TravelEntry | NoteEntry | WishlistEntry>> = {
  movie: (uid, opts) => fetchCategory<MovieEntry>(uid, 'movie', opts),
  food: (uid, opts) => fetchCategory<FoodEntry>(uid, 'food', opts),
  travel: (uid, opts) => fetchCategory<TravelEntry>(uid, 'travel', opts),
  note: (uid, opts) => fetchCategory<NoteEntry>(uid, 'note', opts),
  wishlist: (uid, opts) => fetchCategory<WishlistEntry>(uid, 'wishlist', opts),
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
      memories: { movies: [], food: [], travel: [], notes: [], wishlist: [] },
      totalCount: 0,
      categoryCounts: { movie: 0, food: 0, travel: 0, note: 0, wishlist: 0 },
    };
  }

  // Fetch all requested categories in parallel
  const fetchPromises = categories.map(async (cat) => {
    const items = await CATEGORY_FETCHERS[cat](uid, { categories, limitPerCategory, since, until });
    return { category: cat, items };
  });

  const results = await Promise.all(fetchPromises);

  // Build the bundle
  const memories: MemoryBundle = {
    movies: [],
    food: [],
    travel: [],
    notes: [],
    wishlist: [],
  };

  const categoryCounts: Record<MemoryCategory, number> = {
    movie: 0,
    food: 0,
    travel: 0,
    note: 0,
    wishlist: 0,
  };

  for (const { category, items } of results) {
    const collectionKey = category === 'note' ? 'notes' : `${category}s` as keyof MemoryBundle;
    if (collectionKey in memories) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic key assignment
      (memories as Record<string, unknown[]>)[collectionKey] = items;
    }
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
  const allCategories: MemoryCategory[] = ['movie', 'food', 'travel', 'note', 'wishlist'];
  return retrieveMemories(uid, { categories: allCategories, limitPerCategory: 100 });
}
