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
import type { PipelineResult } from '@/memory';
import {
  MemoryPipeline,
  type ProcessedResponse,
} from '@/memory';
import { ToolCallAccumulator } from '@/services/tools/parseTools';
import type { ToolSchema, ToolCall } from '@/services/tools/types';

// ── Types ───────────────────────────────────────────────────

export interface ChatRequest {
  messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string; name?: string }[];
  model?: string;
  stream?: boolean;
  /** Optional tool definitions forwarded to Groq for function calling. */
  tools?: ToolSchema[];
  /** 'auto' (default) | 'none' | specific tool name. */
  tool_choice?: 'auto' | 'none' | string;
}

/** A single tool-call delta as forwarded by the proxy. */
export interface ForwardedToolCallDelta {
  index: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

export interface StreamEvent {
  /** The delta text chunk from the model. */
  content?: string;
  /** Final metadata sent after streaming completes. */
  reasoning?: string;
  confidence?: number;
  referencedMemoryIds?: string[];
  suggestionChips?: string[];
  /**
   * Forwarded tool-call delta (when the proxy passes through Groq's
   * `choices[0].delta.tool_calls`). Present only in tool-calling turns.
   */
  tool_calls?: ForwardedToolCallDelta[];
  /** Why the stream stopped — 'tool_calls' means tools need executing. */
  finish_reason?: string;
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
 * pipeline, use `streamChatWithPipeline` instead. For tool calling,
 * use `streamChatWithTools` (which builds on this).
 */
export async function streamChat(
  messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string; name?: string }[],
  onDelta: (text: string) => void,
  onMetadata?: (meta: Partial<StreamEvent>) => void,
  model: string = GROQ_MODELS.reasoning,
  _persona?: AiPersona,
  options?: { tools?: ToolSchema[]; tool_choice?: 'auto' | 'none' | string },
): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in to chat.');

  const base = API_BASE_URL || window.location.origin;
  const url = new URL(`${base}/api/chat`);
  url.searchParams.set('stream', '1');

  const body: ChatRequest = {
    messages,
    model,
    stream: true,
  };
  if (options?.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.tool_choice ?? 'auto';
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
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

          // Forward tool-call deltas + finish_reason so callers can run the
          // agentic loop via the same streamChat transport.
          if (parsed.tool_calls || parsed.finish_reason) {
            onMetadata?.({
              tool_calls: parsed.tool_calls,
              finish_reason: parsed.finish_reason,
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

// ── Tool-calling streaming ─────────────────────────────────

export interface StreamWithToolsOptions {
  /** Full message history (system + user + assistant + tool). */
  messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string; name?: string }[];
  /** Tool definitions the model may call. */
  tools: ToolSchema[];
  /** Called for each streamed text token. */
  onDelta?: (text: string) => void;
  /** Called when tool-call fragments arrive (incremental). */
  onToolDelta?: () => void;
  /** Called when metadata (reasoning, confidence, chips) arrives. */
  onMetadata?: (meta: Partial<StreamEvent>) => void;
  model?: string;
}

export interface StreamWithToolsResult {
  /** The complete streamed text (may be empty when only tools are called). */
  text: string;
  /** Fully-assembled tool calls the model requested this turn. */
  toolCalls: ToolCall[];
  /** Why the model stopped ('tool_calls' | 'stop' | …). */
  finishReason: string | null;
}

/**
 * Streaming chat that supports Groq function calling. Accumulates the
 * fragmented `tool_calls` deltas across the stream (Groq splits a single
 * call's JSON arguments over many chunks) and returns complete ToolCall[].
 *
 * The caller is responsible for executing the tools and making a follow-up
 * request with `tool` role messages — this function does NOT execute tools.
 */
export async function streamChatWithTools(
  options: StreamWithToolsOptions,
): Promise<StreamWithToolsResult> {
  const accumulator = new ToolCallAccumulator();
  let text = '';
  let finishReason: string | null = null;

  await streamChat(
    options.messages,
    (delta) => {
      text += delta;
      options.onDelta?.(delta);
    },
    (meta) => {
      // ── Tool-call deltas ──
      if (meta.tool_calls) {
        accumulator.feed({ choices: [{ delta: { tool_calls: meta.tool_calls } }] });
        options.onToolDelta?.();
      }
      // ── Finish reason (tool_calls | stop | …) ──
      if (meta.finish_reason) {
        finishReason = meta.finish_reason;
      }
      // ── Non-tool metadata (reasoning, confidence, chips) ──
      if (meta.reasoning || meta.confidence != null || meta.suggestionChips || meta.referencedMemoryIds) {
        options.onMetadata?.({
          reasoning: meta.reasoning,
          confidence: meta.confidence,
          suggestionChips: meta.suggestionChips,
          referencedMemoryIds: meta.referencedMemoryIds,
        });
      }
    },
    options.model ?? GROQ_MODELS.reasoning,
    undefined,
    { tools: options.tools, tool_choice: 'auto' },
  );

  const toolCalls = accumulator.flush((name, raw, err) => {
    console.warn('[EchoOS] Failed to parse tool args for', name, err, raw);
  });

  return { text, toolCalls, finishReason };
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
  /** Optional tool schemas for function calling. */
  tools?: ToolSchema[];
  /** Optional callback when tool-call deltas arrive. */
  onToolDelta?: () => void;
}

export interface StreamWithPipelineResult {
  /** The complete response text from Groq. */
  responseText: string;
  /** The PipelineResult from the intelligence pipeline. */
  pipelineResult: PipelineResult;
  /** The post-processed response with metadata. */
  processed: ProcessedResponse;
  /** Fully-assembled tool calls (only when tools were provided). */
  toolCalls: ToolCall[];
  /** Why the model stopped ('tool_calls' | 'stop' | …). */
  finishReason: string | null;
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
    tools,
    onToolDelta,
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

  let rawResponse: string;
  let toolCalls: ToolCall[] = [];
  let finishReason: string | null = null;

  if (tools && tools.length > 0) {
    // Use tool-calling stream
    const result = await streamChatWithTools({
      messages,
      tools,
      onDelta,
      onToolDelta,
      onMetadata,
      model,
    });
    rawResponse = result.text;
    toolCalls = result.toolCalls;
    finishReason = result.finishReason;
  } else {
    // Standard streaming
    rawResponse = await streamChat(
      messages,
      onDelta,
      (meta) => {
        onMetadata?.(meta);
      },
      model,
      persona,
    );
  }

  // STEP 5: Post-process the response
  const processed = pipeline.postProcess(rawResponse, pipelineResult);

  return {
    responseText: rawResponse,
    pipelineResult,
    processed,
    toolCalls,
    finishReason,
  };
}
