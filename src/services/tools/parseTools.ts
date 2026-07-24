/**
 * tools/parseTools.ts
 *
 * Groq (OpenAI-compatible) streams tool calls as incremental fragments.
 * A single tool call is split across many chunks like this:
 *
 *   chunk 1: { tool_calls: [{ index: 0, id: "call_abc", function: { name: "logTravel", arguments: "{\"dest" } }] }
 *   chunk 2: { tool_calls: [{ index: 0, function: { arguments: "ination\":\"Ban" } }] }
 *   chunk 3: { tool_calls: [{ index: 0, function: { arguments: "darban\"}" } }] }
 *
 * The `arguments` string is built up piece by piece and must be concatenated
 * in index order before JSON.parse. The id and name usually arrive on the
 * first chunk only. This module accumulates that into complete ToolCall[].
 *
 * These are pure functions with no I/O — easy to unit test.
 */

import type { ToolCall } from './types';

/** Raw delta shape as it appears in a streamed chunk's `choices[0].delta`. */
interface ToolCallDelta {
  index: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface StreamChunkDelta {
  content?: string;
  tool_calls?: ToolCallDelta[];
}

export interface StreamChunk {
  choices?: { delta?: StreamChunkDelta; finish_reason?: string | null }[];
}

/**
 * Accumulator for tool-call fragments across a single streamed response.
 * Create one per Groq request, feed every parsed chunk via `feed()`, then
 * call `flush()` once the stream ends.
 */
export class ToolCallAccumulator {
  private byIndex = new Map<number, { id?: string; name?: string; args: string }>();

  /** Merge one streamed chunk into the accumulator. Returns void. */
  feed(chunk: StreamChunk): void {
    const deltas = chunk.choices?.[0]?.delta?.tool_calls;
    if (!deltas) return;

    for (const d of deltas) {
      const existing = this.byIndex.get(d.index) ?? { args: '' };
      if (d.id) existing.id = d.id;
      if (d.function?.name) existing.name = d.function.name;
      if (d.function?.arguments) existing.args += d.function.arguments;
      this.byIndex.set(d.index, existing);
    }
  }

  /** True once any tool-call fragment has been observed. */
  hasToolCalls(): boolean {
    return this.byIndex.size > 0;
  }

  /**
   * Finalize and return the complete tool calls in index order. Malformed
   * JSON arguments are skipped (logged via the optional callback) rather
   * than aborting the whole response.
   */
  flush(onParseError?: (name: string, raw: string, err: unknown) => void): ToolCall[] {
    const out: ToolCall[] = [];
    const indices = [...this.byIndex.keys()].sort((a, b) => a - b);

    for (const index of indices) {
      const entry = this.byIndex.get(index)!;
      const rawArgs = entry.args || '{}';

      let args: Record<string, unknown>;
      try {
        args = JSON.parse(rawArgs);
      } catch (err) {
        onParseError?.(entry.name ?? `tool_${index}`, rawArgs, err);
        continue;
      }

      if (!entry.name) {
        // No function name ever arrived — cannot dispatch. Skip.
        continue;
      }

      out.push({
        id: entry.id ?? `call_${index}`,
        name: entry.name,
        arguments: args ?? {},
      });
    }

    return out;
  }
}

/**
 * Convenience: parse a full, already-buffered array of chunks at once.
 * Useful for tests and for non-streaming fallbacks.
 */
export function parseToolCallsFromChunks(chunks: StreamChunk[]): ToolCall[] {
  const acc = new ToolCallAccumulator();
  for (const c of chunks) acc.feed(c);
  return acc.flush();
}
