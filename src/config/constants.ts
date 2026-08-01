/**
 * App-wide constants: routes, memory categories, moods, models,
 * shared style maps, and utility constants.
 * Kept in one place so navigation, filters, and analytics stay in sync.
 */

export const APP_NAME = 'EchoOS';
export const APP_TAGLINE = 'Your memories. Your taste. Your AI.';

/** Route paths — referenced by the router and the sidebar nav. */
export const ROUTES = {
  dashboard: '/',
  chat: '/chat',
  timeline: '/timeline',
  movies: '/movies',
  food: '/food',
  travel: '/travel',
  notes: '/notes',
  wishlist: '/wishlist',
  goals: '/goals',
  search: '/search',
  analytics: '/analytics',
  settings: '/settings',
  login: '/login',
} as const;

/** The unified memory categories that flow into the timeline + AI engine. */
export const MEMORY_CATEGORIES = [
  'movie',
  'food',
  'travel',
  'note',
  'wishlist',
  'goal',
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

/** Mood palette — used for tagging entries and coloring the timeline. */
export const MOODS = [
  { id: 'joy', label: 'Joyful', color: 'mood-joy' },
  { id: 'calm', label: 'Calm', color: 'mood-calm' },
  { id: 'love', label: 'Loved', color: 'mood-love' },
  { id: 'sad', label: 'Melancholy', color: 'mood-sad' },
  { id: 'awe', label: 'Awed', color: 'mood-awe' },
  { id: 'neutral', label: 'Neutral', color: 'mood-neutral' },
] as const;

export type MoodId = (typeof MOODS)[number]['id'];

/** Shared mood background map — used by all card components. */
export const MOOD_BG: Record<string, string> = {
  joy: 'bg-mood-joy/60',
  calm: 'bg-mood-calm/60',
  love: 'bg-mood-love/60',
  sad: 'bg-mood-sad/60',
  awe: 'bg-mood-awe/60',
  neutral: 'bg-mood-neutral/60',
};

/** Shared note type style map. */
export const NOTE_TYPE_STYLE: Record<string, string> = {
  idea: 'bg-accent/15 text-accent-soft border-accent/20',
  journal: 'bg-mood-calm/15 text-mood-calm border-mood-calm/20',
  thought: 'bg-mood-awe/15 text-mood-awe border-mood-awe/20',
};

export const NOTE_TYPE_LABEL: Record<string, string> = {
  idea: 'Idea',
  journal: 'Journal',
  thought: 'Thought',
};

/** Shared wishlist category style map. */
export const WISHLIST_CATEGORY_STYLE: Record<string, string> = {
  movie: 'bg-accent/15 text-accent-soft border-accent/20',
  place: 'bg-mood-calm/15 text-mood-calm border-mood-calm/20',
  food: 'bg-mood-joy/15 text-mood-joy border-mood-joy/20',
  book: 'bg-mood-awe/15 text-mood-awe border-mood-awe/20',
  product: 'bg-mood-neutral/15 text-mood-neutral border-mood-neutral/20',
};

/** Shared timeline category meta map. */
export const TIMELINE_CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  movie: { icon: '🎬', label: 'Movie', color: 'bg-accent/15 text-accent-soft border-accent/20' },
  food: { icon: '🍽️', label: 'Food', color: 'bg-mood-joy/15 text-mood-joy border-mood-joy/20' },
  travel: { icon: '✈️', label: 'Travel', color: 'bg-mood-calm/15 text-mood-calm border-mood-calm/20' },
  note: { icon: '💭', label: 'Note', color: 'bg-mood-awe/15 text-mood-awe border-mood-awe/20' },
  wishlist: { icon: '⭐', label: 'Wishlist', color: 'bg-mood-neutral/15 text-mood-neutral border-mood-neutral/20' },
  goal: { icon: '🎯', label: 'Goal', color: 'bg-accent/20 text-accent-soft border-accent/30' },
};

/** Firestore collection names used for data export. */
export const EXPORT_COLLECTIONS = [
  'movies', 'food', 'travel', 'notes', 'wishlist', 'goals',
  'chats', 'reminders', 'notifications',
] as const;

/** Month abbreviation array shared across Dashboard and Timeline. */
export const MONTH_ABBREVIATIONS = [
  'J', 'F', 'M', 'A', 'M', 'J',
  'J', 'A', 'S', 'O', 'N', 'D',
] as const;

/** Groq models — reasoning vs. cheap summarization (wired in Phase 4). */
export const GROQ_MODELS = {
  reasoning: 'llama-3.3-70b-versatile',
  fast: 'llama-3.1-8b-instant',
} as const;

/** Firestore read economy: default page size for paginated lists. */
export const PAGE_SIZE = 20;
