import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { searchMovies } from '@/services/tmdb/client';
import { posterUrl, backdropUrl, releaseYear } from '@/services/tmdb/images';
import { genreIdsToNames } from '@/services/tmdb/types';
import { useAddMovie } from '@/hooks/useMovies';
import { IconSparkle } from '@/components/ui/icons';
import type { TmdbSearchResult } from '@/services/tmdb/types';

/**
 * TMDB-powered search bar. Typing triggers a debounced search; results
 * appear in a floating dropdown. Clicking a result quick-adds it to the
 * user's movie library with TMDB metadata and today's watch date.
 */
export function MovieSearchBar() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search input (300 ms)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const {
    data: results,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['tmdb-search', debounced],
    queryFn: () => searchMovies(debounced),
    enabled: debounced.length >= 2,
  });

  const addMovie = useAddMovie();
  const [addingId, setAddingId] = useState<number | null>(null);

  async function handleQuickAdd(result: TmdbSearchResult) {
    if (addingId) return;
    setAddingId(result.id);
    try {
      await addMovie.mutateAsync({
        tmdbId: result.id,
        title: result.title,
        poster: posterUrl(result.poster_path),
        backdrop: backdropUrl(result.backdrop_path),
        genres: genreIdsToNames(result.genre_ids),
        year: releaseYear(result.release_date),
        language: result.original_language,
        overview: result.overview,
        tags: [],
      });
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    } finally {
      setAddingId(null);
    }
  }

  const showDropdown = open && debounced.length >= 2 && results;

  return (
    <div ref={containerRef} className="relative z-30">
      <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3">
        <IconSparkle width={18} height={18} className="shrink-0 text-accent-soft" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search any movie on TMDB to log it…"
          className="min-w-0 flex-1 bg-transparent text-sm text-white/90 placeholder-white/30 outline-none"
        />
        {(isLoading || isFetching) && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
        )}
        {query && !isLoading && (
          <button
            onClick={() => {
              setQuery('');
              setDebounced('');
              inputRef.current?.focus();
            }}
            className="text-xs text-white/40 hover:text-white/70"
          >
            Clear
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.96 }}
            transition={{ duration: 0.2 }}
            className="glass-strong absolute mt-2 max-h-80 w-full overflow-y-auto rounded-2xl p-2"
          >
            <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wider text-white/35">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleQuickAdd(result)}
                disabled={addingId === result.id}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {result.poster_path ? (
                    <img
                      src={posterUrl(result.poster_path, 'w185')}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-white/20">
                      ?
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/90 group-hover:text-white">
                    {result.title}
                  </p>
                  <p className="text-xs text-white/40">
                    {releaseYear(result.release_date) ?? 'Unknown year'}
                    {result.vote_average
                      ? ` · ${result.vote_average.toFixed(1)} avg`
                      : ''}
                  </p>
                </div>
                {addingId === result.id ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
                ) : (
                  <span className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
                    Log
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}

        {showDropdown && results.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-strong absolute mt-2 w-full rounded-2xl p-5 text-center text-sm text-white/40"
          >
            No movies found for "{debounced}"
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
