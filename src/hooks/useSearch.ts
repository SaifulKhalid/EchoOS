import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTimeline, type TimelineEntry } from './useTimeline';
import type { MemoryCategory, MoodId } from '@/config/constants';

export interface SearchFilters {
  query: string;
  categories: MemoryCategory[];
  moods: MoodId[];
  minRating: number | null;
  dateFrom: number | null; // epoch ms
  dateTo: number | null;   // epoch ms
}

const EMPTY_FILTERS: SearchFilters = {
  query: '',
  categories: [],
  moods: [],
  minRating: null,
  dateFrom: null,
  dateTo: null,
};

/** Lowercase searchable text from a timeline entry. */
function searchableText(e: TimelineEntry): string {
  return [e.title, e.subtitle, e.preview].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Client-side search across all cached memory data.
 * Uses the pre-normalized timeline entries so there are zero extra Firestore reads.
 * The search is debounced at 200ms for smooth typing.
 */
export function useSearch() {
  const { entries, isLoading } = useTimeline();
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce the query field specifically
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [filters.query]);

  const results = useMemo<(TimelineEntry & { matchSnippet?: string })[]>(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const cats = filters.categories;
    const moods = filters.moods;
    const minRating = filters.minRating;
    const dateFrom = filters.dateFrom;
    const dateTo = filters.dateTo;

    let filtered = entries;

    // Category filter
    if (cats.length > 0) {
      filtered = filtered.filter((e) => cats.includes(e.type));
    }

    // Mood filter
    if (moods.length > 0) {
      filtered = filtered.filter((e) => e.mood && moods.includes(e.mood));
    }

    // Rating filter
    if (minRating != null) {
      filtered = filtered.filter((e) => e.rating != null && e.rating >= minRating);
    }

    // Date range filter
    if (dateFrom != null) {
      filtered = filtered.filter((e) => e.date >= dateFrom);
    }
    if (dateTo != null) {
      filtered = filtered.filter((e) => e.date <= dateTo);
    }

    // Text search (debounced)
    if (q) {
      filtered = filtered.filter((e) => searchableText(e).includes(q));

      // Add a match snippet highlighting where the match occurred
      return filtered.map((e) => {
        const text = searchableText(e);
        const idx = text.indexOf(q);
        if (idx >= 0) {
          const start = Math.max(0, idx - 30);
          const end = Math.min(text.length, idx + q.length + 30);
          let snippet = text.slice(start, end);
          if (start > 0) snippet = '…' + snippet;
          if (end < text.length) snippet = snippet + '…';
          return { ...e, matchSnippet: snippet };
        }
        return e;
      });
    }

    return filtered;
  }, [entries, debouncedQuery, filters.categories, filters.moods, filters.minRating, filters.dateFrom, filters.dateTo]);

  const setQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, query }));
  }, []);

  const toggleCategory = useCallback((cat: MemoryCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }, []);

  const toggleMood = useCallback((mood: MoodId) => {
    setFilters((prev) => ({
      ...prev,
      moods: prev.moods.includes(mood)
        ? prev.moods.filter((m) => m !== mood)
        : [...prev.moods, mood],
    }));
  }, []);

  const setMinRating = useCallback((minRating: number | null) => {
    setFilters((prev) => ({ ...prev, minRating }));
  }, []);

  const setDateRange = useCallback((dateFrom: number | null, dateTo: number | null) => {
    setFilters((prev) => ({ ...prev, dateFrom, dateTo }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setDebouncedQuery('');
  }, []);

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.moods.length > 0 ||
    filters.minRating != null ||
    filters.dateFrom != null ||
    filters.dateTo != null ||
    filters.query.trim().length > 0;

  return {
    results,
    isLoading,
    filters,
    hasActiveFilters,
    setQuery,
    toggleCategory,
    toggleMood,
    setMinRating,
    setDateRange,
    clearFilters,
  };
}
