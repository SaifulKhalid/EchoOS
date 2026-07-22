/**
 * App-wide constants: routes, memory categories, moods, models.
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

/** Groq models — reasoning vs. cheap summarization (wired in Phase 4). */
export const GROQ_MODELS = {
  reasoning: 'llama-3.3-70b-versatile',
  fast: 'llama-3.1-8b-instant',
} as const;

/** Firestore read economy: default page size for paginated lists. */
export const PAGE_SIZE = 20;
