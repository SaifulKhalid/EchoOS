/**
 * contextBuilder.ts
 *
 * STEP 4 of the Memory Intelligence Layer.
 * Builds a structured, intelligence-rich context object instead of raw
 * memory dumps. The output is a formatted string designed to be embedded
 * in the Groq system prompt.
 *
 * Structure:
 *   User Profile — concise summary of counts, averages, favorites
 *   Detected Patterns — trends, correlations, behaviors
 *   Relevant Memories — only entries related to the user's intent
 *   Recent Activity — snapshot of recent engagement
 */

import type { MemoryBundle } from './memoryRetriever';
import type { IntentResult } from './intentDetector';
import type { PatternAnalysis } from './patternAnalyzer';

export interface StructuredContext {
  /** Formatted string ready for system prompt embedding. */
  formatted: string;
  /** Machine-readable metadata for post-processing. */
  metadata: {
    totalEntriesReferenced: number;
    categoriesUsed: string[];
    patternsDetected: number;
    hasRecentActivity: boolean;
    confidenceFloor: number;
  };
}

// ── Helpers ─────────────────────────────────────────────────

function formatLabel(label: string): string {
  return label
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatCounts(counts: { name: string; count: number }[]): string {
  return counts.map((c) => `${c.name} (${c.count})`).join(', ');
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(', ') : 'None recorded';
}

// ── Context builder ────────────────────────────────────────

/**
 * Build a structured context string from the memory retrieval and analysis.
 *
 * @param intent - The detected user intent
 * @param retrieval - The retrieved memory bundle and counts
 * @param patterns - The computed pattern analysis
 * @returns A structured context object with formatted text and metadata
 */
export function buildStructuredContext(
  intent: IntentResult,
  retrieval: { memories: MemoryBundle; totalCount: number; categoryCounts: Record<string, number> },
  patterns: PatternAnalysis,
): StructuredContext {
  const sections: string[] = [];
  const { userProfile, trends, frequencies, correlations, recentActivity } = patterns;

  // ── Section: USER PROFILE ─────────────────────────────────
  const profileLines: string[] = ['## User Profile'];

  if (userProfile.totalEntries > 0) {
    profileLines.push(`Total Memories Logged: ${userProfile.totalEntries}`);
    profileLines.push(
      `Breakdown: Movies ${userProfile.entryCounts.movie} | Food ${userProfile.entryCounts.food} | Travel ${userProfile.entryCounts.travel} | Notes ${userProfile.entryCounts.note} | Wishlist ${userProfile.entryCounts.wishlist}`,
    );
  }

  if (userProfile.mostActiveCategory) {
    profileLines.push(`Most Active Category: ${formatLabel(userProfile.mostActiveCategory)}`);
  }

  if (userProfile.averageYearlyActivity > 0) {
    profileLines.push(`Average Yearly Activity: ~${userProfile.averageYearlyActivity} entries`);
  }

  if (userProfile.avgMovieRating != null) {
    profileLines.push(`Average Movie Rating: ${userProfile.avgMovieRating.toFixed(1)}/10`);
  }
  if (userProfile.avgFoodRating != null) {
    profileLines.push(`Average Food Rating: ${userProfile.avgFoodRating.toFixed(1)}/10`);
  }
  if (userProfile.avgTravelRating != null) {
    profileLines.push(`Average Travel Rating: ${userProfile.avgTravelRating.toFixed(1)}/10`);
  }

  if (userProfile.topGenres.length > 0) {
    profileLines.push(`Top Genres: ${formatCounts(userProfile.topGenres)}`);
  }
  if (userProfile.topCuisines.length > 0) {
    profileLines.push(`Top Cuisines: ${formatCounts(userProfile.topCuisines)}`);
  }
  if (userProfile.topDestinations.length > 0) {
    profileLines.push(`Most Visited Destinations: ${formatCounts(userProfile.topDestinations)}`);
  }
  if (userProfile.favoriteDirectors.length > 0) {
    profileLines.push(`Favorite Directors: ${formatList(userProfile.favoriteDirectors)}`);
  }
  if (userProfile.favoriteActors.length > 0) {
    profileLines.push(`Favorite Actors: ${formatList(userProfile.favoriteActors)}`);
  }
  if (userProfile.favoriteDishes.length > 0) {
    profileLines.push(`Favorite Dishes: ${formatList(userProfile.favoriteDishes)}`);
  }
  if (userProfile.highestRatedMovie) {
    profileLines.push(
      `Highest Rated Movie: ${userProfile.highestRatedMovie.title} (${userProfile.highestRatedMovie.rating}/10)`,
    );
  }
  if (userProfile.mostRewatchedMovie) {
    profileLines.push(
      `Most Rewatched: ${userProfile.mostRewatchedMovie.title} (${userProfile.mostRewatchedMovie.count}x)`,
    );
  }

  sections.push(profileLines.join('\n'));

  // ── Section: RHYTHM & FREQUENCY ──────────────────────────
  const freqLines: string[] = ['## Rhythm & Frequency'];
  freqLines.push(`Watching Pace: ${frequencies.watchFrequency}`);
  freqLines.push(`Travel Pace: ${frequencies.travelFrequency}`);
  freqLines.push(`Dining Pace: ${frequencies.diningFrequency}`);

  if (frequencies.rewatchRate > 0) {
    freqLines.push(`Rewatch Rate: ${frequencies.rewatchRate}% of watched movies`);
  }
  if (frequencies.wishlistCompletionRate > 0) {
    freqLines.push(`Wishlist Completion: ${frequencies.wishlistCompletionRate}%`);
  }

  sections.push(freqLines.join('\n'));

  // ── Section: DETECTED PATTERNS ───────────────────────────
  const patternLines: string[] = ['## Detected Patterns'];

  // Preference evolution
  if (trends.preferenceEvolution.length > 0) {
    patternLines.push('Preference Evolution:');
    for (const ev of trends.preferenceEvolution) {
      patternLines.push(`  · ${ev}`);
    }
  }

  // Rating trend
  if (trends.ratingTrend !== 'insufficient_data') {
    patternLines.push(
      `Rating Trend: ${formatLabel(trends.ratingTrend)} (based on ${retrieval.totalCount} rated entries)`,
    );
  }

  // Seasonal preferences
  if (trends.seasonalPreferences.length > 0) {
    const seasonStrs = trends.seasonalPreferences
      .map((s) => `${s.season}: mostly ${s.topCategory}`)
      .join(' | ');
    patternLines.push(`Seasonal Pattern: ${seasonStrs}`);
  }

  // Weekend habits
  if (correlations.weekendHabits.length > 0) {
    for (const habit of correlations.weekendHabits) {
      patternLines.push(`  · ${habit}`);
    }
  }

  // Genre evolution
  if (trends.genreEvolution.length >= 2) {
    const firstGenres = trends.genreEvolution[0].genres;
    const lastGenres = trends.genreEvolution[trends.genreEvolution.length - 1].genres;
    const newG = lastGenres.filter((g) => !firstGenres.includes(g));
    const lostG = firstGenres.filter((g) => !lastGenres.includes(g));
    if (newG.length > 0) {
      patternLines.push(`  · Genre expansion: ${newG.slice(0, 3).join(', ')} became part of the rotation`);
    }
    if (lostG.length > 0) {
      patternLines.push(`  · Genre fade: ${lostG.slice(0, 3).join(', ')} watched less over time`);
    }
  }

  // Mood vs ratings
  if (correlations.moodVsRatings.length > 0) {
    const topMood = correlations.moodVsRatings[0];
    patternLines.push(
      `  · Best rated mood: ${formatLabel(topMood.mood)} (avg ${topMood.avgRating}/10 across ${topMood.count} entries)`,
    );
  }

  // Travel-movie correlation
  if (correlations.travelMoviePattern && !correlations.travelMoviePattern.includes('No clear')) {
    patternLines.push(`  · ${correlations.travelMoviePattern}`);
  }

  // Mood-category correlation
  if (correlations.moodToCategory.length > 0) {
    const topMoodCat = correlations.moodToCategory[0];
    patternLines.push(
      `  · Mood association: ${formatLabel(topMoodCat.mood)} mood most often appears in ${formatLabel(topMoodCat.topCategory)} entries`,
    );
  }

  sections.push(patternLines.join('\n'));

  // ── Section: RELEVANT MEMORIES (based on intent) ─────────
  const memLines: string[] = ['## Relevant Memories'];

  const { memories } = retrieval;
  const categories = intent.categories;

  // Show relevant entries — limited to 3-5 per category to avoid token waste
  const MAX_ENTRIES = 5;

  if (categories.includes('movie') && memories.movies.length > 0) {
    memLines.push('Movies:');
    for (const m of memories.movies.slice(0, MAX_ENTRIES)) {
      const parts = [
        m.title,
        m.year ? `(${m.year})` : '',
        m.genres?.length ? `[${m.genres.slice(0, 3).join(', ')}]` : '',
        m.rating != null ? `★${m.rating}` : '',
        m.director ? `Dir: ${m.director}` : '',
        m.rewatch ? '(rewatched)' : '',
      ].filter(Boolean);
      memLines.push(`  · ${parts.join(' ')}`);
    }
    if (memories.movies.length > MAX_ENTRIES) {
      memLines.push(`  … and ${memories.movies.length - MAX_ENTRIES} more`);
    }
  }

  if (categories.includes('food') && memories.food.length > 0) {
    memLines.push('Food:');
    for (const f of memories.food.slice(0, MAX_ENTRIES)) {
      const parts = [
        f.restaurant,
        f.cuisine ? `(${f.cuisine})` : '',
        f.rating != null ? `★${f.rating}` : '',
        f.favoriteDishes?.length ? `Faves: ${f.favoriteDishes.join(', ')}` : '',
      ].filter(Boolean);
      memLines.push(`  · ${parts.join(' ')}`);
    }
    if (memories.food.length > MAX_ENTRIES) {
      memLines.push(`  … and ${memories.food.length - MAX_ENTRIES} more`);
    }
  }

  if (categories.includes('travel') && memories.travel.length > 0) {
    memLines.push('Travel:');
    for (const t of memories.travel.slice(0, MAX_ENTRIES)) {
      const parts = [
        t.destination,
        t.durationDays ? `${t.durationDays}d` : '',
        t.rating != null ? `★${t.rating}` : '',
        t.budget ? `$${t.budget}` : '',
      ].filter(Boolean);
      memLines.push(`  · ${parts.join(' ')}`);
    }
    if (memories.travel.length > MAX_ENTRIES) {
      memLines.push(`  … and ${memories.travel.length - MAX_ENTRIES} more`);
    }
  }

  if (categories.includes('note') && memories.notes.length > 0) {
    memLines.push('Notes:');
    for (const n of memories.notes.slice(0, Math.min(MAX_ENTRIES, 3))) {
      const preview = n.text.length > 100 ? n.text.slice(0, 100) + '…' : n.text;
      memLines.push(`  · ${n.title ? `[${n.type}] ${n.title}: ` : `[${n.type}] `}${preview}`);
    }
    if (memories.notes.length > MAX_ENTRIES) {
      memLines.push(`  … and ${memories.notes.length - MAX_ENTRIES} more`);
    }
  }

  if (categories.includes('wishlist') && memories.wishlist.length > 0) {
    memLines.push('Wishlist:');
    for (const w of memories.wishlist.slice(0, MAX_ENTRIES)) {
      memLines.push(`  · ${w.done ? '✓' : '○'} [${w.category}] ${w.title}`);
    }
    if (memories.wishlist.length > MAX_ENTRIES) {
      memLines.push(`  … and ${memories.wishlist.length - MAX_ENTRIES} more`);
    }
  }

  if (memLines.length === 1) {
    memLines.push('No relevant memories found for this query.');
  }

  sections.push(memLines.join('\n'));

  // ── Section: RECENT ACTIVITY ─────────────────────────────
  const recentLines: string[] = ['## Recent Activity'];
  if (recentActivity.hasRecentData) {
    recentLines.push(`Last 7 days: ${recentActivity.last7Days} entries`);
    recentLines.push(`Last 30 days: ${recentActivity.last30Days} entries`);
    recentLines.push(`Last 90 days: ${recentActivity.last90Days} entries`);
  } else {
    recentLines.push('No activity recorded in the past 90 days.');
  }

  sections.push(recentLines.join('\n'));

  // ── Section: OLDEST & NEWEST ─────────────────────────────
  const timeLines: string[] = ['## Memory Timeline'];
  if (trends.oldestMemory) {
    timeLines.push(
      `Oldest Memory: ${formatLabel(trends.oldestMemory.type)} — ${trends.oldestMemory.title}`,
    );
  }
  if (trends.newestMemory) {
    timeLines.push(
      `Newest Memory: ${formatLabel(trends.newestMemory.type)} — ${trends.newestMemory.title}`,
    );
  }
  if (retrieval.totalCount > 0) {
    timeLines.push(`Memory Span: ${trends.oldestMemory && trends.newestMemory ? 'Active' : 'Growing'}`);
  }

  sections.push(timeLines.join('\n'));

  // ── Assemble ─────────────────────────────────────────────
  const formatted = sections.join('\n\n');

  const metadata = {
    totalEntriesReferenced: retrieval.totalCount,
    categoriesUsed: categories,
    patternsDetected: patternLines.length - 1, // subtract header
    hasRecentActivity: recentActivity.hasRecentData,
    confidenceFloor: calculateConfidenceFloor(retrieval.totalCount),
  };

  return { formatted, metadata };
}

/**
 * Calculate a rough confidence floor based on data quantity.
 * The AI uses this to calibrate how strongly it can state insights.
 */
function calculateConfidenceFloor(totalEntries: number): number {
  if (totalEntries >= 100) return 0.8;
  if (totalEntries >= 50) return 0.7;
  if (totalEntries >= 20) return 0.6;
  if (totalEntries >= 10) return 0.5;
  if (totalEntries >= 5) return 0.4;
  return 0.3;
}
