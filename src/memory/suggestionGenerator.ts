/**
 * suggestionGenerator.ts
 *
 * Post-analysis module for the Memory Intelligence Layer.
 * Generates intelligent follow-up suggestion chips based on:
 *   - The detected user intent
 *   - The available memory data
 *   - Detected patterns that the user might want to explore further
 *
 * These chips are shown below each AI response so conversation flows
 * naturally toward deeper exploration.
 */

import type { IntentType } from './intentDetector';
import type { PatternAnalysis } from './patternAnalyzer';

export interface SuggestionSet {
  /** 2-4 follow-up questions the user could click. */
  chips: string[];
  /** Short label describing the suggestion category. */
  category: string;
}

// ── Greeting suggestions ───────────────────────────────────

function greetingSuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile } = patterns;
  const chips: string[] = [];

  if (userProfile.totalEntries > 0) {
    chips.push('What patterns do you see in my memories?');
    chips.push('Tell me something I might have missed');
  }
  if (userProfile.entryCounts.movie > 0) {
    chips.push('What does my movie taste say about me?');
  }
  if (userProfile.entryCounts.travel > 0) {
    chips.push('Summarize my travel history');
  }

  if (chips.length === 0) {
    chips.push('What should I track first?');
    chips.push('How does EchoOS work?');
  }

  return { chips: chips.slice(0, 3), category: 'Explore' };
}

// ── Recommendation suggestions ─────────────────────────────

function recommendationSuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile } = patterns;
  const chips: string[] = [];

  if (userProfile.entryCounts.movie >= 5) {
    const genre = userProfile.topGenres[0]?.name?.toLowerCase() ?? '';
    if (genre) {
      chips.push(`Recommend a ${genre} movie I haven't watched`);
    }
    chips.push('What should I watch next based on my history?');
  }
  if (userProfile.entryCounts.food >= 3) {
    const cuisine = userProfile.topCuisines[0]?.name?.toLowerCase() ?? '';
    if (cuisine) {
      chips.push(`Suggest a ${cuisine} restaurant to try`);
    }
  }
  if (userProfile.entryCounts.travel >= 2) {
    chips.push('Where should I travel next?');
    chips.push('Which destination fits my travel style?');
  }

  if (chips.length === 0) {
    chips.push('What can you recommend?');
    chips.push('What do I need more data on for good recommendations?');
  }

  return { chips: chips.slice(0, 4), category: 'Recommendations' };
}

// ── Pattern discovery suggestions ──────────────────────────

function patternSuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile, trends, correlations } = patterns;
  const chips: string[] = [];

  if (trends.ratingTrend !== 'insufficient_data') {
    chips.push(`Why is my rating trend ${trends.ratingTrend}?`);
  }
  if (trends.genreEvolution.length >= 2) {
    chips.push('How have my genre preferences changed?');
  }
  if (correlations.moodVsRatings.length > 0) {
    chips.push('How does my mood affect my ratings?');
  }
  if (correlations.weekendHabits.length > 0) {
    chips.push('Tell me more about my weekend habits');
  }
  if (userProfile.entryCounts.movie > 0 && userProfile.entryCounts.food > 0) {
    chips.push('Compare my movie and food tastes');
  }
  if (trends.seasonalPreferences.length > 0) {
    chips.push('What do my seasonal preferences reveal?');
  }

  if (chips.length === 0) {
    chips.push('What patterns can you find?');
    chips.push('What should I log to get better insights?');
  }

  return { chips: chips.slice(0, 4), category: 'Patterns' };
}

// ── Timeline query suggestions ─────────────────────────────

function timelineSuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile } = patterns;
  const chips: string[] = [];

  if (userProfile.entryCounts.movie > 0) {
    chips.push('Show me my movie watching timeline');
  }
  if (userProfile.entryCounts.travel > 0) {
    chips.push('Show me where I traveled this year');
  }
  if (userProfile.entryCounts.note > 0) {
    chips.push('Timeline of my thoughts');
  }
  if (Object.values(userProfile.entryCounts).some((c) => c > 0)) {
    chips.push('What did I do last month?');
  }

  if (chips.length === 0) {
    chips.push('What would you like to see a timeline of?');
  }

  return { chips: chips.slice(0, 3), category: 'Timeline' };
}

// ── Memory lookup suggestions ──────────────────────────────

function lookupSuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile } = patterns;
  const chips: string[] = [];

  if (userProfile.highestRatedMovie) {
    chips.push(`Why did I rate ${userProfile.highestRatedMovie.title} so high?`);
  }
  if (userProfile.mostRewatchedMovie) {
    chips.push(`Why do I keep rewatching ${userProfile.mostRewatchedMovie.title}?`);
  }
  if (userProfile.favoriteDirectors.length > 0) {
    chips.push(`Tell me more about ${userProfile.favoriteDirectors[0]} films I've watched`);
  }
  if (userProfile.topDestinations.length > 0) {
    chips.push(`What do I remember about ${userProfile.topDestinations[0].name}?`);
  }
  if (userProfile.favoriteDishes.length > 0) {
    chips.push(`What's my history with ${userProfile.favoriteDishes[0]}?`);
  }

  return { chips: chips.slice(0, 3), category: 'Recall' };
}

// ── Comparison suggestions ─────────────────────────────────

function comparisonSuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile, correlations } = patterns;
  const chips: string[] = [];

  if (userProfile.entryCounts.movie > 0 && userProfile.entryCounts.food > 0) {
    chips.push('Compare my movie ratings vs food ratings');
  }
  if (userProfile.entryCounts.movie > 0 && userProfile.entryCounts.travel > 0) {
    chips.push('Compare my movie and travel habits');
  }
  if (correlations.moodVsRatings.length >= 2) {
    chips.push('Which mood gives me the best experiences?');
  }
  if (Object.values(userProfile.entryCounts).filter((c) => c > 0).length >= 3) {
    chips.push('Which category do I engage with most?');
  }

  if (chips.length === 0) {
    chips.push('Compare categories I have data in');
  }

  return { chips: chips.slice(0, 3), category: 'Compare' };
}

// ── Prediction suggestions ─────────────────────────────────

function predictionSuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile, trends } = patterns;
  const chips: string[] = [];

  if (userProfile.entryCounts.movie >= 5) {
    const genre = userProfile.topGenres[0]?.name?.toLowerCase() ?? '';
    chips.push(genre ? `Predict my rating for a ${genre} film` : 'Predict what I would rate a new movie');
  }
  if (trends.ratingTrend !== 'insufficient_data') {
    chips.push('What will my average rating be next year?');
  }
  if (userProfile.entryCounts.travel >= 2) {
    chips.push('Predict my next travel destination');
  }

  return { chips: chips.slice(0, 3), category: 'Predict' };
}

// ── Reflection suggestions ─────────────────────────────────

function reflectionSuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile, trends } = patterns;
  const chips: string[] = [];

  if (trends.oldestMemory && trends.newestMemory) {
    chips.push('How have I changed since my first memory?');
  }
  if (trends.ratingTrend !== 'insufficient_data') {
    chips.push('What drove my taste evolution?');
  }
  if (userProfile.entryCounts.note > 0) {
    chips.push('What themes run through my notes?');
  }
  chips.push('Summarize my year so far');

  return { chips: chips.slice(0, 3), category: 'Reflect' };
}

// ── Story generation suggestions ───────────────────────────

function storySuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile } = patterns;
  const chips: string[] = [];

  if (userProfile.entryCounts.travel > 0) {
    chips.push('Tell my travel story');
  }
  if (userProfile.entryCounts.movie > 0) {
    chips.push('Tell the story of my movie year');
  }
  if (userProfile.entryCounts.food > 0) {
    chips.push('Tell my culinary journey');
  }
  if (Object.values(userProfile.entryCounts).some((c) => c > 0)) {
    chips.push('Write a summary of everything I tracked');
  }

  return { chips: chips.slice(0, 3), category: 'Stories' };
}

// ── Analytics suggestions ──────────────────────────────────

function analyticsSuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile, distributions, trends } = patterns;
  const chips: string[] = [];

  chips.push('Show me my rating distribution');
  if (distributions.moodDistribution.length > 0) {
    chips.push('What moods do I feel most often?');
  }
  if (trends.ratingTrend !== 'insufficient_data') {
    chips.push('Is my taste improving?');
  }
  if (userProfile.entryCounts.travel > 0) {
    chips.push('How much have I traveled?');
  }

  return { chips: chips.slice(0, 4), category: 'Analytics' };
}

// ── General conversation suggestions ───────────────────────

function generalSuggestions(patterns: PatternAnalysis): SuggestionSet {
  const { userProfile } = patterns;
  const chips: string[] = [];

  if (userProfile.totalEntries > 0) {
    chips.push('What patterns do you see?');
    chips.push('Tell me something interesting about my data');
    chips.push('What should I track more of?');
  } else {
    chips.push('How do I get started?');
    chips.push('What can I track?');
  }

  return { chips: chips.slice(0, 3), category: 'Explore' };
}

// ── Intent → generator mapping ─────────────────────────────

const GENERATORS: Record<IntentType, (p: PatternAnalysis) => SuggestionSet> = {
  greeting: greetingSuggestions,
  recommendation: recommendationSuggestions,
  pattern_discovery: patternSuggestions,
  timeline_query: timelineSuggestions,
  memory_lookup: lookupSuggestions,
  comparison: comparisonSuggestions,
  prediction: predictionSuggestions,
  reflection: reflectionSuggestions,
  story_generation: storySuggestions,
  analytics: analyticsSuggestions,
  general_conversation: generalSuggestions,
};

// ── Main generator ─────────────────────────────────────────

/**
 * Generate intelligent follow-up suggestion chips based on the
 * detected intent and the user's memory patterns.
 *
 * @param intent - The detected user intent
 * @param patterns - The computed pattern analysis
 * @param recallLimit - Maximum number of chips to return (default 4)
 * @returns A set of suggestion chips with a category label
 */
export function generateSuggestions(
  intent: IntentType,
  patterns: PatternAnalysis,
  recallLimit: number = 4,
): SuggestionSet {
  const generator = GENERATORS[intent] ?? generalSuggestions;
  const result = generator(patterns);
  return {
    chips: result.chips.slice(0, recallLimit),
    category: result.category,
  };
}

/**
 * Generate chips for the empty-state welcome screen when no
 * conversation has started yet.
 */
export function generateWelcomeChips(patterns: PatternAnalysis): string[] {
  const { userProfile } = patterns;
  const chips: string[] = [];

  if (userProfile.totalEntries > 0) {
    chips.push('What patterns do you see in my movie taste?');
    chips.push('Tell me something about myself I might have missed');
    chips.push('What do my ratings say about my preferences?');
    chips.push('Compare my habits from last year to this year');
  } else {
    chips.push('What should I track first?');
    chips.push('How do I get started with EchoOS?');
    chips.push('What can you help me with?');
  }

  return chips;
}
