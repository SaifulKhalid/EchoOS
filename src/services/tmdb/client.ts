import { auth } from '@/firebase/config';
import { API_BASE_URL, TMDB_DEV_KEY } from '@/config/env';
import { cacheGet, cacheSet, TTL } from '@/utils/cache';
import type {
  TmdbSearchResponse,
  TmdbSearchResult,
  TmdbMovieDetails,
} from './types';

/**
 * TMDB client with two transport modes:
 *   • DEV  — if VITE_TMDB_DEV_KEY is set, call TMDB directly (browser).
 *   • PROD — otherwise call the Vercel proxy at /api/tmdb, which injects the
 *            secret key server-side after verifying the Firebase ID token.
 * Movie details are cached in localStorage so re-opening a film is free.
 * Search results are also cached briefly to avoid redundant API hits.
 */

const TMDB_DIRECT = 'https://api.themoviedb.org/3';

async function directFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_DIRECT}/${path}`);
  url.searchParams.set('api_key', TMDB_DEV_KEY as string);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);
  return res.json() as Promise<T>;
}

async function proxyFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in to search movies.');

  const base = API_BASE_URL || window.location.origin;
  const url = new URL(`${base}/api/tmdb`);
  url.searchParams.set('path', path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 429) throw new Error('Too many requests — please slow down.');
  if (!res.ok) throw new Error(`TMDB proxy error ${res.status}`);
  return res.json() as Promise<T>;
}

/** Route through dev-direct or proxy depending on env. */
function tmdbFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  return TMDB_DEV_KEY ? directFetch<T>(path, params) : proxyFetch<T>(path, params);
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const cacheKey = `tmdb:search:${q.toLowerCase()}`;
  const cached = cacheGet<TmdbSearchResult[]>(cacheKey);
  if (cached) return cached;

  const data = await tmdbFetch<TmdbSearchResponse>('search/movie', {
    query: q,
    include_adult: 'false',
    language: 'en-US',
    page: '1',
  });
  const results = data.results.filter((r) => r.poster_path).slice(0, 18);
  cacheSet(cacheKey, results, TTL.hour);
  return results;
}

export async function getMovieDetails(id: number): Promise<TmdbMovieDetails> {
  const cacheKey = `tmdb:movie:${id}`;
  const cached = cacheGet<TmdbMovieDetails>(cacheKey);
  if (cached) return cached;

  const data = await tmdbFetch<TmdbMovieDetails>(`movie/${id}`, {
    language: 'en-US',
    append_to_response: 'credits',
  });
  cacheSet(cacheKey, data, TTL.week);
  return data;
}

/** Pull the director + top-billed cast names out of a details response. */
export function extractCredits(details: TmdbMovieDetails): {
  director?: string;
  cast: string[];
} {
  const director = details.credits?.crew?.find((c) => c.job === 'Director')?.name;
  const cast =
    details.credits?.cast
      ?.slice()
      .sort((a, b) => a.order - b.order)
      .slice(0, 5)
      .map((c) => c.name) ?? [];
  return { director, cast };
}
