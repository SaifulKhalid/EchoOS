/**
 * reasoningFormatter.ts
 *
 * Post-analysis module for the Memory Intelligence Layer.
 * Converts raw pattern analysis into structured, human-readable
 * reasoning that the AI can cite as evidence in its responses.
 *
 * Every recommendation must include WHY.
 * Every insight must include EVIDENCE.
 */

import type { PatternAnalysis } from './patternAnalyzer';
import type { IntentType } from './intentDetector';

export interface ReasoningBlock {
  /** The core reasoning narrative. */
  narrative: string;
  /** Specific evidence bullet points. */
  evidence: string[];
  /** Key numbers that support the reasoning. */
  supportingData: Record<string, number | string>;
}

/**
 * Generate reasoning for a recommendation response.
 */
function recommendationReasoning(patterns: PatternAnalysis): ReasoningBlock {
  const { userProfile, frequencies, correlations } = patterns;
  const evidence: string[] = [];
  const supportingData: Record<string, number | string> = {};

  if (userProfile.topGenres.length > 0) {
    const top = userProfile.topGenres[0];
    evidence.push(`Top genre is ${top.name} (${top.count} films watched)`);
    supportingData.topGenre = `${top.name} (${top.count})`;
  }

  if (userProfile.favoriteDirectors.length > 0) {
    evidence.push(`Most-watched director: ${userProfile.favoriteDirectors[0]}`);
    supportingData.favoriteDirector = userProfile.favoriteDirectors[0];
  }

  if (userProfile.avgMovieRating != null) {
    evidence.push(`Average movie rating: ${userProfile.avgMovieRating.toFixed(1)}/10`);
    supportingData.avgMovieRating = Number(userProfile.avgMovieRating.toFixed(1));
  }

  if (userProfile.topCuisines.length > 0) {
    evidence.push(`Preferred cuisines: ${userProfile.topCuisines.map((c) => c.name).join(', ')}`);
    supportingData.topCuisines = userProfile.topCuisines.map((c) => c.name).join(', ');
  }

  if (userProfile.topDestinations.length > 0) {
    evidence.push(`Favorite destinations: ${userProfile.topDestinations.map((d) => d.name).join(', ')}`);
  }

  if (correlations.moodVsRatings.length > 0) {
    const topMood = correlations.moodVsRatings[0];
    evidence.push(`Highest ratings occur in ${topMood.mood} mood (avg ${topMood.avgRating}/10)`);
    supportingData.bestRatedMood = `${topMood.mood} (${topMood.avgRating}/10)`;
  }

  const narrative = `Based on ${
    userProfile.totalEntries
  } total memories, I found clear preference signals${
    evidence.length > 0 ? `: ${evidence[0].toLowerCase()}` : ''
  }.`;

  return { narrative, evidence, supportingData };
}

/**
 * Generate reasoning for a pattern discovery response.
 */
function patternReasoning(patterns: PatternAnalysis): ReasoningBlock {
  const { userProfile, trends, correlations, recentActivity } = patterns;
  const evidence: string[] = [];
  const supportingData: Record<string, number | string> = {};

  // Rating trend
  if (trends.ratingTrend !== 'insufficient_data') {
    evidence.push(
      `Rating trend is ${trends.ratingTrend} across ${userProfile.entryCounts.movie} movies`,
    );
    supportingData.ratingTrend = trends.ratingTrend;
  }

  // Genre evolution
  if (trends.genreEvolution.length >= 2) {
    const early = trends.genreEvolution[0];
    const late = trends.genreEvolution[trends.genreEvolution.length - 1];
    evidence.push(`Genre interests shifted: ${early.genres.slice(0, 3).join(', ')} → ${late.genres.slice(0, 3).join(', ')}`);
    supportingData.genreEvolution = `${early.genres.slice(0, 3).join(', ')} → ${late.genres.slice(0, 3).join(', ')}`;
  }

  // Seasonal
  if (trends.seasonalPreferences.length > 0) {
    const spring = trends.seasonalPreferences.find((s) => s.season === 'spring');
    const winter = trends.seasonalPreferences.find((s) => s.season === 'winter');
    if (spring && winter && spring.topCategory !== winter.topCategory) {
      evidence.push(`Seasonal shift: ${spring.topCategory} in spring vs ${winter.topCategory} in winter`);
    }
  }

  // Weekend habits
  if (correlations.weekendHabits.length > 0) {
    evidence.push(correlations.weekendHabits[0]);
  }

  // Mood correlation
  if (correlations.moodVsRatings.length > 0) {
    const top = correlations.moodVsRatings[0];
    const bottom = correlations.moodVsRatings[correlations.moodVsRatings.length - 1];
    if (top !== bottom) {
      evidence.push(
        `${top.mood} mood correlates with highest ratings (${top.avgRating}/10) vs ${bottom.mood} (${bottom.avgRating}/10)`,
      );
    }
  }

  // Recency
  if (recentActivity.hasRecentData) {
    evidence.push(`${recentActivity.last30Days} entries in the last 30 days`);
    supportingData.recentActivity30d = recentActivity.last30Days;
  }

  // Frequency
  evidence.push(`Watch pace: ${frequencies.watchFrequency}`);
  evidence.push(`Travel pace: ${frequencies.travelFrequency}`);

  const narrative = evidence.length > 0
    ? `I analyzed ${userProfile.totalEntries} memories and identified ${evidence.length} patterns.`
    : 'Not enough data to surface meaningful patterns yet.';

  return { narrative, evidence, supportingData };
}

