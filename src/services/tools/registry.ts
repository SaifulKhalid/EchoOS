/**
 * tools/registry.ts
 *
 * The single source of truth for EchoOS AI Actions.
 *
 *   TOOL_SCHEMAS  → what Groq sees (name + description + JSON-schema params).
 *   executeTool() → what runs client-side (dispatches to handlers.ts).
 *   toAction()    → turns a ToolResult into a UI ActionDescriptor.
 *
 * Add a new tool here and in handlers.ts and it flows through everywhere.
 */

import type { MemoryCategory } from '@/config/constants';
import type {
  ToolSchema,
  ToolCall,
  ToolResult,
  ToolExecutionContext,
  ActionDescriptor,
} from './types';
import { TOOL_HANDLERS } from './handlers';

// ── Groq-facing tool definitions ────────────────────────────

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: 'searchMovie',
    description:
      'Search TMDB for a movie by title. Use this BEFORE addMovie to resolve the correct tmdbId, year, and disambiguate remakes. Returns the top matches.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The movie title to search for.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'addMovie',
    description:
      'Add a movie to the user\'s library. Requires a tmdbId (from searchMovie). Enriches with poster, genres, cast, director from TMDB. Optional: rating (0-10), mood, review, watchDate (ISO or YYYY-MM-DD).',
    parameters: {
      type: 'object',
      properties: {
        tmdbId: { type: 'number', description: 'TMDB movie id (from searchMovie results).' },
        rating: { type: 'number', description: 'User rating 0-10.' },
        watchDate: { type: 'string', description: 'When watched (ISO date or YYYY-MM-DD). Defaults to today.' },
        mood: { type: 'string', description: 'joy | calm | love | sad | awe | neutral' },
        review: { type: 'string', description: 'Optional short review.' },
      },
      required: ['tmdbId'],
    },
  },
  {
    name: 'logFood',
    description:
      'Log a restaurant or meal. Required: restaurant. Optional: cuisine, price, rating (0-10), dishes (array), mood, notes, date.',
    parameters: {
      type: 'object',
      properties: {
        restaurant: { type: 'string' },
        cuisine: { type: 'string', description: 'e.g. Italian, Thai' },
        price: { type: 'number', description: 'Price paid (any currency).' },
        rating: { type: 'number', description: '0-10' },
        dishes: { type: 'array', items: { type: 'string' }, description: 'Favorite dishes.' },
        mood: { type: 'string' },
        notes: { type: 'string' },
        date: { type: 'string', description: 'ISO or YYYY-MM-DD.' },
      },
      required: ['restaurant'],
    },
  },
  {
    name: 'logTravel',
    description:
      'Log a trip. Required: destination. Optional: startDate, endDate (ISO/YYYY-MM-DD), budget, durationDays (auto-derived from dates if omitted), places (array), companions (array), favoriteMoments (array), rating, mood, notes.',
    parameters: {
      type: 'object',
      properties: {
        destination: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        budget: { type: 'number' },
        durationDays: { type: 'number' },
        places: { type: 'array', items: { type: 'string' } },
        companions: { type: 'array', items: { type: 'string' } },
        favoriteMoments: { type: 'array', items: { type: 'string' } },
        rating: { type: 'number' },
        mood: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['destination'],
    },
  },
  {
    name: 'createNote',
    description:
      'Capture an idea, journal entry, or fleeting thought. Required: text. Optional: type (idea|journal|thought, default thought), title, mood, date.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        type: { type: 'string', enum: ['idea', 'journal', 'thought'] },
        title: { type: 'string' },
        mood: { type: 'string' },
        date: { type: 'string' },
      },
      required: ['text'],
    },
  },
  {
    name: 'updateWishlist',
    description:
      'Add an item the user wants to experience. Required: title. Optional: category (movie|place|food|book|product, default product), note.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        category: { type: 'string', enum: ['movie', 'place', 'food', 'book', 'product'] },
        note: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'markWishlistDone',
    description: 'Mark an existing wishlist item as completed. Required: id.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'updateRating',
    description:
      'Set or change the rating (0-10) of an existing movie, food, or travel entry. Required: id, category, rating.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        category: { type: 'string', enum: ['movie', 'food', 'travel'] },
        rating: { type: 'number', description: '0-10' },
      },
      required: ['id', 'category', 'rating'],
    },
  },
  {
    name: 'deleteEntry',
    description:
      'Permanently delete a memory entry. Required: id, category. Use cautiously — confirm intent first when ambiguous.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        category: { type: 'string', enum: ['movie', 'food', 'travel', 'note', 'wishlist'] },
      },
      required: ['id', 'category'],
    },
  },
  {
    name: 'searchMemory',
    description:
      'Search the user\'s OWN stored memories (movies, food, travel, notes, wishlist) by keywords. Use this to answer questions about their past instead of guessing. Optional: categories filter.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keywords to search for across all memories.' },
        categories: {
          type: 'array',
          items: { type: 'string', enum: ['movie', 'food', 'travel', 'note', 'wishlist'] },
          description: 'Restrict to these categories. Defaults to all.',
        },
      },
      required: ['query'],
    },
  },
];

