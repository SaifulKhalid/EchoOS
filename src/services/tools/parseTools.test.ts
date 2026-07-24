import { describe, it, expect, vi } from 'vitest';
import { ToolCallAccumulator, parseToolCallsFromChunks } from './parseTools';
import type { StreamChunk } from './parseTools';

describe('ToolCallAccumulator', () => {
  it('returns no calls when no tool_calls were fed', () => {
    const acc = new ToolCallAccumulator();
    expect(acc.flush()).toEqual([]);
  });

  it('hasToolCalls is false before feeding and true after', () => {
    const acc = new ToolCallAccumulator();
    expect(acc.hasToolCalls()).toBe(false);
    acc.feed({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'noop', arguments: '{}' } }] } }] });
    expect(acc.hasToolCalls()).toBe(true);
  });

  it('assembles a single tool call from one chunk', () => {
    const acc = new ToolCallAccumulator();
    acc.feed({
      choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'logFood', arguments: '{"restaurant":"Joe"}' } }] } }],
    });
    const calls = acc.flush();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ id: 'call_1', name: 'logFood', arguments: { restaurant: 'Joe' } });
  });

  it('concatenates fragmented arguments across multiple chunks', () => {
    const acc = new ToolCallAccumulator();
    // Simulate Groq splitting the JSON args over 3 chunks
    acc.feed({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_2', function: { name: 'logTravel', arguments: '{"dest' } }] } }] });
    acc.feed({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'ination":"Ban' } }] } }] });
    acc.feed({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'darban"}' } }] } }] });
    const calls = acc.flush();
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('logTravel');
    expect(calls[0].arguments).toEqual({ destination: 'Bandarban' });
  });

  it('handles multiple tool calls in the same turn (different indices)', () => {
    const acc = new ToolCallAccumulator();
    acc.feed({
      choices: [{
        delta: {
          tool_calls: [
            { index: 0, id: 'a', function: { name: 'searchMovie', arguments: '{"query":"Inception"}' } },
            { index: 1, id: 'b', function: { name: 'searchMovie', arguments: '{"query":"Interstellar"}' } },
          ],
        },
      }],
    });
    const calls = acc.flush();
    expect(calls).toHaveLength(2);
    expect(calls[0].id).toBe('a');
    expect(calls[1].id).toBe('b');
  });

  it('returns calls in index order regardless of arrival order', () => {
    const acc = new ToolCallAccumulator();
    acc.feed({ choices: [{ delta: { tool_calls: [{ index: 1, id: 'b', function: { name: 'logFood', arguments: '{"restaurant":"B"}' } }] } }] });
    acc.feed({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'a', function: { name: 'logFood', arguments: '{"restaurant":"A"}' } }] } }] });
    const calls = acc.flush();
    expect(calls[0].id).toBe('a');
    expect(calls[1].id).toBe('b');
  });

  it('skips malformed JSON arguments and calls onParseError', () => {
    const acc = new ToolCallAccumulator();
    const onError = vi.fn();
    acc.feed({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'x', function: { name: 'logFood', arguments: '{broken' } }] } }] });
    const calls = acc.flush(onError);
    expect(calls).toHaveLength(0);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('logFood', '{broken', expect.any(Error));
  });

  it('skips entries with no function name', () => {
    const acc = new ToolCallAccumulator();
    acc.feed({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'x', function: { arguments: '{"a":1}' } }] } }] });
    expect(acc.flush()).toHaveLength(0);
  });

  it('generates a fallback id when none was streamed', () => {
    const acc = new ToolCallAccumulator();
    acc.feed({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'logFood', arguments: '{}' } }] } }] });
    const calls = acc.flush();
    expect(calls).toHaveLength(1);
    expect(calls[0].id).toBe('call_0');
  });

  it('defaults empty arguments to {}', () => {
    const acc = new ToolCallAccumulator();
    acc.feed({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c', function: { name: 'noop' } }] } }] });
    const calls = acc.flush();
    expect(calls[0].arguments).toEqual({});
  });

  it('ignores chunks without tool_calls', () => {
    const acc = new ToolCallAccumulator();
    acc.feed({ choices: [{ delta: { content: 'hello' } }] });
    acc.feed({ choices: [{ delta: {} }] });
    acc.feed({});
    expect(acc.flush()).toEqual([]);
  });
});

describe('parseToolCallsFromChunks', () => {
  it('parses a buffered array of chunks in one call', () => {
    const chunks: StreamChunk[] = [
      { choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'addMovie', arguments: '{"tm' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'dbId":550}' } }] } }] },
    ];
    const calls = parseToolCallsFromChunks(chunks);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('addMovie');
    expect(calls[0].arguments).toEqual({ tmdbId: 550 });
  });

  it('returns empty for chunks with only content', () => {
    const chunks: StreamChunk[] = [{ choices: [{ delta: { content: 'text' } }] }];
    expect(parseToolCallsFromChunks(chunks)).toEqual([]);
  });
});