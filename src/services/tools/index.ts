/**
 * tools/index.ts
 *
 * Public surface of the AI Actions layer.
 *
 *   import { TOOL_SCHEMAS, executeToolCalls, toActions } from '@/services/tools';
 */

export type {
  ToolSchema,
  ToolCall,
  ToolResult,
  ToolStatus,
  ToolExecutionContext,
  ActionDescriptor,
} from './types';

export { ToolCallAccumulator, parseToolCallsFromChunks } from './parseTools';
export type { StreamChunk } from './parseTools';

export {
  TOOL_SCHEMAS,
  TOOL_NAMES,
  isKnownTool,
  executeTool,
  toAction,
} from './registry';

export { TOOL_HANDLERS } from './handlers';

import type { ToolCall, ToolResult, ToolExecutionContext, ActionDescriptor } from './types';
import { executeTool, toAction } from './registry';

/**
 * Outcome of executing a batch of tool calls for one assistant turn.
 */
export interface ExecutedBatch {
  results: ToolResult[];
  /** One descriptor per result, for rendering action cards. */
  actions: ActionDescriptor[];
  /** Groq `tool` role messages to append for the follow-up request. */
  toolMessages: { tool_call_id: string; role: 'tool'; name: string; content: string }[];
}

/**
 * Run an array of tool calls sequentially against the same context, returning
 * results, UI action descriptors, and the tool-role messages to send back to
 * Groq so it can compose the natural-language reply.
 */
export async function executeToolCalls(
  calls: ToolCall[],
  ctx: ToolExecutionContext,
): Promise<ExecutedBatch> {
  const results: ToolResult[] = [];
  const actions: ActionDescriptor[] = [];
  const toolMessages: ExecutedBatch['toolMessages'] = [];

  for (const call of calls) {
    const result = await executeTool(call, ctx);
    results.push(result);
    actions.push(toAction(result));
    toolMessages.push({
      tool_call_id: call.id,
      role: 'tool',
      name: call.name,
      content: JSON.stringify({
        status: result.status,
        summary: result.summary,
        data: result.data ?? {},
      }),
    });
  }

  return { results, actions, toolMessages };
}

/** Convenience: derive action descriptors from already-executed results. */
export function toActions(results: ToolResult[]): ActionDescriptor[] {
  return results.map(toAction);
}
