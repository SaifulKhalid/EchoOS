/**
 * responseFormatter.ts
 *
 * STEP 5 (post-LLM) of the Memory Intelligence Layer.
 * After Groq replies, this module post-processes the response to:
 *
 *   - Extract memory references (specific entry mentions)
 *   - Parse the model's self-reported reasoning (or compute fallback)
 *   - Calibrate confidence with our data-driven score
 *   - Generate UI metadata (referenced categories, key data points)
 *   - Clean the raw text for display (remove machine-readable blocks)
 *
 * NEVER makes a second LLM call. Everything is done via parsing + computation.
 */

import type { MemoryBundle } from './memoryRetriever';
import type { IntentType } from './intentDetector';
import type { PatternAnalysis } from './patternAnalyzer';
import type { ConfidenceResult } from './confidenceCalculator';

export interface ProcessedResponse {
  /** Cleaned response text (machine blocks removed). */
  cleanedText: string;
  /** Human-readable reasoning extracted from the response. */
  reasoning: string;
  /** Calibrated confidence score (0–1). */
  confidence: number;
  /** Entry titles/names referenced in the response. */
  memoryReferences: string[];
  /** Categories that were actually used in the response. */
  categoriesUsed: string[];
  /** Suggested follow-up chips. */
  suggestionChips: string[];
  /** Additional UI metadata. */
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  /** Whether the response is based on actual user data vs general knowledge. */
  basedOnUserData: boolean;
  /** Key data points referenced (e.g. ["24 movies", "8.7 avg rating"]). */
  keyDataPoints: string[];
  /** Response length estimate. */
  responseLength: 'brief' | 'moderate' | 'detailed';
  /** Whether the response makes predictions or recommendations. */
  hasPrediction: boolean;
  /** Whether the response includes a comparison. */
  hasComparison: boolean;
}

// ── Pattern extraction ─────────────────────────────────────

/**
 * Extract memory entity references from response text.
 * Looks for known movie titles, restaurant names, destinations, etc.
 */
function extractMemoryReferences(
  text: string,
  memories: MemoryBundle,
): string[] {
  const references: Set<string> = new Set();
  const textLower = text.toLowerCase();

  // Check movies
  for (const m of memories.movies) {
    if (textLower.includes(m.title.toLowerCase())) {
      references.add(m.title);
    }
  }

  // Check food
  for (const f of memories.food) {
    if (textLower.includes(f.restaurant.toLowerCase())) {
      references.add(f.restaurant);
    }
  }

  // Check travel
  for (const t of memories.travel) {
    if (textLower.includes(t.destination.toLowerCase())) {
      references.add(t.destination);
    }
  }

  // Check notes for unique terms
  for (const n of memories.notes) {
    const words = n.text.split(/\s+/).filter((w) => w.length > 5);
    for (const word of words.slice(0, 3)) {
      if (textLower.includes(word.toLowerCase())) {
        references.add(word);
      }
    }
  }

  return [...references].slice(0, 10);
}

/**
 * Determine which categories the response mentions.
 */
function extractCategoriesUsed(text: string): string[] {
  const textLower = text.toLowerCase();
  const categories: string[] = [];

  const categorySignals: [string, string[]][] = [
    ['movie', ['movie', 'film', 'watch', 'genre', 'director', 'actor', 'cinema']],
    ['food', ['food', 'restaurant', 'cuisine', 'meal', 'dish', 'eat', 'cafe']],
    ['travel', ['travel', 'trip', 'destination', 'visit', 'vacation', 'journey']],
    ['note', ['note', 'journal', 'thought', 'diary', 'reflection']],
    ['wishlist', ['wishlist', 'bucket list', 'want', 'goal']],
  ];

  for (const [category, signals] of categorySignals) {
    if (signals.some((s) => textLower.includes(s))) {
      categories.push(category);
    }
  }

  return categories;
}

/**
 * Try to parse the machine-readable metadata block from the response.
 * Falls back to extracting reasoning from the last sentence patterns.
 */
function parseInlineMetadataBlock(text: string): {
  reasoning: string;
  suggestionChips: string[];
} {
  // Try structured JSON block: <!--ECHOOS_META{...}-->
  const metaMatch = text.match(/<!--ECHOOS_META(\{[\s\S]*?\})-->/);

  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]) as {
        reasoning?: string;
        suggestionChips?: string[];
      };
      return {
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
        suggestionChips: Array.isArray(parsed.suggestionChips)
          ? parsed.suggestionChips.slice(0, 5)
          : [],
      };
    } catch {
      // Malformed JSON — fall through
    }
  }

  // Fallback: try --- delimited block
  const fallbackMatch = text.match(/---\s*\nReasoning:\s*(.+?)(\n|$)/s);
  return {
    reasoning: fallbackMatch ? fallbackMatch[1].trim() : '',
    suggestionChips: [],
  };
}

/**
 * Detect key data points mentioned in the response.
 */
