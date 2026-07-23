/**
 * memory/index.ts
 *
 * MemoryPipeline — the orchestrator for the Memory Intelligence Layer.
 *
 * This is THE entry point for the entire intelligence pipeline.
 * Before every Groq request, call `MemoryPipeline.process()` which:
 *
 *   STEP 1 — Detect user intent (intentDetector)
 *   STEP 2 — Retrieve only relevant memories (memoryRetriever)
 *   STEP 3 — Compute intelligence patterns (patternAnalyzer)
 *   STEP 4 — Build structured context (contextBuilder)
 *
 * After Groq replies, call `MemoryPipeline.postProcess()` which:
 *
 *   STEP 5 — Calculate confidence (confidenceCalculator)
 *   STEP 6 — Generate reasoning (reasoningFormatter)
 *   STEP 7 — Generate suggestions (suggestionGenerator)
 *   STEP 8 — Format response (responseFormatter)
 *
 * Usage:
 *   const pipeline = new MemoryPipeline();
 *   const { systemPrompt, intent, patterns, retrieval } = await pipeline.process(uid, message, persona);
 *   // ... send to Groq ...
 *   const processed = pipeline.postProcess(groqResponse, { intent, patterns, retrieval, memories });
 */

import type { AiPersona } from '@/hooks/usePreferences';
import type { MemoryBundle } from './memoryRetriever';
import type { ProcessedResponse } from './responseFormatter';

import { detectIntent, type IntentResult } from './intentDetector';
import { retrieveMemories, type RetrievalResult } from './memoryRetriever';
import { analyzePatterns, type PatternAnalysis } from './patternAnalyzer';
import { buildStructuredContext, type StructuredContext } from './contextBuilder';
import { calculateConfidence, formatConfidenceAnnotation, type ConfidenceResult } from './confidenceCalculator';
import { formatReasoning, formatReasoningBlock, type ReasoningBlock } from './reasoningFormatter';
import { generateSuggestions, generateWelcomeChips } from './suggestionGenerator';
import { processResponse } from './responseFormatter';

// ── Re-exports ─────────────────────────────────────────────

export type {
  IntentResult,
  IntentType,
} from './intentDetector';

export type {
  MemoryBundle,
  RetrievalResult,
  RetrievalOptions,
} from './memoryRetriever';

export type {
  PatternAnalysis,
  NamedCount,
  RatingDistribution,
  MoodRating,
} from './patternAnalyzer';

export type {
  StructuredContext,
} from './contextBuilder';

export type {
  ConfidenceResult,
} from './confidenceCalculator';

export type {
  ReasoningBlock,
} from './reasoningFormatter';

export type {
  SuggestionSet,
} from './suggestionGenerator';

export type {
  ProcessedResponse,
  ResponseMetadata,
} from './responseFormatter';

// Re-export key functions
export {
  detectIntent,
  retrieveMemories,
  analyzePatterns,
  buildStructuredContext,
  calculateConfidence,
  formatConfidenceAnnotation,
  formatReasoning,
  formatReasoningBlock,
  generateSuggestions,
  generateWelcomeChips,
  processResponse,
};

// ── Pipeline result ────────────────────────────────────────

export interface PipelineResult {
  /** The detected user intent. */
  intent: IntentResult;
  /** The retrieved memory bundle and counts. */
  retrieval: RetrievalResult;
  /** The computed pattern analysis. */
  patterns: PatternAnalysis;
  /** The structured context (formatted string + metadata). */
  context: StructuredContext;
  /** The system prompt ready for Groq. */
  systemPrompt: string;
  /** Data-driven confidence result. */
  confidence: ConfidenceResult;
  /** Reasoning block with evidence. */
  reasoning: ReasoningBlock;
}

// ── System prompt builder ──────────────────────────────────

const PERSONA_INSTRUCTIONS: Record<AiPersona, string> = {
  default: 'Be warm, personal, and insightful — like a close friend who remembers everything about their life.',
  witty: 'Be quick with humor and clever observations. A light, playful tone that keeps things fun while staying personal.',
  analytical: 'Be data-driven, precise, and structured. Focus on patterns, statistics, and clear evidence-based reasoning.',
  enthusiastic: 'Be energetic and genuinely delighted by their memories. Use warmth and excitement without being fake.',
  minimalist: 'Be short, direct, and efficient. Give the answer with minimal fluff while still referencing their memories.',
};

