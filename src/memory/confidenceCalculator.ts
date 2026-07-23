/**
 * confidenceCalculator.ts
 *
 * Post-analysis module for the Memory Intelligence Layer.
 * Calculates calibrated confidence scores based on:
 *   - Data quantity (how many entries exist)
 *   - Data consistency (how coherent the patterns are)
 *   - Missing dimensions (gaps in categories)
 *   - Recency (how recent the data is)
 *
 * Used both for pre-response calibration and for the AI's confidence
 * annotation in its responses.
 */

import type { MemoryBundle } from './memoryRetriever';
import type { PatternAnalysis } from './patternAnalyzer';
import type { IntentType } from './intentDetector';

export interface ConfidenceResult {
  /** Overall confidence (0–1) for the AI response. */
  overall: number;
  /** Per-category confidence breakdown. */
  perCategory: Record<string, number>;
  /** Human-readable explanation of why this confidence was assigned. */
  reasoning: string;
  /** Whether the data is sufficient for the detected intent type. */
  sufficient: boolean;
  /** Specific data gaps that lower confidence. */
  gaps: string[];
}

// ── Intent-specific minimum data requirements ──────────────

const MIN_ENTRIES_BY_INTENT: Partial<Record<IntentType, number>> = {
  recommendation: 5,
  pattern_discovery: 10,
  comparison: 4,
  prediction: 8,
  reflection: 15,
  story_generation: 5,
  analytics: 10,
  timeline_query: 3,
  memory_lookup: 1,
};

// ── Confidence calculator ──────────────────────────────────

/**
 * Calculate the confidence level for an AI response based on available
 * memory data and the detected intent.
 *
 * @param intent - The detected user intent
 * @param retrieval - The retrieved memory bundle
 * @param patterns - The computed pattern analysis
 * @returns A confidence result with overall score, breakdown, and reasoning
 */
export function calculateConfidence(
  intent: IntentType,
  retrieval: { memories: MemoryBundle; totalCount: number; categoryCounts: Record<string, number> },
  patterns: PatternAnalysis,
): ConfidenceResult {
  const { userProfile, recentActivity } = patterns;
  const totalEntries = userProfile.totalEntries;
  const gaps: string[] = [];

  // ── Score: Data quantity (0–0.4) ─────────────────────────
  const quantityScore =
    totalEntries >= 100 ? 0.4 :
    totalEntries >= 50 ? 0.35 :
    totalEntries >= 25 ? 0.3 :
    totalEntries >= 10 ? 0.2 :
    totalEntries >= 5 ? 0.15 :
    totalEntries >= 1 ? 0.1 : 0;

  if (totalEntries === 0) gaps.push('No memories recorded yet');
  else if (totalEntries < 5) gaps.push('Very few memories (less than 5)');

  // ── Score: Category coverage (0–0.2) ─────────────────────
  const activeCategories = Object.entries(userProfile.entryCounts)
    .filter(([_, count]) => count > 0)
    .map(([cat]) => cat);

  const categoryScore = Math.min(activeCategories.length / 5, 1) * 0.2;

  if (activeCategories.length < 3) {
    gaps.push(`Only ${activeCategories.length} of 5 categories have data`);
  }

  // ── Score: Recency (0–0.2) ───────────────────────────────
  let recencyScore = 0;
  if (recentActivity.hasRecentData) {
    if (recentActivity.last7Days > 5) recencyScore = 0.2;
    else if (recentActivity.last7Days > 0) recencyScore = 0.15;
    else if (recentActivity.last30Days > 0) recencyScore = 0.1;
    else if (recentActivity.last90Days > 0) recencyScore = 0.05;
  }

  if (!recentActivity.hasRecentData && totalEntries > 0) {
    gaps.push('No recent activity (last 90 days)');
  }

  // ── Score: Consistency (0–0.2) ───────────────────────────
  let consistencyScore = 0.15; // start neutral

  // Bonus if we have clear patterns
  if (userProfile.topGenres.length >= 3) consistencyScore += 0.025;
  if (userProfile.favoriteDirectors.length > 0) consistencyScore += 0.025;
  if (userProfile.avgMovieRating != null) consistencyScore += 0.025;
  if (patterns.trends.ratingTrend !== 'insufficient_data') consistencyScore += 0.025;

  // Penalty for sparse data
  if (totalEntries < 5) consistencyScore -= 0.1;

  consistencyScore = Math.max(0, Math.min(0.2, consistencyScore));

  // ── Check intent-specific sufficiency ────────────────────
  const minRequired = MIN_ENTRIES_BY_INTENT[intent] ?? 1;
  const sufficient = totalEntries >= minRequired;

  if (!sufficient) {
    gaps.push(
      `Need at least ${minRequired} entries for a reliable ${intent.replace(/_/g, ' ')} (have ${totalEntries})`,
    );
  }

  // ── Calculate overall ────────────────────────────────────
  const rawOverall = quantityScore + categoryScore + recencyScore + consistencyScore;
  const overall = Math.round(Math.min(rawOverall, 1) * 100) / 100;

  // ── Per-category confidence ──────────────────────────────
  const perCategory: Record<string, number> = {};
  for (const [cat, count] of Object.entries(userProfile.entryCounts)) {
    if (count >= 20) perCategory[cat] = 0.8;
    else if (count >= 10) perCategory[cat] = 0.65;
    else if (count >= 5) perCategory[cat] = 0.5;
    else if (count >= 1) perCategory[cat] = 0.3;
    else perCategory[cat] = 0;
  }

  // ── Reasoning ────────────────────────────────────────────
  const reasoningParts: string[] = [];
  if (totalEntries > 0) {
    reasoningParts.push(`Based on ${totalEntries} memories across ${activeCategories.length} categories`);
  }
  if (recentActivity.hasRecentData) {
    reasoningParts.push(`with activity in the last 30 days (${recentActivity.last30Days} entries)`);
  }
  if (patterns.trends.ratingTrend !== 'insufficient_data') {
    reasoningParts.push(`and a ${patterns.trends.ratingTrend} rating trend`);
  }
  reasoningParts.push(`confidence is ${Math.round(overall * 100)}%`);

  return {
    overall,
    perCategory,
    reasoning: reasoningParts.join(', '),
    sufficient,
    gaps,
  };
}

/**
 * Quick confidence check suitable for the AI prompt — returns a short
 * string annotation to include in the response.
 */
export function formatConfidenceAnnotation(confidence: ConfidenceResult): string {
  const pct = Math.round(confidence.overall * 100);
  if (confidence.gaps.length > 0 && confidence.overall < 0.5) {
    return `(Confidence: ${pct}% — limited by: ${confidence.gaps.slice(0, 2).join('; ')})`;
  }
  return `(Confidence: ${pct}%)`;
}
