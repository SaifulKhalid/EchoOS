import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the handlers module so executeTool tests are pure dispatch logic
// and never touch Firestore / TMDB.
vi.mock('./handlers', () => ({
  TOOL_HANDLERS: {
    searchMovie: vi.fn(async () => ({ tool: 'searchMovie', status: 'success', summary: 'ok', data: { query: 'test', results: [] } })),
    addMovie: vi.fn(async () => ({ tool: 'addMovie', status: 'success', summary: 'added', data: { id: 'm1', title: 'Test Movie', year: 2024, cardSubtitle: '2024 · Drama' } })),
    logFood: vi.fn(async () => ({ tool: 'logFood', status: 'success', summary: 'logged', data: { id: 'f1', restaurant: 'Cafe', cuisine: 'Italian', rating: 8 } })),
    logTravel: vi.fn(async () => ({ tool: 'logTravel', status: 'success', summary: 'logged', data: { id: 't1', destination: 'Bandarban', durationDays: 3, budget: 5000, companions: ['a', 'b'] } })),
    createNote: vi.fn(async () => ({ tool: 'createNote', status: 'success', summary: 'saved', data: { id: 'n1', title: 'My Note' } })),
    updateWishlist: vi.fn(async () => ({ tool: 'updateWishlist', status: 'success', summary: 'added', data: { id: 'w1', title: 'Item', category: 'movie' } })),
    markWishlistDone: vi.fn(async () => ({ tool: 'markWishlistDone', status: 'success', summary: 'done', data: { id: 'w1' } })),
    updateRating: vi.fn(async () => ({ tool: 'updateRating', status: 'success', summary: 'rated', data: { id: 'x1', category: 'food', rating: 7 } })),
    deleteEntry: vi.fn(async () => ({ tool: 'deleteEntry', status: 'success', summary: 'deleted', data: { id: 'x1', category: 'movie' } })),
    searchMemory: vi.fn(async () => ({ tool: 'searchMemory', status: 'success', summary: 'Found 1 match.', data: { query: 'test', results: [{ id: '1', category: 'movie', title: 'A' }] } })),
  },
}));

import { TOOL_SCHEMAS, TOOL_NAMES, isKnownTool, executeTool, toAction } from './registry';
import { TOOL_HANDLERS } from './handlers';
import type { ToolCall, ToolResult } from './types';

const mockCtx = { uid: 'test-uid', invalidateQueries: vi.fn() };

describe('TOOL_SCHEMAS', () => {
  it('defines exactly 10 tools', () => {
    expect(TOOL_SCHEMAS).toHaveLength(10);
  });

  it('each schema has name, description, and parameters with type object', () => {
    for (const schema of TOOL_SCHEMAS) {
      expect(typeof schema.name).toBe('string');
      expect(schema.name.length).toBeGreaterThan(0);
      expect(typeof schema.description).toBe('string');
      expect(schema.parameters).toBeDefined();
      expect(schema.parameters.type).toBe('object');
      expect(Array.isArray(schema.parameters.required)).toBe(true);
    }
  });

  it('includes all expected tool names', () => {
    const names = TOOL_SCHEMAS.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'searchMovie', 'addMovie', 'logFood', 'logTravel', 'createNote',
        'updateWishlist', 'markWishlistDone', 'updateRating', 'deleteEntry', 'searchMemory',
      ]),
    );
  });

  it('addMovie requires tmdbId', () => {
    const addMovie = TOOL_SCHEMAS.find((t) => t.name === 'addMovie')!;
    expect(addMovie.parameters.required).toContain('tmdbId');
  });

  it('logTravel requires destination', () => {
    const logTravel = TOOL_SCHEMAS.find((t) => t.name === 'logTravel')!;
    expect(logTravel.parameters.required).toContain('destination');
  });

  it('searchMemory requires query', () => {
    const searchMemory = TOOL_SCHEMAS.find((t) => t.name === 'searchMemory')!;
    expect(searchMemory.parameters.required).toContain('query');
  });
});

describe('isKnownTool', () => {
  it('returns true for each defined tool name', () => {
    for (const name of TOOL_NAMES) {
      expect(isKnownTool(name)).toBe(true);
    }
  });

  it('returns false for unknown tool names', () => {
    expect(isKnownTool('notATool')).toBe(false);
    expect(isKnownTool('')).toBe(false);
    expect(isKnownTool('addMovies')).toBe(false);
  });
});