function buildSystemPrompt(
  context: string,
  confidence: ConfidenceResult,
  intent: IntentResult,
  persona: AiPersona = 'default',
): string {
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
    '7. NEVER hide uncertainty — always state your confidence level using the data below.',
    '',
    '=== RESPONSE STRUCTURE ===',
    'Every response should follow this order naturally (as a flowing answer, not rigid sections):',
    '',
    '1. DIRECT ANSWER — Answer naturally and conversationally, acknowledging the user\'s detected intent.',
    '2. EVIDENCE — Reference specific memories, patterns, and data from the structured context below.',
    '3. REASONING — Explain WHY. Never hide the reasoning. Show your work.',
    `4. CONFIDENCE — State your confidence based on the data-driven confidence provided.`,
    '5. SUGGESTIONS — End with 2-3 intelligent follow-up questions prefixed with "→".',
    '',
    '=== INTENT GUIDANCE ===',
    `The user's detected intent is: ${intent.intent.replace(/_/g, ' ')}`,
    intent.categories.length > 0
      ? `Relevant categories: ${intent.categories.join(', ')}`
      : '',
    intent.focus ? `User focus: ${intent.focus}` : '',
    intent.timeHint ? `Time range hinted: ${intent.timeHint}` : '',
    '',
    '=== DATA CONFIDENCE ===',
    `Data confidence: ${formatConfidenceAnnotation(confidence)}`,
    confidence.gaps.length > 0
      ? `Data limitations: ${confidence.gaps.slice(0, 2).join('; ')}`
      : '',
    '',
    '=== EVIDENCE-BASED REASONING ===',
    'When recommending something, include:',
    '- WHAT: Your specific recommendation or insight',
    '- WHY: Reference their specific history and patterns from the context',
    '- EVIDENCE: Cite the data points that support your conclusion',
    '- CONFIDENCE: State how confident you are based on the data available',
    '',
    '=== PREDICTION FORMAT (when applicable) ===',
    '"Based on your history of [X], I predict you would enjoy [Y]. Reason: [Z]."',
    '',
    '=== REFLECTION FORMAT (when comparing over time) ===',
    '"Compared with your earlier entries, your [category] preferences have shifted from [A] toward [B]."',
    '',
    '=== STORY FORMAT (when summarizing memories) ===',
    'Generate a narrative instead of bullets.',
    'Example: "This year, you explored two new restaurants, watched several emotional science-fiction films..."',
    '',
    '=== WHEN USER DATA IS LIMITED ===',
    'Be honest: "I only have [X] entries in this category. My confidence is [Y]%. The more you add, the better I get."',
    '',
    '=== EXTERNAL KNOWLEDGE ===',
    'If external general knowledge is needed (e.g., movie release dates), use it sparingly.',
    'Clearly distinguish external knowledge from personal insights.',
    'But ALWAYS prefer personal memories first.',
    '',
    PERSONA_INSTRUCTIONS[persona],
    '',
    '=== USER CONTEXT ===',
    context,
    '',
    '=== MACHINE PARSING ===',
    'At the very end of your answer, include a machine-readable block:',
    '<!--ECHOOS_META{"reasoning":"Brief explanation of your reasoning","suggestionChips":["Q1?","Q2?"]}-->',
    'Keep reasoning to 1-2 sentences. Suggestion chips: 2-3 natural follow-ups.',
    '',
    'Remember: you are EchoOS — the user\'s private memory operating system.',
    'Answer from their life. Use the evidence provided. State your confidence.',
  ].join('\n');
}

// ── Pipeline ───────────────────────────────────────────────

/**
 * MemoryPipeline orchestrates the complete Memory Intelligence Layer.
 *
 * Usage:
 *   const pipeline = new MemoryPipeline();
 *   const result = await pipeline.process(uid, message, persona);
 *   // Use result.systemPrompt for the Groq call
 *   // After receiving response, call:
 *   const processed = pipeline.postProcess(groqRaw, result, memories);
 */
export class MemoryPipeline {
  /**
   * Execute steps 1-4 of the pipeline:
   *   Detect intent → Retrieve memories → Analyze patterns → Build context
   *
   * @param uid - Firebase user ID
   * @param message - The user's message
   * @param persona - AI personality (default, witty, analytical, etc.)
   * @returns PipelineResult with systemPrompt ready for Groq
   */
  async process(
    uid: string,
    message: string,
    persona: AiPersona = 'default',
  ): Promise<PipelineResult> {
    // STEP 1: Detect intent
    const intent = detectIntent(message);

    // STEP 2: Retrieve only relevant memories
    const retrieval = await retrieveMemories(uid, {
      categories: intent.categories,
      limitPerCategory: 50,
    });

    // STEP 3: Analyze patterns
    const patterns = analyzePatterns(retrieval.memories);

    // STEP 4: Build structured context
    const context = buildStructuredContext(intent, retrieval, patterns);

    // Calculate confidence and reasoning for the prompt
    const confidence = calculateConfidence(intent.intent, retrieval, patterns);
    const reasoning = formatReasoning(intent.intent, patterns);

    // Build the system prompt with structured context
    const systemPrompt = buildSystemPrompt(context.formatted, confidence, intent, persona);

    return {
      intent,
      retrieval,
      patterns,
      context,
      systemPrompt,
      confidence,
      reasoning,
    };
  }

  /**
   * Execute steps 5-8 (post-processing) after Groq responds:
   *   Calculate confidence → Generate reasoning → Generate suggestions → Format response
   *
   * @param rawResponse - The raw response text from Groq
   * @param pipelineResult - The PipelineResult from process()
   * @returns A fully processed response with metadata
   */
  postProcess(
    rawResponse: string,
    pipelineResult: PipelineResult,
  ): ProcessedResponse {
    const { intent, retrieval, patterns, confidence } = pipelineResult;

    // Generate context-aware suggestions
    const suggestionSet = generateSuggestions(intent.intent, patterns);

    // Process the response through the full post-processing pipeline
    const processed = processResponse(
      rawResponse,
      intent.intent,
      retrieval.memories,
      patterns,
      confidence,
      suggestionSet.chips,
    );

    return processed;
  }

  /**
   * Generate welcome chips for the empty-state view (no conversation yet).
   */
  getWelcomeChips(patterns: PatternAnalysis): string[] {
    return generateWelcomeChips(patterns);
  }

  /**
   * Static fallback for backward compatibility.
   * Builds a system prompt from a plain-text context string without
   * the full pipeline (no intent detection, no confidence annotation).
   *
   * @deprecated Use the instance method process() instead.
   */
  static _buildSystemPromptFallback(
    context: string,
    persona: AiPersona = 'default',
  ): string {
    const defaultConfidence = {
      overall: 0.3,
      perCategory: {} as Record<string, number>,
      reasoning: 'Limited data',
      sufficient: false,
      gaps: ['No pipeline data'],
    };

    return buildSystemPrompt(context, defaultConfidence as ConfidenceResult, {
      intent: 'general_conversation',
      categories: [],
      confidence: 0.3,
    } as IntentResult, persona);
  }
}
