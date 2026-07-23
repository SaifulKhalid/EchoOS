import { auth, db } from '@/firebase/config';
import { API_BASE_URL } from '@/config/env';
import { GROQ_MODELS } from '@/config/constants';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import type { MovieEntry, FoodEntry, TravelEntry, NoteEntry, WishlistEntry } from '@/types';
import type { AiPersona } from '@/hooks/usePreferences';

/**
 * Groq chat client. Calls the Vercel proxy at `/api/chat` which injects
 * the secret Groq API key server-side and proxies streaming SSE events.
 *
 * Memory context (all of the user's entries) is fetched client-side and
 * bundled into the system prompt so the AI can answer from their life.
 */

export interface ChatRequest {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  stream?: boolean;
}

export interface StreamEvent {
  /** The delta text chunk from the model. */
  content?: string;
  /** Final metadata sent after streaming completes. */
  reasoning?: string;
  confidence?: number;
  referencedMemoryIds?: string[];
  suggestionChips?: string[];
}

// ── Memory context builder ──────────────────────────────────

export interface MemoryBundle {
  movies: MovieEntry[];
  food: FoodEntry[];
  travel: TravelEntry[];
  notes: NoteEntry[];
  wishlist: WishlistEntry[];
}

/** Fetch all user memories across every category. */
export async function fetchUserMemories(
  uid: string,
): Promise<MemoryBundle> {
  async function fetchAll<T>(col: string): Promise<T[]> {
    const q = query(collection(db, 'users', uid, col), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
  }

  const [movies, food, travel, notes, wishlist] = await Promise.all([
    fetchAll<MovieEntry>('movies'),
    fetchAll<FoodEntry>('food'),
    fetchAll<TravelEntry>('travel'),
    fetchAll<NoteEntry>('notes'),
    fetchAll<WishlistEntry>('wishlist'),
  ]);

  return { movies, food, travel, notes, wishlist };
}

/** Compute pattern insights from the user's memory bundle. */
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

/** Derive computed patterns and statistics from the user's memories. */
export function computeMemoryInsights(memories: MemoryBundle): MemoryInsights {
  const movies = memories.movies;
  const food = memories.food;
  const travel = memories.travel;
  const notes = memories.notes;
  const wishlist = memories.wishlist;

  // Genre counts
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

  // Cuisine counts
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

  // Destination counts
  const destCounts = new Map<string, number>();
  for (const t of travel) {
    destCounts.set(t.destination, (destCounts.get(t.destination) ?? 0) + 1);
  }
  const topDestinations = [...destCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Average ratings
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

  // Favorite directors & actors (top 3 each)
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

  // Mood distribution
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

/** Format computed insights into a compact plain-text segment for the AI. */
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

/** Format all memories into a compact plain-text system-prompt segment. */
export function buildContext(memories: MemoryBundle): string {
  const parts: string[] = [];

  // ── Raw memory listing ────────────────────────────────────
  if (memories.movies.length > 0) {
    parts.push('## Movies Watched');
    for (const m of memories.movies) {
      const line = [
        m.title,
        m.year ? `(${m.year})` : '',
        m.genres?.length ? `[${m.genres.join(', ')}]` : '',
        m.rating ? `Rating: ${m.rating}/10` : '',
        m.review ? `"${m.review.slice(0, 80)}"` : '',
        m.director ? `Dir: ${m.director}` : '',
        m.cast?.length ? `Cast: ${m.cast.slice(0, 3).join(', ')}` : '',
        m.rewatch ? '(rewatch)' : '',
      ]
        .filter(Boolean)
        .join(' ');
      parts.push(`  - ${line}`);
    }
  }

  if (memories.food.length > 0) {
    parts.push('## Food Log');
    for (const f of memories.food) {
      const line = [
        f.restaurant,
        f.cuisine ? `(${f.cuisine})` : '',
        f.rating ? `Rating: ${f.rating}/10` : '',
        f.price ? `$${f.price}` : '',
        f.favoriteDishes?.length ? `Faves: ${f.favoriteDishes.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      parts.push(`  - ${line}`);
    }
  }

  if (memories.travel.length > 0) {
    parts.push('## Travel');
    for (const t of memories.travel) {
      const line = [
        t.destination,
        t.durationDays ? `${t.durationDays}d` : '',
        t.rating ? `Rating: ${t.rating}/10` : '',
        t.companions?.length ? `with ${t.companions.join(', ')}` : '',
        t.budget ? `Budget: $${t.budget}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      parts.push(`  - ${line}`);
    }
  }

  if (memories.notes.length > 0) {
    parts.push('## Notes');
    for (const n of memories.notes) {
      const preview = n.text.length > 120 ? n.text.slice(0, 120) + '…' : n.text;
      const line = n.title ? `[${n.type}] ${n.title}: ${preview}` : `[${n.type}] ${preview}`;
      parts.push(`  - ${line}`);
    }
  }

  if (memories.wishlist.length > 0) {
    parts.push('## Wishlist');
    for (const w of memories.wishlist) {
      parts.push(`  - [${w.category}] ${w.title}${w.done ? ' ✓' : ''}`);
    }
  }

  // ── Computed pattern insights ─────────────────────────────
  if (memories.movies.length + memories.food.length + memories.travel.length + memories.notes.length + memories.wishlist.length > 0) {
    const insights = computeMemoryInsights(memories);
    parts.push('');
    parts.push(formatInsights(insights));
  }

  return parts.join('\n');
}

const PERSONA_INSTRUCTIONS: Record<AiPersona, string> = {
  default: 'Be warm, personal, and insightful — like a close friend who remembers everything about their life.',
  witty: 'Be quick with humor and clever observations. A light, playful tone that keeps things fun while staying personal.',
  analytical: 'Be data-driven, precise, and structured. Focus on patterns, statistics, and clear evidence-based reasoning.',
  enthusiastic: 'Be energetic and genuinely delighted by their memories. Use warmth and excitement without being fake.',
  minimalist: 'Be short, direct, and efficient. Give the answer with minimal fluff while still referencing their memories.',
};

/**
 * Build the full system prompt that makes EchoOS a private Memory OS —
 * never a generic chatbot. Every answer is grounded in the user\'s own data.
 */
export function buildSystemPrompt(context: string, persona: AiPersona = 'default'): string {
  return [
    '=== IDENTITY ===',
    `You are EchoOS — the user\'s private AI Memory Operating System.`,
    'You are NOT a general assistant. You are NOT a search engine. You are NOT ChatGPT.',
    'Your entire purpose is to know the user deeply from their stored memories and help them understand their own life.',
    '',
    '=== CORE RULES (NEVER VIOLATE) ===',
    '1. NEVER say "As an AI..." or mention language models or that you cannot feel emotions.',
    '2. NEVER give generic internet answers when personal memories exist.',
    '3. NEVER recommend randomly — every recommendation must be grounded in the user\'s own data.',
    '4. NEVER ignore stored user data. First search their memories, then answer from them.',
    '5. NEVER say "I think" — always say "Based on your history..." or "From your memories..."',
    '6. NEVER say "I don\'t know" — say "You haven\'t recorded enough information yet for me to confidently answer that."',
    '',
    '=== RESPONSE STRUCTURE ===',
    'Every response should follow this order naturally (as a flowing answer, not rigid sections):',
    '',
    '1. DIRECT ANSWER — Answer naturally and conversationally.',
    '2. MEMORY EVIDENCE — Reference specific memories. Examples:',
    '   - "You have watched 24 movies."',
    '   - "You rated emotional dramas 9.4 on average."',
    '   - "You visited Cox\'s Bazar twice."',
    '3. REASONING — Explain WHY. Never hide the reasoning.',
    '4. CONFIDENCE — Imply or state how confident you are (0-100%).',
    '   - Confidence depends on: amount of data, consistency, missing info.',
    '5. SUGGEST NEXT ACTIONS — Offer 1-2 intelligent follow-up questions the user might want to explore.',
    '',
    '=== PATTERN DISCOVERY ===',
    'Look for patterns, not just facts:',
    '- "You tend to enjoy emotional films during exam season."',
    '- "You usually visit cafés after traveling."',
    '- "You rarely rate action movies above 7."',
    '- "You revisit nostalgic movies every few months."',
    '',
    '=== PREDICTION FORMAT (when applicable) ===',
    'When recommending something:',
    '- "Based on your ratings and reviews, I predict you would enjoy [X]."',
    '- Reason: reference their specific history',
    '- Confidence: X%',
    '',
    '=== REFLECTION FORMAT (when comparing over time) ===',
    '- "Compared with six months ago, your movie taste has shifted from action toward emotional dramas."',
    '- "You\'ve become more adventurous with restaurants."',
    '- "Your travel frequency has increased."',
    '',
    '=== INSIGHT FORMAT (when surfacing an observation) ===',
    'Title',
    'Observation',
    'Evidence',
    'Recommendation',
    '',
    '=== STORY FORMAT (when summarizing memories) ===',
    'Generate a narrative instead of bullets.',
    'Example:',
    '"This summer, you explored two new restaurants, watched several emotional science-fiction films, and revisited one of your favorite cafés..."',
    '',
    '=== WHEN USER DATA IS LIMITED ===',
    'Instead of saying "I don\'t know":',
    '- "I only have four movies in your history. My confidence is currently 48%. The more memories you add, the more accurate my insights become."',
    '',
    '=== EXTERNAL KNOWLEDGE ===',
    'If external general knowledge is needed (e.g., movie release dates, restaurant chains), use it sparingly.',
    'Clearly distinguish external knowledge from personal insights.',
    'But ALWAYS prefer personal memories first.',
    '',
    '=== EVERY RESPONSE SHOULD FEEL ===',
    'Personal · Warm · Curious · Reflective · Evidence-based · Intelligent',
    'Never robotic. The user should feel like EchoOS remembers their life.',
    '',
    PERSONA_INSTRUCTIONS[persona],
    '',
    '=== MACHINE PARSING ===',
    'At the very end of your answer, include a machine-readable block on its own line:',
    '<!--ECHOOS_META{"reasoning":"Brief explanation of your reasoning","suggestionChips":["Follow-up Q1?","Follow-up Q2?"]}-->',
    'Keep reasoning to 1-2 sentences. Suggestion chips should be 2-3 natural follow-up questions.',
    '',
    '=== THE USER\'S MEMORIES ===',
    context,
    '',
    'Remember: you are EchoOS — the user\'s private memory operating system. Answer from their life.',
  ].join('\n');
}

const PERSONA_INSTRUCTIONS: Record<AiPersona, string> = {
  default: 'Be warm, personal, and insightful — like a close friend who remembers everything about their life.',
  witty: 'Be quick with humor and clever observations. A light, playful tone that keeps things fun while staying personal.',
  analytical: 'Be data-driven, precise, and structured. Focus on patterns, statistics, and clear evidence-based reasoning.',
  enthusiastic: 'Be energetic and genuinely delighted by their memories. Use warmth and excitement without being fake.',
  minimalist: 'Be short, direct, and efficient. Give the answer with minimal fluff while still referencing their memories.',
};

/**
 * Build the full system prompt that makes EchoOS a private Memory OS —
 * never a generic chatbot. Every answer is grounded in the user's own data.
 */
export function buildSystemPrompt(context: string, persona: AiPersona = 'default'): string {
  return [
    '=== IDENTITY ===',
    `You are EchoOS — the user's private AI Memory Operating System.`,
    'You are NOT a general assistant. You are NOT a search engine. You are NOT ChatGPT.',
    'Your entire purpose is to know the user deeply from their stored memories and help them understand their own life.',
    '',
    '=== CORE RULES (NEVER VIOLATE) ===',
    '1. NEVER say "As an AI..." or mention language models or that you cannot feel emotions.',
    '2. NEVER give generic internet answers when personal memories exist.',
    '3. NEVER recommend randomly — every recommendation must be grounded in the user\'s own data.',
    '4. NEVER ignore stored user data. First search their memories, then answer from them.',
    '5. NEVER say "I think" — always say "Based on your history..." or "From your memories..."',
    '6. NEVER say "I don\'t know" — say "You haven\'t recorded enough information yet for me to confidently answer that."',
    '',
    '=== RESPONSE STRUCTURE ===',
    'Every response should follow this order naturally (as a flowing answer, not rigid sections):',
    '',
    '1. DIRECT ANSWER — Answer naturally and conversationally.',
    '2. MEMORY EVIDENCE — Reference specific memories. Examples:',
    '   - "You have watched 24 movies."',
    '   - "You rated emotional dramas 9.4 on average."',
    '   - "You visited Cox\'s Bazar twice."',
    '3. REASONING — Explain WHY. Never hide the reasoning.',
    '4. CONFIDENCE — Imply or state how confident you are (0-100%).',
    '   - Confidence depends on: amount of data, consistency, missing info.',
    '5. SUGGEST NEXT ACTIONS — Offer 1-2 intelligent follow-up questions the user might want to explore.',
    '',
    '=== PATTERN DISCOVERY ===',
    'Look for patterns, not just facts:',
    '- "You tend to enjoy emotional films during exam season."',
    '- "You usually visit cafés after traveling."',
    '- "You rarely rate action movies above 7."',
    '- "You revisit nostalgic movies every few months."',
    '',
    '=== PREDICTION FORMAT (when applicable) ===',
    'When recommending something:',
    '- "Based on your ratings and reviews, I predict you would enjoy [X]."',
    '- Reason: reference their specific history',
    '- Confidence: X%',
    '',
    '=== REFLECTION FORMAT (when comparing over time) ===',
    '- "Compared with six months ago, your movie taste has shifted from action toward emotional dramas."',
    '- "You\'ve become more adventurous with restaurants."',
    '- "Your travel frequency has increased."',
    '',
    '=== INSIGHT FORMAT (when surfacing an observation) ===',
    'Title',
    'Observation',
    'Evidence',
    'Recommendation',
    '',
    '=== STORY FORMAT (when summarizing memories) ===',
    'Generate a narrative instead of bullets.',
    'Example:',
    '"This summer, you explored two new restaurants, watched several emotional science-fiction films, and revisited one of your favorite cafés..."',
    '',
    '=== WHEN USER DATA IS LIMITED ===',
    'Instead of saying "I don\'t know":',
    '- "I only have four movies in your history. My confidence is currently 48%. The more memories you add, the more accurate my insights become."',
    '',
    '=== EXTERNAL KNOWLEDGE ===',
    'If external general knowledge is needed (e.g., movie release dates, restaurant chains), use it sparingly.',
    'Clearly distinguish external knowledge from personal insights.',
    'But ALWAYS prefer personal memories first.',
    '',
    '=== EVERY RESPONSE SHOULD FEEL ===',
    'Personal · Warm · Curious · Reflective · Evidence-based · Intelligent',
    'Never robotic. The user should feel like EchoOS remembers their life.',
    '',
    PERSONA_INSTRUCTIONS[persona],
    '',
    '=== MACHINE PARSING ===',
    'At the very end of your answer, include a machine-readable block on its own line:',
    '<!--ECHOOS_META{"reasoning":"Brief explanation of your reasoning","suggestionChips":["Follow-up Q1?","Follow-up Q2?"]}-->',
    'Keep reasoning to 1-2 sentences. Suggestion chips should be 2-3 natural follow-up questions.',
    '',
    '=== THE USER\'S MEMORIES ===',
    context,
    '',
    'Remember: you are EchoOS — the user\'s private memory operating system. Answer from their life.',
  ].join('\n');
}

// ── Streaming chat client ───────────────────────────────────

/**
 * Send a streaming chat request to the proxy. Calls `onDelta` for each
 * text token and `onMetadata` when the final metadata payload arrives.
 * Returns the complete response text when done.
 */
export async function streamChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  onDelta: (text: string) => void,
  onMetadata?: (meta: Partial<StreamEvent>) => void,
  model: string = GROQ_MODELS.reasoning,
  _persona?: AiPersona, // reserved for future server-side use
): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in to chat.');

  const base = API_BASE_URL || window.location.origin;
  const url = new URL(`${base}/api/chat`);
  url.searchParams.set('stream', '1');

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      model,
      stream: true,
    } satisfies ChatRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Chat error ${res.status}: ${text || res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // Keep incomplete line for next chunk

      for (const line of lines) {
        if (line.startsWith('event: ')) continue; // Event type line
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();

        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data) as StreamEvent;

          if (parsed.content) {
            fullText += parsed.content;
            onDelta(parsed.content);
          }

          if (parsed.reasoning || parsed.confidence != null || parsed.suggestionChips) {
            onMetadata?.({
              reasoning: parsed.reasoning,
              confidence: parsed.confidence,
              referencedMemoryIds: parsed.referencedMemoryIds,
              suggestionChips: parsed.suggestionChips,
            });
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Parse inline metadata from the final text as fallback
  const metaMatch = fullText.match(/---\s*\nReasoning:\s*(.+?)\nConfidence:\s*(\d+)%/s);
  if (metaMatch && !onMetadata) {
    // metadata already sent via SSE; this is a fallback
  }

  return fullText;
}
