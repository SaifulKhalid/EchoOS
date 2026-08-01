/**
 * intentDetector.ts
 *
 * STEP 1 of the Memory Intelligence Layer.
 * Classifies the user's message into one of 11 possible intents using
 * lightweight keyword/pattern matching — no API call needed.
 *
 * Each intent maps to a set of memory categories that should be retrieved,
 * so downstream modules never fetch the entire database unnecessarily.
 */

import type { MemoryCategory } from '@/config/constants';

// ── Intent taxonomy ─────────────────────────────────────────

export type IntentType =
  | 'greeting'
  | 'recommendation'
  | 'pattern_discovery'
  | 'timeline_query'
  | 'memory_lookup'
  | 'comparison'
  | 'prediction'
  | 'reflection'
  | 'story_generation'
  | 'analytics'
  | 'general_conversation';

export interface IntentResult {
  /** The most likely intent. */
  intent: IntentType;
  /** Memory categories relevant to this intent — used by memoryRetriever. */
  categories: MemoryCategory[];
  /** Confidence in the classification (0–1). */
  confidence: number;
  /** Optional extracted focus area (e.g. "drama movies", "italian food"). */
  focus?: string;
  /** Optional time range hint (e.g. "last year", "this summer"). */
  timeHint?: string;
}

// ── Pattern maps ───────────────────────────────────────────

interface IntentPattern {
  keywords: RegExp[];
  categories: MemoryCategory[];
  weight: number; // priority weight when multiple intents match
}

