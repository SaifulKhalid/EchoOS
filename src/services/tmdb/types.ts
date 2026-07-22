/**
 * TMDB API types — only the fields EchoOS actually uses.
 * Keeping this narrow means we store minimal data (Phase 1 constraint:
 * "only store necessary information").
 */

export interface TmdbSearchResult {
  id: number;
  title: string;
  original_title?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  original_language?: string;
  overview?: string;
}

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbCastMember {
  name: string;
  order: number;
}

interface TmdbCrewMember {
  name: string;
  job: string;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  original_language?: string;
  overview?: string;
  genres?: TmdbGenre[];
  credits?: {
    cast?: TmdbCastMember[];
    crew?: TmdbCrewMember[];
  };
}

/**
 * TMDB genre id → name map (movies). Bundled locally so we never spend an
 * API call resolving genre names for search results.
 */
export const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export function genreIdsToNames(ids: number[] | undefined): string[] {
  if (!ids) return [];
  return ids.map((id) => TMDB_GENRE_MAP[id]).filter(Boolean);
}