describe('executeTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches to the correct handler with args and ctx', async () => {
    const call: ToolCall = { id: 'c1', name: 'logFood', arguments: { restaurant: 'Test' } };
    const result = await executeTool(call, mockCtx);
    expect(TOOL_HANDLERS.logFood).toHaveBeenCalledWith({ restaurant: 'Test' }, mockCtx);
    expect(result.status).toBe('success');
    expect(result.tool).toBe('logFood');
  });

  it('returns an error result for an unknown tool instead of throwing', async () => {
    const call: ToolCall = { id: 'c2', name: 'nonexistent', arguments: {} };
    const result = await executeTool(call, mockCtx);
    expect(result.status).toBe('error');
    expect(result.summary).toContain('Unknown tool');
    expect(result.summary).toContain('nonexistent');
  });

  it('catches handler exceptions and returns an error result', async () => {
    (TOOL_HANDLERS.addMovie as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firestore down'));
    const call: ToolCall = { id: 'c3', name: 'addMovie', arguments: { tmdbId: 1 } };
    const result = await executeTool(call, mockCtx);
    expect(result.status).toBe('error');
    expect(result.summary).toContain('Firestore down');
  });

  it('passes empty object when arguments is undefined', async () => {
    const call: ToolCall = { id: 'c4', name: 'searchMemory', arguments: {} };
    await executeTool(call, mockCtx);
    expect(TOOL_HANDLERS.searchMemory).toHaveBeenCalledWith({}, mockCtx);
  });
});

describe('toAction', () => {
  it('derives category and verb for a movie result', () => {
    const result: ToolResult = {
      tool: 'addMovie',
      status: 'success',
      summary: 'Added Test Movie.',
      data: { title: 'Test Movie', cardSubtitle: '2024 · Drama' },
    };
    const action = toAction(result);
    expect(action.category).toBe('movie');
    expect(action.verb).toBe('Added');
    expect(action.title).toBe('Test Movie');
    expect(action.subtitle).toBe('2024 · Drama');
    expect(action.status).toBe('success');
  });

  it('derives category for food from restaurant', () => {
    const result: ToolResult = {
      tool: 'logFood',
      status: 'success',
      summary: 'Logged Cafe.',
      data: { restaurant: 'Cafe', cuisine: 'Italian', rating: 8 },
    };
    const action = toAction(result);
    expect(action.category).toBe('food');
    expect(action.verb).toBe('Logged');
    expect(action.title).toBe('Cafe');
    expect(action.subtitle).toBe('Italian · 8/10');
  });

  it('derives category for travel from destination', () => {
    const result: ToolResult = {
      tool: 'logTravel',
      status: 'success',
      summary: 'Logged trip.',
      data: { destination: 'Bandarban', durationDays: 3, budget: 5000, companions: ['a', 'b'] },
    };
    const action = toAction(result);
    expect(action.category).toBe('travel');
    expect(action.title).toBe('Bandarban');
    expect(action.subtitle).toBe('3d · with 2 · budget 5000');
  });

  it('uses updateRating category from data.category', () => {
    const result: ToolResult = {
      tool: 'updateRating',
      status: 'success',
      summary: 'Rated.',
      data: { id: 'x1', category: 'food', rating: 7 },
    };
    const action = toAction(result);
    expect(action.category).toBe('food');
    expect(action.verb).toBe('Rated');
    expect(action.subtitle).toBe('7/10');
  });

  it('falls back to tool name when no title/restaurant/destination in data', () => {
    const result: ToolResult = {
      tool: 'deleteEntry',
      status: 'success',
      summary: 'Deleted.',
      data: { id: 'x1', category: 'movie' },
    };
    const action = toAction(result);
    expect(action.title).toBe('deleteEntry');
    expect(action.category).toBe('memory');
    expect(action.verb).toBe('Deleted');
  });

  it('uses query as title for searchMovie', () => {
    const result: ToolResult = {
      tool: 'searchMovie',
      status: 'success',
      summary: 'Found 2.',
      data: { query: 'Inception', results: [] },
    };
    const action = toAction(result);
    expect(action.category).toBe('search');
    expect(action.verb).toBe('Searched');
    expect(action.title).toBe('Inception');
  });

  it('uses result.summary as subtitle for searchMemory', () => {
    const result: ToolResult = {
      tool: 'searchMemory',
      status: 'success',
      summary: 'Found 3 matches.',
      data: { query: 'test' },
    };
    const action = toAction(result);
    expect(action.category).toBe('memory');
    expect(action.subtitle).toBe('Found 3 matches.');
  });

  it('preserves error status', () => {
    const result: ToolResult = {
      tool: 'addMovie',
      status: 'error',
      summary: 'Failed.',
    };
    const action = toAction(result);
    expect(action.status).toBe('error');
  });
});