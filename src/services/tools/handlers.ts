/**
 * tools/handlers.ts
 *
 * The 10 EchoOS AI Action handlers. Each is an async function that:
 *   1. Validates / coerces its arguments.
 *   2. Calls the EXISTING Firestore / TMDB service (never touches the DB
 *      directly — it goes through the same code path as the manual forms).
 *   3. Invalidates the right TanStack Query key(s) so list pages refresh live.
 *   4. Returns a ToolResult (status + summary + data) the client feeds back
 *      to Groq and renders as an action card.
 *
 * Every handler receives `(args, ctx)` where ctx carries uid + an invalidate
 * callback. Handlers are pure with respect to React — no hooks, no JSX.
 */

import { searchMovies, getMovieDetails, extractCredits } from '@/services/tmdb/client';
import { genreIdsToNames } from '@/services/tmdb/types';
import { posterUrl, releaseYear } from '@/services/tmdb/images';
import { getRepository } from '@/services/memory';
import { retrieveMemories } from '@/memory';
import { inputValueToMillis } from '@/utils/dates';
import type { MemoryCategory, MoodId } from '@/config/constants';
import type { MovieEntry, FoodEntry, TravelEntry, NoteEntry, WishlistEntry, GoalEntry, GoalCheckIn } from '@/types';
import type { ToolExecutionContext, ToolResult } from './types';

// ── Helpers ─────────────────────────────────────────────────

type Handler = (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<ToolResult>;

function ok(
  tool: string,
  summary: string,
  data?: Record<string, unknown>,
): ToolResult {
  return { tool, status: 'success', summary, data };
}

function fail(tool: string, summary: string, data?: Record<string, unknown>): ToolResult {
  return { tool, status: 'error', summary, data };
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : v == null ? undefined : String(v);
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const arr = v.map((x) => asString(x)).filter((x): x is string => !!x);
    return arr.length > 0 ? arr : undefined;
  }
  // Allow comma-separated string for convenience ("a, b, c").
  const s = asString(v);
  if (s) {
    const arr = s.split(',').map((p) => p.trim()).filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  }
  return undefined;
}

function asMood(v: unknown): MoodId | undefined {
  const s = asString(v)?.toLowerCase();
  if (!s) return undefined;
  // Accept common aliases.
  const alias: Record<string, MoodId> = {
    happy: 'joy', joyful: 'joy', joy: 'joy',
    calm: 'calm', peaceful: 'calm', relaxed: 'calm',
    love: 'love', loved: 'love',
    sad: 'sad', melancholy: 'sad', melancholic: 'sad', blue: 'sad',
    awe: 'awe', awed: 'awe', amazed: 'awe', inspired: 'awe',
    neutral: 'neutral', ok: 'neutral', okay: 'neutral', meh: 'neutral',
  };
  return alias[s];
}