/**
 * Generate reasoning for a comparison response.
 */
function comparisonReasoning(patterns: PatternAnalysis): ReasoningBlock {
  const { userProfile, correlations } = patterns;
  const evidence: string[] = [];
  const supportingData: Record<string, number | string> = {};

  // Compare categories
  const catRatings = [
    { name: 'Movie', rating: userProfile.avgMovieRating },
    { name: 'Food', rating: userProfile.avgFoodRating },
    { name: 'Travel', rating: userProfile.avgTravelRating },
  ].filter((c) => c.rating != null) as { name: string; rating: number }[];

  if (catRatings.length >= 2) {
    catRatings.sort((a, b) => b.rating - a.rating);
    evidence.push(
      `Highest ratings in ${catRatings[0].name} (${catRatings[0].rating.toFixed(1)}/10) vs ${catRatings[catRatings.length - 1].name} (${catRatings[catRatings.length - 1].rating.toFixed(1)}/10)`,
    );
    catRatings.forEach((c) => {
      supportingData[`avg${c.name}Rating`] = Number(c.rating.toFixed(1));
    });
  }

  // Compare active categories
  const activeCats = Object.entries(userProfile.entryCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  if (activeCats.length >= 2) {
    evidence.push(
      `Most active: ${activeCats[0][0]} (${activeCats[0][1]} entries) vs ${activeCats[activeCats.length - 1][0]} (${activeCats[activeCats.length - 1][1]} entries)`,
    );
  }

  // Mood comparison
  if (correlations.moodVsRatings.length >= 2) {
    const [best, ...rest] = correlations.moodVsRatings;
    const worst = rest[rest.length - 1];
    evidence.push(
      `Best rated mood: ${best.mood} (${best.avgRating}/10) vs ${worst.mood} (${worst.avgRating}/10)`,
    );
  }

  const narrative = `Comparing across ${activeCats.length} categories with ${userProfile.totalEntries} total entries.`;

  return { narrative, evidence, supportingData };
}

/**
 * Generate reasoning for a prediction response.
 */
function predictionReasoning(patterns: PatternAnalysis): ReasoningBlock {
  const { userProfile, frequencies, trends } = patterns;
  const evidence: string[] = [];
  const supportingData: Record<string, number | string> = {};

  if (userProfile.highestRatedMovie) {
    evidence.push(
      `Highest rated: ${userProfile.highestRatedMovie.title} (${userProfile.highestRatedMovie.rating}/10)`,
    );
    supportingData.highestRated = `${userProfile.highestRatedMovie.title} (${userProfile.highestRatedMovie.rating}/10)`;
  }

  if (userProfile.topGenres.length > 0) {
    evidence.push(`Prefers ${userProfile.topGenres[0].name} (${userProfile.topGenres[0].count} films)`);
  }

  if (frequencies.rewatchRate > 0) {
    evidence.push(`Rewatches ${frequencies.rewatchRate}% of films`);
    supportingData.rewatchRate = `${frequencies.rewatchRate}%`;
  }

  if (trends.ratingTrend !== 'insufficient_data') {
    evidence.push(`Rating trend: ${trends.ratingTrend}`);
    supportingData.ratingTrend = trends.ratingTrend;
  }

  const narrative = `Predicting based on ${userProfile.totalEntries} data points with ${evidence.length} known patterns.`;

  return { narrative, evidence, supportingData };
}

/**
 * Generate reasoning for a reflection response.
 */
function reflectionReasoning(patterns: PatternAnalysis): ReasoningBlock {
  const { userProfile, trends, frequencies } = patterns;
  const evidence: string[] = [];
  const supportingData: Record<string, number | string> = {};

  if (trends.oldestMemory && trends.newestMemory) {
    evidence.push(
      `Memory span from ${trends.oldestMemory.title} (${trends.oldestMemory.type}) to ${trends.newestMemory.title} (${trends.newestMemory.type})`,
    );
  }

  if (trends.ratingTrend !== 'insufficient_data') {
    evidence.push(`Movie taste has ${trends.ratingTrend} over time`);
    supportingData.tasteEvolution = trends.ratingTrend;
  }

  if (frequencies.averageMoviesPerYear > 0) {
    evidence.push(`Watching ~${frequencies.averageMoviesPerYear} films per year`);
    supportingData.moviesPerYear = frequencies.averageMoviesPerYear;
  }

  if (frequencies.averageTripsPerYear > 0) {
    evidence.push(`Traveling ~${frequencies.averageTripsPerYear} times per year`);
    supportingData.tripsPerYear = frequencies.averageTripsPerYear;
  }

  if (userProfile.averageYearlyActivity > 0) {
    evidence.push(`~${userProfile.averageYearlyActivity} total entries per year on average`);
    supportingData.yearlyActivity = userProfile.averageYearlyActivity;
  }

  const narrative = `Reflecting on ${userProfile.totalEntries} memories across ${userProfile.averageYearlyActivity > 0 ? `${userProfile.averageYearlyActivity} entries/year` : 'your journey'}.`;

  return { narrative, evidence, supportingData };
}

/**
 * Generate reasoning for analytics response.
 */
function analyticsReasoning(patterns: PatternAnalysis): ReasoningBlock {
  const { userProfile, distributions, recentActivity } = patterns;
  const evidence: string[] = [];
  const supportingData: Record<string, number | string> = {};

  evidence.push(`Total: ${userProfile.totalEntries} entries`);
  supportingData.totalEntries = userProfile.totalEntries;

  const catStr = Object.entries(userProfile.entryCounts)
    .filter(([_, c]) => c > 0)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(', ');
  evidence.push(`Breakdown: ${catStr}`);

  if (userProfile.avgMovieRating != null) {
    evidence.push(`Avg movie rating: ${userProfile.avgMovieRating.toFixed(1)}/10`);
    supportingData.avgMovieRating = Number(userProfile.avgMovieRating.toFixed(1));
  }

  if (distributions.moodDistribution.length > 0) {
    const topMood = distributions.moodDistribution[0];
    evidence.push(`Most common mood: ${topMood.name} (${topMood.count} entries)`);
    supportingData.topMood = topMood.name;
  }

  if (recentActivity.hasRecentData) {
    evidence.push(`${recentActivity.last30Days} entries in last 30 days`);
    supportingData.recent30d = recentActivity.last30Days;
  }

  const narrative = `Analytics based on ${userProfile.totalEntries} memories.`;

  return { narrative, evidence, supportingData };
}

// ── Main formatter ─────────────────────────────────────────

/**
 * Generate structured reasoning for a given intent and pattern analysis.
 * Every recommendation includes WHY. Every insight includes EVIDENCE.
 * Every prediction includes supporting data.
 */
export function formatReasoning(
  intent: IntentType,
  patterns: PatternAnalysis,
): ReasoningBlock {
  switch (intent) {
    case 'recommendation':
      return recommendationReasoning(patterns);
    case 'pattern_discovery':
      return patternReasoning(patterns);
    case 'comparison':
      return comparisonReasoning(patterns);
    case 'prediction':
      return predictionReasoning(patterns);
    case 'reflection':
      return reflectionReasoning(patterns);
    case 'analytics':
      return analyticsReasoning(patterns);
    default:
      // For general intents, return a compact summary
      return {
        narrative: `Based on ${patterns.userProfile.totalEntries} memories.`,
        evidence: [],
        supportingData: { totalEntries: patterns.userProfile.totalEntries },
      };
  }
}

/**
 * Format a reasoning block as a compact, evidence-rich string for the
 * AI system prompt or machine metadata block.
 */
export function formatReasoningBlock(block: ReasoningBlock): string {
  const parts: string[] = [block.narrative];
  if (block.evidence.length > 0) {
    parts.push('Evidence:');
    for (const e of block.evidence) {
      parts.push(`  · ${e}`);
    }
  }
  return parts.join('\n');
}
