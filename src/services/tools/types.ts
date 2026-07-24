/**
 * tools/types.ts
 *
 * Shared types for the EchoOS AI Actions layer.
 *
 * The flow is:
 *   Groq  ──(streamed)──▶  ToolCall      ──▶  executeTool()
 *                                                │
 *   Groq  ◀──(tool msg)──  ToolResult     ◀──┘
 *   UI    ◀──(render)────  ActionDescriptor
 *
 * Groq never touches Firestore. Tools execute client-side under the
 * signed-in user; the Vercel proxy is only a transparent SSE relay.
 */

import type { MemoryCategory } from '@/config/constants';

// ── Groq-facing schema ───────────────────────────────────────

/**
 * The JSON-Schema definition for a tool, exactly as Groq expects it in the
 * `tools` array of a chat-completions request. We type only the fields we
 * control; the rest is forwarded verbatim.
 */
export interface ToolSchema {
  /** Tool name — must match a key in the registry. */
  name: string;
  /** Short description Groq uses to decide when to call it. */
  description: string;
  /** JSON-Schema object describing the arguments. */
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ── A single tool call requested by the model ────────────────

export interface ToolCall {
  /** Groq's id for this call (echoed back in the `tool` role message). */
  id: string;
  /** Tool name — must exist in the registry. */
  name: string;
  /** Parsed arguments object. */
  arguments: Record<string, unknown>;
}

// ── Result returned to Groq + rendered as an action card ──────

export type ToolStatus = 'success' | 'error' | 'info';

export interface ToolResult {
  /** Echo of the originating tool name. */
  tool: string;
  status: ToolStatus;
  /**
   * Human-readable summary, shown in the action card and read by Groq.
   * Keep it short and concrete, e.g. "Added Parineeta (2005) to movies".
   */
  summary: string;
  /**
   * Machine-readable payload returned to Groq as the `tool` role message
   * content so it can craft the natural-language reply.
   */
  data?: Record<string, unknown>;
}

/**
 * A UI-facing description of an action that was performed. Derived from a
 * ToolResult but flattened for rendering. Stored on the chat message so the
 * card persists across reloads.
 */
export interface ActionDescriptor {
  /** Which memory category this action affected (for the icon/emoji). */
  category: MemoryCategory | 'search' | 'memory';
  /** One-line title, e.g. the movie title or destination. */
  title: string;
  /** Secondary line, e.g. "2005 · Drama, Romance". */
  subtitle?: string;
  status: ToolStatus;
  /** Past-tense verb describing what happened, e.g. "Added", "Logged". */
  verb?: string;
}

// ── Execution context ────────────────────────────────────────

/**
 * Handed to every tool handler. Carries the uid (so services stay scoped to
 * the owner) and a cache-invalidation callback wired to the TanStack
 * QueryClient so list pages refresh the moment a tool writes.
 */
export interface ToolExecutionContext {
  uid: string;
  /**
   * Invalidate one or more TanStack Query keys. Implementations map tool
   * names to the correct collection keys (['movies', uid], etc.).
   */
  invalidateQueries: (keys: readonly (readonly string[])[]) => void;
}
