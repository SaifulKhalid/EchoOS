/**
 * Groq chat client. Calls the Vercel proxy at `/api/chat` which injects
 * the secret Groq API key server-side and proxies streaming SSE events.
 *
 * Memory Intelligence is powered by the memory/ layer which:
 *   STEP 1 — Detects user intent before fetching data
 *   STEP 2 — Retrieves only relevant memories
 *   STEP 3 — Computes pattern intelligence
 *   STEP 4 — Builds a structured context (not raw dumps)
 *   STEP 5 — Post-processes the response with confidence & reasoning
 */

import { auth } from '@/firebase/config';
import { API_BASE_URL } from '@/config/env';
import { GROQ_MODELS } from '@/config/constants';
import type { AiPersona } from '@/hooks/usePreferences';
import type { MemoryBundle, PipelineResult, IntentResult } from '@/memory';
import type { MemoryCategory } from '@/config/constants';
import {
  MemoryPipeline,
  retrieveMemories as memoryRetrieveMemories,
  buildStructuredContext,
  analyzePatterns,
  generateWelcomeChips,
  type ProcessedResponse,
} from '@/memory';

// ── Types ───────────────────────────────────────────────────

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

// ── Re-export MemoryBundle for backward compatibility ───────

export type { MemoryBundle };

// ── Deprecated legacy API (delegates to memory/ layer) ──────

/** @deprecated Use `MemoryPipeline` from `@/memory` instead. */
export { computeMemoryInsights, formatInsights } from './_legacy';

/**
 * @deprecated Use the MemoryPipeline class directly.
 * Fetches all memories. Prefer retrieveMemories with specific categories.
 */
export async function fetchUserMemories(uid: string): Promise<MemoryBundle> {
  const result = await memoryRetrieveMemories(uid, {
    categories: ['movie', 'food', 'travel', 'note', 'wishlist'],
    limitPerCategory: 50,
  });
  return result.memories;
}

/**
 * @deprecated Use `buildStructuredContext` from `@/memory` instead.
 * Builds a plain-text context block from memories + computed insights.
 */
export function buildContext(memories: MemoryBundle): string {
  const intent = { intent: 'general_conversation' as const, categories: ['movie', 'food', 'travel', 'note', 'wishlist'] as MemoryCategory[], confidence: 0.5 } as IntentResult;
  const patterns = analyzePatterns(memories);
  const retrieval = { memories, totalCount: 0, categoryCounts: { movie: 0, food: 0, travel: 0, note: 0, wishlist: 0 } };
  const ctx = buildStructuredContext(intent, retrieval, patterns);
  return ctx.formatted;
}

/**
 * @deprecated Use MemoryPipeline.process() which includes intent detection.
 * Builds the full system prompt with memory context.
 */
export function buildSystemPrompt(context: string, persona: AiPersona = 'default'): string {
  return MemoryPipeline._buildSystemPromptFallback(context, persona);
}

// ── Memory Pipeline singleton ──────────────────────────────

let _pipeline: MemoryPipeline | null = null;

function getPipeline(): MemoryPipeline {
  if (!_pipeline) {
    _pipeline = new MemoryPipeline();
  }
  return _pipeline;
}

// ── Streaming chat ─────────────────────────────────────────

/**
 * Send a streaming chat request to the proxy. Calls `onDelta` for each
 * text token and `onMetadata` when the final metadata payload arrives.
 * Returns the complete response text when done.
 *
 * This is the low-level transport function. For the full intelligence
 * pipeline, use `streamChatWithPipeline` instead.
 */
export async function streamChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  onDelta: (text: string) => void,
  onMetadata?: (meta: Partial<StreamEvent>) => void,
  model: string = GROQ_MODELS.reasoning,
  _persona?: AiPersona,
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

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('event: ')) continue;
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

  return fullText;
}

// ── Intelligence-optimized streaming ───────────────────────

export interface StreamWithPipelineOptions {
  /** The user's message text. */
  text: string;
  /** The user's Firebase UID. */
  uid: string;
  /** AI personality mode. */
  persona?: AiPersona;
  /** Groq model to use. */
  model?: string;
  /** Previous messages for conversation continuity (max ~6). */
  history?: { role: 'user' | 'assistant'; content: string }[];
  /** Callback for each text delta. */
  onDelta: (text: string) => void;
  /** Callback for streaming metadata. */
  onMetadata?: (meta: Partial<StreamEvent>) => void;
  /** Callback when the full pipeline result is available (before streaming). */
  onPipelineResult?: (result: PipelineResult) => void;
}

export interface StreamWithPipelineResult {
  /** The complete response text from Groq. */
  responseText: string;
  /** The PipelineResult from the intelligence pipeline. */
  pipelineResult: PipelineResult;
  /** The post-processed response with metadata. */
  processed: ProcessedResponse;
}

/**
 * Full intelligence pipeline: detect intent → retrieve memories →
 * analyze patterns → build context → stream chat → post-process.
 *
 * This is the RECOMMENDED way to chat with EchoOS. It follows the
 * 5-step Memory Intelligence protocol.
 */
export async function streamChatWithPipeline(
  options: StreamWithPipelineOptions,
): Promise<StreamWithPipelineResult> {
  const {
    text,
    uid,
    persona = 'default',
    model = GROQ_MODELS.reasoning,
    history = [],
    onDelta,
    onMetadata,
    onPipelineResult,
  } = options;

  // STEP 1–4: Run the intelligence pipeline
  const pipeline = getPipeline();
  const pipelineResult = await pipeline.process(uid, text, persona);
  onPipelineResult?.(pipelineResult);

  // Build message history
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: pipelineResult.systemPrompt },
  ];

  for (const msg of history.slice(-6)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: text });

  // Stream the response from Groq
  const rawResponse = await streamChat(
    messages,
    onDelta,
    (meta) => {
      onMetadata?.(meta);
    },
    model,
    persona,
  );

  // STEP 5: Post-process the response
  const processed = pipeline.postProcess(rawResponse, pipelineResult);

  return {
    responseText: rawResponse,
    pipelineResult,
    processed,
  };
}

/**
 * Generate welcome chips for the empty-state view.
 * @deprecated Use `suggestionGenerator.generateWelcomeChips` directly.
 */
export async function getWelcomeSuggestions(uid: string): Promise<string[]> {
  const result = await memoryRetrieveMemories(uid, {
    categories: ['movie', 'food', 'travel', 'note', 'wishlist'],
    limitPerCategory: 5,
  });
  const patterns = analyzePatterns(result.memories);
  return generateWelcomeChips(patterns);
}
