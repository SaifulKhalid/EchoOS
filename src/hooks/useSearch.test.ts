import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from './useSearch';
import type { TimelineEntry } from './useTimeline';
import type { MoodId } from '@/config/constants';

// ── Mock useTimeline ────────────────────────────────────────

const mockEntries: TimelineEntry[] = [
  {
    key: 'movie-1',
    type: 'movie',
    refId: '1',
    date: 1700000000000,
    title: 'Inception',
    subtitle: 'Action, Sci-Fi',
    preview: 'A mind-bending heist movie',
    rating: 9,
    mood: 'awe' as MoodId,
  },
  {
    key: 'food-1',
    type: 'food',
    refId: '2',
    date: 1699000000000,
    title: "Joe's Pizza",
    subtitle: 'Italian · $15',
    preview: 'Best pizza in town',
    rating: 8,
    mood: 'joy' as MoodId,
  },
  {
    key: 'travel-1',
    type: 'travel',
    refId: '3',
    date: 1698000000000,
    title: 'Kyoto, Japan',
    subtitle: '7d · with Sarah',
    preview: 'Beautiful temples and cherry blossoms',
    rating: 10,
    mood: 'calm' as MoodId,
  },
  {
    key: 'note-1',
    type: 'note',
    refId: '4',
    date: 1697000000000,
    title: 'Great movie idea',
    subtitle: 'idea',
    preview: 'A story about time travel and family',
    mood: 'love' as MoodId,
  },
  {
    key: 'wishlist-1',
    type: 'wishlist',
    refId: '5',
    date: 1696000000000,
    title: 'Visit Patagonia',
    subtitle: 'Wishlist · place',
    preview: 'Hiking the Torres del Paine',
    done: false,
  },
  {
    key: 'movie-2',
    type: 'movie',
    refId: '6',
    date: 1695000000000,
    title: 'The Matrix',
    subtitle: 'Action, Sci-Fi',
    preview: undefined,
    rating: 7,
    mood: 'awe' as MoodId,
  },
];

vi.mock('./useTimeline', () => ({
  useTimeline: () => ({
    entries: mockEntries,
    isLoading: false,
  }),
}));

// ── Tests ───────────────────────────────────────────────────

describe('useSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all entries with no filters applied', () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.results).toHaveLength(6);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('filters by text query (title match)', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('inception');
    });

    // Wait for debounce
    act(() => { vi.advanceTimersByTime(250); });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].title).toBe('Inception');
  });

  it('filters by text query (preview match)', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('pizza');
    });

    act(() => { vi.advanceTimersByTime(250); });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].title).toBe("Joe's Pizza");
  });

  it('filters by category', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.toggleCategory('movie');
    });

    expect(result.current.results).toHaveLength(2);
    expect(result.current.results.every((r) => r.type === 'movie')).toBe(true);
  });

  it('filters by multiple categories', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.toggleCategory('movie');
      result.current.toggleCategory('food');
    });

    expect(result.current.results).toHaveLength(3);
  });

  it('filters by mood', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.toggleMood('awe');
    });

    expect(result.current.results).toHaveLength(2);
    expect(result.current.results.every((r) => r.mood === 'awe')).toBe(true);
  });

  it('filters by minimum rating', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setMinRating(9);
    });

    expect(result.current.results).toHaveLength(2);
    expect(result.current.results.every((r) => (r.rating ?? 0) >= 9)).toBe(true);
  });

  it('filters by combination of category and rating', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.toggleCategory('movie');
      result.current.setMinRating(8);
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].title).toBe('Inception');
  });

  it('returns empty results when nothing matches', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('xyznonexistent');
    });

    act(() => { vi.advanceTimersByTime(250); });

    expect(result.current.results).toHaveLength(0);
  });

  it('reports hasActiveFilters correctly', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.toggleCategory('movie');
    });

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('clearFilters resets to initial state', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.toggleCategory('movie');
      result.current.setMinRating(7);
      result.current.setQuery('test');
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.results).toHaveLength(6);
  });

  it('generates matchSnippet for text searches', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('pizza');
    });

    act(() => { vi.advanceTimersByTime(250); });

    expect(result.current.results[0].matchSnippet).toBeDefined();
    expect(result.current.results[0].matchSnippet!.toLowerCase()).toContain('pizza');
  });

  it('toggling a category off removes it from the filter', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.toggleCategory('movie');
    });
    expect(result.current.results).toHaveLength(2);

    act(() => {
      result.current.toggleCategory('movie');
    });
    expect(result.current.results).toHaveLength(6);
  });
});