/** Coerce a date argument (ISO string, YYYY-MM-DD, or epoch ms) to epoch ms. */
function asDateMillis(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = asString(v);
  if (!s) return undefined;
  // ISO or YYYY-MM-DD both parse fine via Date.
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

/** Clamp a rating to 0–10 with one decimal. */
function clampRating(v: unknown): number | undefined {
  const n = asNumber(v);
  if (n == null) return undefined;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

// ── 1. searchMovie ──────────────────────────────────────────

const searchMovieHandler: Handler = async (args) => {
  const query = asString(args.query)?.trim();
  if (!query) return fail('searchMovie', 'No movie title provided to search.');

  let results;
  try {
    results = await searchMovies(query);
  } catch (e) {
    return fail('searchMovie', `TMDB search failed: ${(e as Error).message}`);
  }

  if (results.length === 0) {
    return ok('searchMovie', `No movies found for "${query}".`, { query, results: [] });
  }

  // Compact payload for Groq — only the fields it needs to pick one.
  const compact = results.slice(0, 6).map((r) => ({
    tmdbId: r.id,
    title: r.title,
    year: releaseYear(r.release_date),
    genres: genreIdsToNames(r.genre_ids),
    overview: r.overview?.slice(0, 160),
  }));

  return ok('searchMovie', `Found ${results.length} movie(s) for "${query}".`, {
    query,
    results: compact,
  });
};

// ── 2. addMovie ─────────────────────────────────────────────

const addMovieHandler: Handler = async (args, ctx) => {
  const tmdbId = asNumber(args.tmdbId);
  if (tmdbId == null) return fail('addMovie', 'A numeric tmdbId is required.');

  let details;
  try {
    details = await getMovieDetails(tmdbId);
  } catch (e) {
    return fail('addMovie', `Could not fetch movie details: ${(e as Error).message}`);
  }

  const { director, cast } = extractCredits(details);
  const genres = (details.genres ?? []).map((g) => g.name);

  const entry: Omit<MovieEntry, 'id' | 'createdAt' | 'updatedAt'> = {
    tmdbId: details.id,
    title: details.title,
    poster: posterUrl(details.poster_path, 'w342'),
    backdrop: details.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${details.backdrop_path}`
      : undefined,
    genres,
    year: releaseYear(details.release_date),
    language: details.original_language,
    cast,
    director,
    runtime: details.runtime,
    overview: details.overview,
    rating: clampRating(args.rating),
    watchDate: asDateMillis(args.watchDate) ?? inputValueToMillis(new Date().toISOString().slice(0, 10)),
    review: asString(args.review)?.slice(0, 2000),
    mood: asMood(args.mood),
    tags: buildMovieTags(details.title, genres, director, cast),
  };

  let id: string;
  try {
    id = await getRepository<MovieEntry>('movie').add(ctx.uid, entry);
  } catch (e) {
    return fail('addMovie', `Failed to save movie: ${(e as Error).message}`);
  }

  ctx.invalidateQueries([['movies', ctx.uid], ['timeline']]);

  const year = entry.year ? ` (${entry.year})` : '';
  const genreStr = genres.length > 0 ? ` · ${genres.slice(0, 3).join(', ')}` : '';
  return ok('addMovie', `Added ${entry.title}${year} to your movie library.`, {
    id,
    tmdbId: entry.tmdbId,
    title: entry.title,
    year: entry.year,
    genres,
    director,
    // Used by the registry to build the action card subtitle.
    cardSubtitle: [entry.year, genres.slice(0, 3).join(', ')].filter(Boolean).join(' · ') || undefined,
    _genreStr: genreStr,
  });
};

// ── 3. logFood ──────────────────────────────────────────────

const logFoodHandler: Handler = async (args, ctx) => {
  const restaurant = asString(args.restaurant)?.trim();
  if (!restaurant) return fail('logFood', 'A restaurant name is required.');

  const entry: Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'> = {
    restaurant,
    cuisine: asString(args.cuisine),
    price: asNumber(args.price),
    rating: clampRating(args.rating),
    favoriteDishes: asStringArray(args.dishes),
    companions: asStringArray(args.companions),
    notes: asString(args.notes)?.slice(0, 2000),
    mood: asMood(args.mood),
    date: asDateMillis(args.date) ?? Date.now(),
    tags: buildGenericTags(
      restaurant,
      asString(args.cuisine),
      asStringArray(args.dishes),
      asStringArray(args.companions),
    ),
  };

  let id: string;
  try {
    id = await getRepository<FoodEntry>('food').add(ctx.uid, entry);
  } catch (e) {
    return fail('logFood', `Failed to save food entry: ${(e as Error).message}`);
  }

  ctx.invalidateQueries([['food', ctx.uid], ['timeline']]);

  const parts = [
    entry.cuisine,
    entry.rating != null ? `${entry.rating}/10` : undefined,
    entry.companions?.length ? `with ${entry.companions.join(', ')}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  return ok('logFood', `Logged ${entry.restaurant}${parts ? ` · ${parts}` : ''}.`, {
    id,
    restaurant: entry.restaurant,
    cuisine: entry.cuisine,
    rating: entry.rating,
    companions: entry.companions,
  });
};

// ── 4. logTravel ────────────────────────────────────────────

const logTravelHandler: Handler = async (args, ctx) => {
  const destination = asString(args.destination)?.trim();
  if (!destination) return fail('logTravel', 'A destination is required.');

  const startMs = asDateMillis(args.startDate);
  const endMs = asDateMillis(args.endDate);
  // Derive duration if both dates are known but no explicit duration given.
  let durationDays = asNumber(args.durationDays);
  if (durationDays == null && startMs != null && endMs != null && endMs >= startMs) {
    durationDays = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
  }

  const rawStatus = asString(args.status)?.toLowerCase();
  const status: TravelEntry['status'] =
    rawStatus === 'planned' ? 'planned' : rawStatus === 'cancelled' ? 'cancelled' : 'completed';

  const entry: Omit<TravelEntry, 'id' | 'createdAt' | 'updatedAt'> = {
    destination,
    budget: asNumber(args.budget),
    durationDays,
    startDate: startMs,
    endDate: endMs,
    places: asStringArray(args.places),
    companions: asStringArray(args.companions),
    notes: asString(args.notes)?.slice(0, 2000),
    favoriteMoments: asStringArray(args.favoriteMoments),
    rating: clampRating(args.rating),
    status,
    mood: asMood(args.mood),
    tags: buildGenericTags(destination, asStringArray(args.places)?.join(' '), asStringArray(args.companions)),
  };

  let id: string;
  try {
    id = await getRepository<TravelEntry>('travel').add(ctx.uid, entry);
  } catch (e) {
    return fail('logTravel', `Failed to save trip: ${(e as Error).message}`);
  }

  ctx.invalidateQueries([['travel', ctx.uid], ['timeline']]);

  const parts = [
    status === 'planned' ? 'Planned trip' : undefined,
    durationDays != null ? `${durationDays} day${durationDays !== 1 ? 's' : ''}` : undefined,
    entry.companions && entry.companions.length > 0
      ? `with ${entry.companions.join(', ')}`
      : undefined,
    entry.budget != null ? `budget $${entry.budget}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  return ok('logTravel', `Logged ${status === 'planned' ? 'planned trip' : 'trip'} to ${entry.destination}${parts ? ` · ${parts}` : ''}.`, {
    id,
    destination: entry.destination,
    durationDays,
    startDate: startMs,
    endDate: endMs,
    budget: entry.budget,
    companions: entry.companions,
    places: entry.places,
    status,
  });
};

// ── 5. createNote ───────────────────────────────────────────

const createNoteHandler: Handler = async (args, ctx) => {
  const text = asString(args.text)?.trim();
  if (!text) return fail('createNote', 'Note text is required.');

  const rawType = asString(args.type)?.toLowerCase();
  const type: NoteEntry['type'] =
    rawType === 'idea' ? 'idea' : rawType === 'journal' ? 'journal' : 'thought';

  const entry: Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'> = {
    text: text.slice(0, 5000),
    type,
    title: asString(args.title)?.slice(0, 200),
    date: asDateMillis(args.date) ?? Date.now(),
    mood: asMood(args.mood),
    tags: buildGenericTags(asString(args.title), text),
  };

  let id: string;
  try {
    id = await getRepository<NoteEntry>('note').add(ctx.uid, entry);
  } catch (e) {
    return fail('createNote', `Failed to save note: ${(e as Error).message}`);
  }

  ctx.invalidateQueries([['notes', ctx.uid], ['timeline']]);

  return ok('createNote', `Saved your ${type} note.`, { id, type, title: entry.title });
};

// ── 6. updateWishlist ───────────────────────────────────────

const VALID_WISHLIST_CATS = ['movie', 'place', 'food', 'book', 'product'] as const;

const updateWishlistHandler: Handler = async (args, ctx) => {
  const title = asString(args.title)?.trim();
  if (!title) return fail('updateWishlist', 'A wishlist title is required.');

  const rawCat = asString(args.category)?.toLowerCase();
  const category: WishlistEntry['category'] =
    rawCat && (VALID_WISHLIST_CATS as readonly string[]).includes(rawCat)
      ? (rawCat as WishlistEntry['category'])
      : 'product';

  const entry: Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'> = {
    category,
    title,
    note: asString(args.note)?.slice(0, 2000),
    done: false,
  };

  let id: string;
  try {
    id = await getRepository<WishlistEntry>('wishlist').add(ctx.uid, entry);
  } catch (e) {
    return fail('updateWishlist', `Failed to add wishlist item: ${(e as Error).message}`);
  }

  ctx.invalidateQueries([['wishlist', ctx.uid], ['timeline']]);

  return ok('updateWishlist', `Added "${title}" to your wishlist (${category}).`, {
    id,
    title,
    category,
  });
};

// ── 7. markWishlistDone ─────────────────────────────────────

const markWishlistDoneHandler: Handler = async (args, ctx) => {
  const id = asString(args.id);
  if (!id) return fail('markWishlistDone', 'A wishlist item id is required.');

  try {
    await getRepository<WishlistEntry>('wishlist').update(ctx.uid, id, { done: true });
  } catch (e) {
    return fail('markWishlistDone', `Failed to update: ${(e as Error).message}`);
  }
  ctx.invalidateQueries([['wishlist', ctx.uid], ['timeline']]);
  return ok('markWishlistDone', 'Marked wishlist item as done.', { id });
};

// ── 8. updateRating ─────────────────────────────────────────

const updateRatingHandler: Handler = async (args, ctx) => {
  const id = asString(args.id);
  const category = asString(args.category)?.toLowerCase() as MemoryCategory;
  const rating = clampRating(args.rating);
  if (!id) return fail('updateRating', 'An entry id is required.');
  if (rating == null) return fail('updateRating', 'A rating (0–10) is required.');

  const key: MemoryCategory[] = ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'];
  if (!key.includes(category)) {
    return fail('updateRating', `Unknown category "${category}".`);
  }

  try {
    if (category === 'movie') await getRepository<MovieEntry>('movie').update(ctx.uid, id, { rating });
    else if (category === 'food') await getRepository<FoodEntry>('food').update(ctx.uid, id, { rating });
    else if (category === 'travel') await getRepository<TravelEntry>('travel').update(ctx.uid, id, { rating });
    else return fail('updateRating', `Rating is not supported for ${category}.`);
  } catch (e) {
    return fail('updateRating', `Failed to update rating: ${(e as Error).message}`);
  }

  ctx.invalidateQueries([[`${category}`, ctx.uid], ['timeline']]);
  return ok('updateRating', `Set ${category} rating to ${rating}/10.`, { id, category, rating });
};

// ── 9. updateEntry (Generic Natural Edit) ─────────────────────

const updateEntryHandler: Handler = async (args, ctx) => {
  const category = asString(args.category)?.toLowerCase() as MemoryCategory;
  const rawFields = (args.fields && typeof args.fields === 'object' ? args.fields : {}) as Record<string, unknown>;
  let targetId = asString(args.id);

  const valid: MemoryCategory[] = ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'];
  if (!valid.includes(category)) {
    return fail('updateEntry', `Invalid category "${category}".`);
  }

  // If targetId is omitted or "latest", fetch the newest entry in this category
  if (!targetId || targetId === 'latest') {
    const all = await getRepository(category).fetchAll(ctx.uid);
    if (!all || all.length === 0) {
      return fail('updateEntry', `No entries found in ${category} to update.`);
    }
    targetId = all[0].id;
  }

  const patchData: Record<string, unknown> = {};

  if (rawFields.budget != null) patchData.budget = asNumber(rawFields.budget);
  if (rawFields.price != null) patchData.price = asNumber(rawFields.price);
  if (rawFields.rating != null) patchData.rating = clampRating(rawFields.rating);
  if (rawFields.review != null) patchData.review = asString(rawFields.review)?.slice(0, 2000);
  if (rawFields.notes != null) patchData.notes = asString(rawFields.notes)?.slice(0, 2000);
  if (rawFields.restaurant != null) patchData.restaurant = asString(rawFields.restaurant);
  if (rawFields.destination != null) patchData.destination = asString(rawFields.destination);
  if (rawFields.title != null) patchData.title = asString(rawFields.title);
  if (rawFields.cuisine != null) patchData.cuisine = asString(rawFields.cuisine);
  if (rawFields.status != null) patchData.status = asString(rawFields.status);
  if (rawFields.companions != null) patchData.companions = asStringArray(rawFields.companions);
  if (rawFields.dishes != null) patchData.favoriteDishes = asStringArray(rawFields.dishes);
  if (rawFields.places != null) patchData.places = asStringArray(rawFields.places);

  if (Object.keys(patchData).length === 0) {
    return fail('updateEntry', 'No valid fields provided for update.');
  }

  try {
    await getRepository(category).update(ctx.uid, targetId, patchData);
  } catch (e) {
    return fail('updateEntry', `Failed to update ${category} entry: ${(e as Error).message}`);
  }

  ctx.invalidateQueries([[category, ctx.uid], ['timeline']]);
  const updatedSummary = Object.entries(patchData)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join(', ');

  return ok('updateEntry', `Updated ${category} entry (${updatedSummary}).`, {
    id: targetId,
    category,
    updatedFields: patchData,
  });
};

// ── 10. createGoal ──────────────────────────────────────────

const createGoalHandler: Handler = async (args, ctx) => {
  const title = asString(args.title)?.trim();
  if (!title) return fail('createGoal', 'Goal title is required.');

  const rawFreq = asString(args.frequency)?.toLowerCase();
  const frequency: GoalEntry['frequency'] =
    rawFreq === 'weekly' ? 'weekly' : rawFreq === 'monthly' ? 'monthly' : 'daily';

  const entry: Omit<GoalEntry, 'id' | 'createdAt' | 'updatedAt'> = {
    title,
    description: asString(args.description),
    frequency,
    targetCount: asNumber(args.targetCount),
    category: asString(args.category) as MemoryCategory | undefined,
    streak: 0,
    completionRate: 0,
    status: 'active',
    checkIns: [],
    tags: buildGenericTags(title, asString(args.description)),
  };

  let id: string;
  try {
    id = await getRepository<GoalEntry>('goal').add(ctx.uid, entry);
  } catch (e) {
    return fail('createGoal', `Failed to create goal: ${(e as Error).message}`);
  }

  ctx.invalidateQueries([['goal', ctx.uid], ['timeline']]);

  return ok('createGoal', `Created goal/habit: "${title}".`, {
    id,
    title,
    frequency,
    status: 'active',
  });
};

// ── 11. logGoalCheckIn ──────────────────────────────────────

const logGoalCheckInHandler: Handler = async (args, ctx) => {
  let id = asString(args.id);
  const titleQuery = asString(args.title)?.trim().toLowerCase();
  const notes = asString(args.notes);
  const completed = args.completed !== false;

  const repo = getRepository<GoalEntry>('goal');
  const allGoals = await repo.fetchAll(ctx.uid);

  let targetGoal: GoalEntry | undefined;
  if (id) {
    targetGoal = allGoals.find((g) => g.id === id);
  } else if (titleQuery) {
    targetGoal = allGoals.find((g) => g.title.toLowerCase().includes(titleQuery));
  }

  if (!targetGoal) {
    return fail('logGoalCheckIn', 'Goal not found. Create the goal first using createGoal.');
  }

  const newCheckIn: GoalCheckIn = {
    date: Date.now(),
    notes,
    completed,
  };

  const updatedCheckIns = [...(targetGoal.checkIns ?? []), newCheckIn];
  const newStreak = completed ? (targetGoal.streak ?? 0) + 1 : 0;
  const completedCount = updatedCheckIns.filter((c) => c.completed).length;
  const newCompletionRate = Math.round((completedCount / updatedCheckIns.length) * 100);

  try {
    await repo.update(ctx.uid, targetGoal.id, {
      checkIns: updatedCheckIns,
      streak: newStreak,
      completionRate: newCompletionRate,
    });
  } catch (e) {
    return fail('logGoalCheckIn', `Failed to record check-in: ${(e as Error).message}`);
  }

  ctx.invalidateQueries([['goal', ctx.uid], ['timeline']]);

  return ok('logGoalCheckIn', `Recorded check-in for "${targetGoal.title}". Active streak: ${newStreak} days! 🔥`, {
    id: targetGoal.id,
    title: targetGoal.title,
    streak: newStreak,
    completionRate: newCompletionRate,
  });
};

// ── 12. deleteEntry ──────────────────────────────────────────

const deleteEntryHandler: Handler = async (args, ctx) => {
  const id = asString(args.id);
  const category = asString(args.category)?.toLowerCase() as MemoryCategory;
  if (!id) return fail('deleteEntry', 'An entry id is required.');

  const valid: MemoryCategory[] = ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'];
  if (!valid.includes(category)) {
    return fail('deleteEntry', `Unknown category "${category}".`);
  }

  try {
    if (category === 'movie') await getRepository<MovieEntry>('movie').delete(ctx.uid, id);
    else if (category === 'food') await getRepository<FoodEntry>('food').delete(ctx.uid, id);
    else if (category === 'travel') await getRepository<TravelEntry>('travel').delete(ctx.uid, id);
    else if (category === 'note') await getRepository<NoteEntry>('note').delete(ctx.uid, id);
    else if (category === 'wishlist') await getRepository<WishlistEntry>('wishlist').delete(ctx.uid, id);
    else await getRepository<GoalEntry>('goal').delete(ctx.uid, id);
  } catch (e) {
    return fail('deleteEntry', `Failed to delete: ${(e as Error).message}`);
  }

  ctx.invalidateQueries([[`${category}`, ctx.uid], ['timeline']]);
  return ok('deleteEntry', `Deleted the ${category} entry.`, { id, category });
};

// ── 13. searchMemory ────────────────────────────────────────

const searchMemoryHandler: Handler = async (args, ctx) => {
  const query = asString(args.query)?.trim().toLowerCase();
  const requestedCats = asStringArray(args.categories);
  const cats: MemoryCategory[] = (requestedCats ?? ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'])
    .filter((c): c is MemoryCategory =>
      ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'].includes(c.toLowerCase()),
    );

  let retrieval;
  try {
    retrieval = await retrieveMemories(ctx.uid, { categories: cats, limitPerCategory: 50 });
  } catch (e) {
    return fail('searchMemory', `Failed to read memories: ${(e as Error).message}`);
  }

  const tokens = query ? tokenize(query) : [];
  const scored = scoreMemories(retrieval.memories, tokens);

  if (scored.length === 0) {
    return ok('searchMemory', 'No matching memories found.', {
      query,
      counts: retrieval.categoryCounts,
      results: [],
    });
  }

  const top = scored.slice(0, 8).map(({ kind, item }) => summarizeMemory(kind, item));
  return ok('searchMemory', `Found ${scored.length} matching memor${scored.length === 1 ? 'y' : 'ies'}.`, {
    query,
    counts: retrieval.categoryCounts,
    results: top,
  });
};

// ── Tag builders (lowercased keyword tags for lean retrieval) ──

function buildMovieTags(
  title: string,
  genres: string[],
  director?: string,
  cast?: string[],
): string[] {
  const tags = new Set<string>();
  addTokens(tags, title);
  genres.forEach((g) => addTokens(tags, g));
  if (director) addTokens(tags, director);
  cast?.forEach((a) => addTokens(tags, a));
  return [...tags];
}

function buildGenericTags(...parts: (string | string[] | undefined)[]): string[] {
  const tags = new Set<string>();
  for (const p of parts) {
    if (Array.isArray(p)) p.forEach((x) => addTokens(tags, x));
    else if (p) addTokens(tags, p);
  }
  return [...tags];
}

function addTokens(set: Set<string>, text: string): void {
  for (const t of tokenize(text)) {
    if (t.length >= 3) set.add(t); // skip tiny filler tokens
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// ── Memory scoring for searchMemory ─────────────────────────

type MemoryKind = 'movie' | 'food' | 'travel' | 'note' | 'wishlist' | 'goal';
type AnyEntry = MovieEntry | FoodEntry | TravelEntry | NoteEntry | WishlistEntry | GoalEntry;

function memorySearchText(kind: MemoryKind, item: AnyEntry): string {
  const i = item as unknown as Record<string, unknown>;
  const parts: string[] = [];
  switch (kind) {
    case 'movie':
      parts.push(String(i.title ?? ''), (i.genres as string[] | undefined)?.join(' ') ?? '',
        String(i.director ?? ''), String(i.overview ?? ''), String(i.review ?? ''),
        (i.cast as string[] | undefined)?.join(' ') ?? '');
      break;
    case 'food':
      parts.push(String(i.restaurant ?? ''), String(i.cuisine ?? ''), String(i.notes ?? ''),
        (i.favoriteDishes as string[] | undefined)?.join(' ') ?? '',
        (i.companions as string[] | undefined)?.join(' ') ?? '');
      break;
    case 'travel':
      parts.push(String(i.destination ?? ''), String(i.notes ?? ''),
        (i.places as string[] | undefined)?.join(' ') ?? '',
        (i.companions as string[] | undefined)?.join(' ') ?? '');
      break;
    case 'note':
      parts.push(String(i.title ?? ''), String(i.text ?? ''));
      break;
    case 'wishlist':
      parts.push(String(i.title ?? ''), String(i.note ?? ''));
      break;
    case 'goal':
      parts.push(String(i.title ?? ''), String(i.description ?? ''));
      break;
  }
  return parts.join(' ').toLowerCase();
}

function scoreMemories(
  bundle: { movies: MovieEntry[]; food: FoodEntry[]; travel: TravelEntry[]; notes: NoteEntry[]; wishlist: WishlistEntry[]; goals?: GoalEntry[] },
  tokens: string[],
): { kind: MemoryKind; item: AnyEntry; score: number }[] {
  if (tokens.length === 0) return [];
  const out: { kind: MemoryKind; item: AnyEntry; score: number }[] = [];
  const scan = (kind: MemoryKind, items: AnyEntry[]) => {
    for (const item of items) {
      const text = memorySearchText(kind, item);
      let score = 0;
      for (const t of tokens) if (text.includes(t)) score++;
      if (score > 0) out.push({ kind, item, score });
    }
  };
  scan('movie', bundle.movies);
  scan('food', bundle.food);
  scan('travel', bundle.travel);
  scan('note', bundle.notes);
  scan('wishlist', bundle.wishlist);
  if (bundle.goals) scan('goal', bundle.goals);
  out.sort((a, b) => b.score - a.score);
  return out;
}

function summarizeMemory(kind: MemoryKind, item: AnyEntry): Record<string, unknown> {
  const i = item as unknown as Record<string, unknown>;
  const base = { id: i.id, category: kind };
  switch (kind) {
    case 'movie':
      return { ...base, title: i.title, year: i.year, genres: i.genres, rating: i.rating };
    case 'food':
      return { ...base, restaurant: i.restaurant, cuisine: i.cuisine, rating: i.rating, companions: i.companions };
    case 'travel':
      return { ...base, destination: i.destination, durationDays: i.durationDays, rating: i.rating, status: i.status };
    case 'note':
      return { ...base, title: i.title, type: i.type, preview: String(i.text ?? '').slice(0, 120) };
    case 'wishlist':
      return { ...base, title: i.title, category: i.category, done: i.done };
    case 'goal':
      return { ...base, title: i.title, streak: i.streak, completionRate: i.completionRate };
  }
}

// ── Registry of handlers ────────────────────────────────────

export const TOOL_HANDLERS: Record<string, Handler> = {
  searchMovie: searchMovieHandler,
  addMovie: addMovieHandler,
  logFood: logFoodHandler,
  logTravel: logTravelHandler,
  createNote: createNoteHandler,
  updateWishlist: updateWishlistHandler,
  markWishlistDone: markWishlistDoneHandler,
  updateRating: updateRatingHandler,
  updateEntry: updateEntryHandler,
  createGoal: createGoalHandler,
  logGoalCheckIn: logGoalCheckInHandler,
  deleteEntry: deleteEntryHandler,
  searchMemory: searchMemoryHandler,
};