function extractKeyDataPoints(text: string): string[] {
  const points: string[] = [];
  const patterns = [
    /\b(\d+)\s*(movies?|films?|entries?|trips?|notes?|meals?)\b/gi,
    /\b(\d+\.?\d*)\s*\/\s*10\b/g,
    /\b(\d+)%\s*(complete|rate|confidence)\b/gi,
    /\b(average\s+\w+\s+(rating|score|pace)[:\s]+(\d+\.?\d*))\b/gi,
    /\b(top\s+\d+\s+\w+)\b/gi,
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      points.push(match[0]);
      if (points.length >= 5) break;
    }
    if (points.length >= 5) break;
  }

  return points;
}

/**
 * Check if the response contains predictions or comparisons.
 */
function analyzeResponseContent(text: string): {
  hasPrediction: boolean;
  hasComparison: boolean;
  responseLength: 'brief' | 'moderate' | 'detailed';
} {
  const textLower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  const responseLength =
    wordCount < 50 ? 'brief' :
    wordCount < 150 ? 'moderate' :
    'detailed';

  return {
    hasPrediction: /\b(predict|would enjoy|will like|recommend)\b/i.test(textLower),
    hasComparison: /\b(compare|vs\.?|versus|better than|worse than|rather)\b/i.test(textLower),
    responseLength,
  };
}

/**
 * Check if the response actually references user data vs generic knowledge.
 */
function checkUserDataBasis(
  text: string,
  memories: MemoryBundle,
  patterns: PatternAnalysis,
): boolean {
  const textLower = text.toLowerCase();

  // Check for references to user's specific data points
  if (patterns.userProfile.totalEntries > 0) {
    const totalStr = String(patterns.userProfile.totalEntries);
    if (textLower.includes(totalStr)) return true;
  }

  // Check for category-specific data
  for (const [, count] of Object.entries(patterns.userProfile.entryCounts)) {
    if (count > 0 && textLower.includes(String(count))) return true;
  }

  // Check for movie title references
  for (const m of memories.movies) {
    if (textLower.includes(m.title.toLowerCase().slice(0, 8))) return true;
  }

  // Check for restaurant references
  for (const f of memories.food) {
    if (f.restaurant && textLower.includes(f.restaurant.toLowerCase().slice(0, 6))) return true;
  }

  // Check for destination references
  for (const t of memories.travel) {
    if (textLower.includes(t.destination.toLowerCase().slice(0, 6))) return true;
  }

  return false;
}

// ── Main processor ─────────────────────────────────────────

/**
 * Post-process a raw Groq response into a structured, UI-ready format.
 *
 * @param rawText - The raw response text from Groq
 * @param intent - The detected user intent
 * @param memories - The retrieved memory bundle
 * @param patterns - The computed pattern analysis
 * @param confidence - The data-driven confidence result
 * @param externalChips - Optional pre-generated suggestion chips
 * @returns A fully processed response with all metadata extracted
 */
export function processResponse(
  rawText: string,
  _intent: IntentType,
  memories: MemoryBundle,
  patterns: PatternAnalysis,
  confidence: ConfidenceResult,
  externalChips?: string[],
): ProcessedResponse {
  // ── Step 1: Parse inline metadata block ──────────────────
  const parsedMeta = parseInlineMetadataBlock(rawText);

  // ── Step 2: Clean the text (remove machine blocks) ───────
  let cleanedText = rawText
    .replace(/<!--ECHOOS_META\{[\s\S]*?\}-->/g, '')
    .replace(/<!--ECHOOS_META[\s\S]*?(?:-->|$)/g, '')
    .replace(/---\s*\nReasoning:\s*.+?(\n|$)/s, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If text stripping emptied the response (e.g. malformed tag), preserve rawText minus any prefix tag
  if (!cleanedText && rawText) {
    cleanedText = rawText.replace(/<!--ECHOOS_META[\s\S]*/g, '').trim() || rawText;
  }

  // ── Step 3: Extract memory references ────────────────────
  const memoryReferences = extractMemoryReferences(cleanedText, memories);

  // ── Step 4: Determine categories used ────────────────────
  const categoriesUsed = extractCategoriesUsed(cleanedText);

  // ── Step 5: Calibrate confidence ─────────────────────────
  // Blend AI confidence (if given) with data-driven confidence
  const aiConfidence = typeof parsedMeta.suggestionChips === 'object'
    ? 0.5 // neutral when we can't extract AI confidence
    : 0.5;
  const calibratedConfidence = Math.round(
    (confidence.overall * 0.6 + aiConfidence * 0.4) * 100,
  ) / 100;

  // ── Step 6: Extract key data points ──────────────────────
  const keyDataPoints = extractKeyDataPoints(cleanedText);

  // ── Step 7: Analyze response structure ───────────────────
  const { hasPrediction, hasComparison, responseLength } =
    analyzeResponseContent(cleanedText);

  // ── Step 8: Determine user data basis ────────────────────
  const basedOnUserData = checkUserDataBasis(cleanedText, memories, patterns);

  // ── Step 9: Assemble final chips ─────────────────────────
  const suggestionChips =
    externalChips ??
    parsedMeta.suggestionChips ??
    [];

  return {
    cleanedText,
    reasoning: parsedMeta.reasoning || '',
    confidence: calibratedConfidence,
    memoryReferences,
    categoriesUsed,
    suggestionChips,
    metadata: {
      basedOnUserData,
      keyDataPoints,
      responseLength,
      hasPrediction,
      hasComparison,
    },
  };
}
