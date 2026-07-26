import { useMemo } from 'react';
import { useMovies } from './useMovies';
import { useFood } from './useFood';
import { useTravel } from './useTravel';
import { useNotes } from './useNotes';
import { useWishlist } from './useWishlist';
import { dateToMillis } from '@/utils/dates';
import type { MoodId, MemoryCategory } from '@/config/constants';

/**
 * A normalized timeline entry derived from any memory category.
 * All date fields are flattened to epoch milliseconds for sorting.
 */
export interface TimelineEntry {
  /** Unique render key = `${type}-${refId}` */
  key: string;
  type: MemoryCategory;
  refId: string;
  date: number; // epoch ms — always present after normalization
  title: string;
  subtitle?: string;
  preview?: string;
  rating?: number;
  mood?: MoodId;
  thumb?: string;
  /** Wishlist-specific */
  category?: string;
  done?: boolean;
  /** Travel-specific */
  durationDays?: number;
}

/** Normalize a single entry from any category into TimelineEntry. */
function normalize(entry: Record<string, unknown>, type: MemoryCategory): TimelineEntry | null {
  const refId = entry.id as string;
  const mood = entry.mood as MoodId | undefined;

  switch (type) {
    case 'movie': {
      const date = dateToMillis(entry.watchDate as Parameters<typeof dateToMillis>[0]) ?? 0;
      return {
        key: `movie-${refId}`,
        type,
        refId,
        date,
        title: entry.title as string,
        subtitle: Array.isArray(entry.genres) ? (entry.genres as string[]).join(', ') : undefined,
        preview: (entry.review as string) || (entry.overview as string) || undefined,
        rating: entry.rating as number | undefined,
        mood,
        thumb: entry.poster as string | undefined,
      };
    }

    case 'food': {
      const date = dateToMillis(entry.date as Parameters<typeof dateToMillis>[0]) ?? 0;
      const parts: string[] = [];
      if (entry.cuisine) parts.push(entry.cuisine as string);
      if (entry.rating != null) parts.push(`Rating: ${entry.rating}/10`);
      if (entry.price != null) parts.push(`$${(entry.price as number).toFixed(2)}`);
      return {
        key: `food-${refId}`,
        type,
        refId,
        date,
        title: entry.restaurant as string,
        subtitle: parts.join(' · ') || undefined,
        preview: entry.notes as string | undefined,
        rating: entry.rating as number | undefined,
        mood,
      };
    }

    case 'travel': {
      const date = dateToMillis(entry.startDate as Parameters<typeof dateToMillis>[0]) ?? 0;
      const parts: string[] = [];
      if (entry.durationDays) parts.push(`${entry.durationDays}d`);
      if (entry.rating != null) parts.push(`Rating: ${entry.rating}/10`);
      if (Array.isArray(entry.companions) && (entry.companions as string[]).length > 0) {
        parts.push(`with ${(entry.companions as string[]).join(', ')}`);
      }
      return {
        key: `travel-${refId}`,
        type,
        refId,
        date,
        title: entry.destination as string,
        subtitle: parts.join(' · ') || undefined,
        preview: entry.notes as string | undefined,
        rating: entry.rating as number | undefined,
        mood,
        durationDays: entry.durationDays as number | undefined,
      };
    }

    case 'note': {
      const date = dateToMillis(entry.date as Parameters<typeof dateToMillis>[0]) ?? 0;
      const text = entry.text as string;
      const preview = text.length > 120 ? text.slice(0, 120) + '…' : text;
      return {
        key: `note-${refId}`,
        type,
        refId,
        date,
        title: (entry.title as string) || preview,
        subtitle: entry.type as string | undefined,
        preview,
        mood,
      };
    }

    case 'wishlist': {
      const date = dateToMillis(entry.createdAt as Parameters<typeof dateToMillis>[0]) ?? 0;
      return {
        key: `wishlist-${refId}`,
        type,
        refId,
        date,
        title: entry.title as string,
        subtitle: `Wishlist · ${entry.category as string}`,
        preview: entry.note as string | undefined,
        mood,
        category: entry.category as string | undefined,
        done: entry.done as boolean | undefined,
      };
    }

    default:
      return null;
  }
}

/**
 * Fetches all 5 memory collections in parallel and returns a flat,
 * chronologically-sorted array of TimelineEntry objects.
 * Only entries with a valid date are included.
 */
export function useTimeline() {
  const movies = useMovies();
  const food = useFood();
  const travel = useTravel();
  const notes = useNotes();
  const wishlist = useWishlist();

  const isLoading = movies.isLoading || food.isLoading || travel.isLoading || notes.isLoading || wishlist.isLoading;

  const error = movies.error || food.error || travel.error || notes.error || wishlist.error;

  const entries = useMemo<TimelineEntry[]>(() => {
    const all: TimelineEntry[] = [];

    for (const m of movies.data ?? []) {
      const e = normalize(m as unknown as Record<string, unknown>, 'movie');
      if (e && e.date > 0) all.push(e);
    }
    for (const f of food.data ?? []) {
      const e = normalize(f as unknown as Record<string, unknown>, 'food');
      if (e && e.date > 0) all.push(e);
    }
    for (const t of travel.data ?? []) {
      const e = normalize(t as unknown as Record<string, unknown>, 'travel');
      if (e && e.date > 0) all.push(e);
    }
    for (const n of notes.data ?? []) {
      const e = normalize(n as unknown as Record<string, unknown>, 'note');
      if (e && e.date > 0) all.push(e);
    }
    for (const w of wishlist.data ?? []) {
      const e = normalize(w as unknown as Record<string, unknown>, 'wishlist');
      if (e && e.date > 0) all.push(e);
    }

    all.sort((a, b) => b.date - a.date);
    return all;
  }, [movies.data, food.data, travel.data, notes.data, wishlist.data]);

  return { entries, isLoading, error };
}