const INTENT_PATTERNS: Record<IntentType, IntentPattern> = {
  greeting: {
    keywords: [/^(hi|hello|hey|sup|yo|howdy|greetings)\b/i, /\b(good morning|good evening|good afternoon)\b/i],
    categories: [],
    weight: 10,
  },
  recommendation: {
    keywords: [
      /\b(recommend|suggest|what should i|what to|what's good|what's a good)\b/i,
      /\b(what movie|what food|what restaurant|where should|where to go)\b/i,
      /\b(looking for|in the mood for|feel like)\b/i,
    ],
    categories: ['movie', 'food', 'travel', 'wishlist'],
    weight: 8,
  },
  pattern_discovery: {
    keywords: [
      /\b(pattern|trend|notice|commonalit|similarit|tend |taste |preference)\b/i,
      /\b(what do you see|tell me something|what stands out|what's interesting)\b/i,
      /\b(how have i changed|what does my|what my .+ say)\b/i,
    ],
    categories: ['movie', 'food', 'travel', 'note'],
    weight: 7,
  },
  timeline_query: {
    keywords: [
      /\b(timeline|chronolog|sequence|order|history)\b/i,
      /\b(when did i|what happened|what did i do) .+ (last|past|this)\b/i,
      /\b(timeline of|show me my)\b/i,
    ],
    categories: ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'],
    weight: 6,
  },
  memory_lookup: {
    keywords: [
      /\b(remember|recall|find|search|look up|what was|that time)\b/i,
      /\b(what did i .+ about|did i watch|did i eat|did i visit|did i go)\b/i,
      /\b(what's the name of|what was the name)\b/i,
    ],
    categories: ['movie', 'food', 'travel', 'note', 'goal'],
    weight: 7,
  },
  comparison: {
    keywords: [
      /\b(compare|versus|vs\.?|difference|better|worse|rather)\b/i,
      /\b(how does .+ compare|which is better|what's the difference)\b/i,
      /\b(between|than .+ but|vs )\b/i,
    ],
    categories: ['movie', 'food', 'travel', 'goal'],
    weight: 6,
  },
  prediction: {
    keywords: [
      /\b(predict|will i|would i|guess|forecast|odds|chance)\b/i,
      /\b(what are the chances|do you think|how likely)\b/i,
      /\b(would i enjoy|would i like|will i like)\b/i,
    ],
    categories: ['movie', 'food', 'travel', 'wishlist', 'goal'],
    weight: 5,
  },
  reflection: {
    keywords: [
      /\b(reflect|looking back|over the (year|month|time)|how have i|grown|changed)\b/i,
      /\b(what have i learned|what's my|my life|who am i)\b/i,
      /\b(how was my|my year in|this year's)\b/i,
    ],
    categories: ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'],
    weight: 6,
  },
  story_generation: {
    keywords: [
      /\b(tell me a story|narrative|write a story|story about|summarize my)\b/i,
      /\b(my .+ story|story of my|journey|adventure)\b/i,
    ],
    categories: ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'],
    weight: 5,
  },
  analytics: {
    keywords: [
      /\b(analytics|statistics|stats|data|numbers|count|total)\b/i,
      /\b(how many|how much|how often|frequency|average)\b/i,
      /\b(most |least |top |bottom |chart|graph|insight)\b/i,
    ],
    categories: ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'],
    weight: 6,
  },
  general_conversation: {
    keywords: [], // fallback — no specific keywords needed
    categories: ['movie', 'food', 'travel', 'note', 'wishlist', 'goal'],
    weight: 1,
  },
};

// ── Focus extraction helpers ───────────────────────────────

const CATEGORY_KEYWORDS: Record<string, MemoryCategory> = {
  movie: 'movie',
  film: 'movie',
  movies: 'movie',
  films: 'movie',
  watch: 'movie',
  watched: 'movie',
  cinema: 'movie',
  show: 'movie',
  tv: 'movie',
  food: 'food',
  restaurant: 'food',
  meal: 'food',
  cuisine: 'food',
  eat: 'food',
  ate: 'food',
  cooking: 'food',
  dish: 'food',
  travel: 'travel',
  trip: 'travel',
  destination: 'travel',
  visit: 'travel',
  visited: 'travel',
  place: 'travel',
  vacation: 'travel',
  holiday: 'travel',
  note: 'note',
  notes: 'note',
  journal: 'note',
  thought: 'note',
  idea: 'note',
  wishlist: 'wishlist',
  want: 'wishlist',
  bucket: 'wishlist',
  goal: 'goal',
  goals: 'goal',
  habit: 'goal',
  habits: 'goal',
  streak: 'goal',
  running: 'goal',
  exercise: 'goal',
  fitness: 'goal',
};

/**
 * Extract a focus noun phrase from the message (e.g., "drama movies",
 * "italian food", "beach destinations").
 */
function extractFocus(text: string): string | undefined {
  // Try to match "adjective + category noun" patterns
  const focusMatch = text.match(
    /\b((?:favorite|best|worst|top|recent|oldest|newest|highest|lowest)\s+\w+(?:\s+\w+)?)\b/i,
  );
  if (focusMatch) return focusMatch[1].toLowerCase();
  return undefined;
}

/**
 * Extract a time range hint from the message.
 */
function extractTimeHint(text: string): string | undefined {
  const timePatterns = [
    /\b(this\s+(?:year|month|week|decade|summer|winter|spring|fall|autumn))\b/i,
    /\b((?:last|past|previous)\s+(?:year|month|week|decade|summer|winter))\b/i,
    /\b((?:in|since|during)\s+\d{4})\b/i,
    /\b((?:early|late|mid)\s+\d{4}s?)\b/i,
  ];
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) return match[1].toLowerCase();
  }
  return undefined;
}

/**
 * Narrow categories based on explicit mentions in the message.
 * If the user mentions "movies" specifically, only retrieve movies.
 * If nothing specific, return the intent's default categories.
 */
function narrowCategories(text: string, defaultCategories: MemoryCategory[]): MemoryCategory[] {
  const mentioned = new Set<MemoryCategory>();
  const words = text.toLowerCase().split(/\s+/);

  for (const word of words) {
    if (CATEGORY_KEYWORDS[word]) {
      mentioned.add(CATEGORY_KEYWORDS[word]);
    }
  }

  // Also check phrases
  const textLower = text.toLowerCase();
  if (/\bwhat (movie|film|show)s?\b/.test(textLower)) mentioned.add('movie');
  if (/\bwhat (food|restaurant|cuisine)s?\b/.test(textLower)) mentioned.add('food');
  if (/\b(where|what place|destination)s?\b/.test(textLower)) mentioned.add('travel');

  return mentioned.size > 0 ? [...mentioned] : defaultCategories;
}

// ── Main detector ──────────────────────────────────────────

/**
 * Detect the user's intent from a message string.
 *
 * Uses weighted keyword matching. Patterns with higher weight win
 * in case of ties. If no specific intent is detected, returns
 * 'general_conversation'.
 */
export function detectIntent(message: string): IntentResult {
  const text = message.trim();
  if (!text) {
    return {
      intent: 'general_conversation',
      categories: ['movie', 'food', 'travel', 'note'],
      confidence: 0,
    };
  }

  const scores = new Map<IntentType, number>();

  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS) as [IntentType, IntentPattern][]) {
    let matchCount = 0;
    for (const regex of pattern.keywords) {
      if (regex.test(text)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      scores.set(intent, matchCount * pattern.weight);
    }
  }

  // If no patterns matched, fall through to general_conversation
  if (scores.size === 0) {
    return {
      intent: 'general_conversation',
      categories: narrowCategories(text, ['movie', 'food', 'travel', 'note']),
      confidence: 0.3,
      focus: extractFocus(text),
      timeHint: extractTimeHint(text),
    };
  }

  // Pick the highest-scoring intent
  let bestIntent: IntentType = 'general_conversation';
  let bestScore = 0;
  for (const [intent, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  const defaultCategories = INTENT_PATTERNS[bestIntent].categories;
  const narrowed = narrowCategories(text, defaultCategories);

  // Calculate confidence based on match quality
  const rawConfidence = Math.min(bestScore / 50, 1);
  const confidence = Math.max(0.3, rawConfidence);

  return {
    intent: bestIntent,
    categories: narrowed,
    confidence,
    focus: extractFocus(text),
    timeHint: extractTimeHint(text),
  };
}