// ── Tool name set (for validation) ──────────────────────────

export const TOOL_NAMES = new Set(TOOL_SCHEMAS.map((t) => t.name));

export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.has(name);
}

// ── Execute a single tool call ──────────────────────────────

/**
 * Execute one tool call. Unknown tools return an error result instead of
 * throwing, so one bad call never aborts the whole turn.
 */
export async function executeTool(
  call: ToolCall,
  ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const handler = TOOL_HANDLERS[call.name];
  if (!handler) {
    return {
      tool: call.name,
      status: 'error',
      summary: `Unknown tool "${call.name}".`,
    };
  }
  try {
    return await handler(call.arguments ?? {}, ctx);
  } catch (e) {
    return {
      tool: call.name,
      status: 'error',
      summary: `Tool "${call.name}" failed: ${(e as Error).message}`,
    };
  }
}

// ── Derive a UI action descriptor from a result ─────────────

const TOOL_CATEGORY: Record<string, ActionDescriptor['category']> = {
  searchMovie: 'search',
  addMovie: 'movie',
  logFood: 'food',
  logTravel: 'travel',
  createNote: 'note',
  updateWishlist: 'wishlist',
  markWishlistDone: 'wishlist',
  updateRating: 'movie', // refined below by data.category
  deleteEntry: 'memory',
  searchMemory: 'memory',
};

const TOOL_VERB: Record<string, string> = {
  searchMovie: 'Searched',
  addMovie: 'Added',
  logFood: 'Logged',
  logTravel: 'Logged',
  createNote: 'Saved',
  updateWishlist: 'Added',
  markWishlistDone: 'Completed',
  updateRating: 'Rated',
  deleteEntry: 'Deleted',
  searchMemory: 'Searched',
};

/**
 * Build the compact descriptor the chat UI renders as an action card.
 * Pulls a concrete title/subtitle out of the result data when available.
 */
export function toAction(result: ToolResult): ActionDescriptor {
  const d = result.data ?? {};
  const category: ActionDescriptor['category'] =
    result.tool === 'updateRating'
      ? ((d.category as MemoryCategory) ?? 'movie')
      : TOOL_CATEGORY[result.tool] ?? 'memory';

  const verb = TOOL_VERB[result.tool] ?? 'Processed';
  const title =
    (d.title as string) ??
    (d.restaurant as string) ??
    (d.destination as string) ??
    (result.tool === 'searchMovie' ? (d.query as string) ?? 'movies' : result.tool);

  let subtitle: string | undefined;
  if (typeof d.cardSubtitle === 'string') {
    subtitle = d.cardSubtitle;
  } else if (result.tool === 'logFood') {
    subtitle = [d.cuisine as string, d.rating != null ? `${d.rating}/10` : undefined]
      .filter(Boolean)
      .join(' · ') || undefined;
  } else if (result.tool === 'logTravel') {
    subtitle = [
      d.durationDays != null ? `${d.durationDays}d` : undefined,
      Array.isArray(d.companions) ? `with ${(d.companions as unknown[]).length}` : undefined,
      d.budget != null ? `budget ${d.budget}` : undefined,
    ].filter(Boolean).join(' · ') || undefined;
  } else if (result.tool === 'updateRating') {
    subtitle = `${d.rating}/10`;
  } else if (result.tool === 'searchMemory') {
    subtitle = result.summary;
  }

  return {
    category,
    title,
    subtitle,
    status: result.status,
    verb,
  };
}
