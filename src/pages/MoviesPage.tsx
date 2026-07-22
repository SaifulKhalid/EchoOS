import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconMovie } from '@/components/ui/icons';
import { MovieSearchBar } from '@/components/movies/MovieSearchBar';
import { MovieEditModal } from '@/components/movies/MovieEditModal';
import { useMovies } from '@/hooks/useMovies';
import type { MovieEntry } from '@/types';
import { dateSortKey } from '@/utils/dates';

type SortKey = 'watchDate' | 'rating' | 'title';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'watchDate', label: 'Recent' },
  { key: 'rating', label: 'Rating' },
  { key: 'title', label: 'Title' },
];

/**
 * Movies page — TMDB search to quick-add, poster grid of logged entries,
 * click-to-edit modal, and sort/filter controls.
 */
export default function MoviesPage() {
  const { data: movies, isLoading } = useMovies();
  const [editing, setEditing] = useState<MovieEntry | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('watchDate');
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Sort & filter
  const displayed = useMemo(() => {
    if (!movies) return [];
    let list = [...movies];

    if (filterFavorites) list = list.filter((m) => m.favorite);

    list.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'watchDate':
        default:
          return dateSortKey(b.watchDate) - dateSortKey(a.watchDate);
      }
    });

    return list;
  }, [movies, sortBy, filterFavorites]);

  return (
    <>
      <PageHeader
        title="Movies"
        subtitle="Search TMDB to log what you watched. Click any entry to edit details."
      />

      {/* Search bar */}
      <div className="mb-6">
        <MovieSearchBar />
      </div>

      {/* Sort & filter toolbar */}
      {displayed.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortBy === opt.key
                    ? 'bg-accent-gradient text-ink-950'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/50 hover:text-white/70">
            <input
              type="checkbox"
              checked={filterFavorites}
              onChange={(e) => setFilterFavorites(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
            />
            Favorites only
          </label>

          {displayed.length > 0 && (
            <span className="ml-auto text-xs text-white/35">
              {displayed.length} movie{displayed.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Content area */}
      {isLoading ? (
        <LoadingGrid />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<IconMovie width={26} height={26} />}
          title="No movies logged yet"
          description={
            filterFavorites
              ? 'No favorites yet. Uncheck "Favorites only" or add movies above.'
              : 'Search for a movie above and click "Log" to start building your library.'
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {displayed.map((movie, i) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                index={i}
                onClick={() => setEditing(movie)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Edit modal */}
      {editing && (
        <MovieEditModal movie={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

/* ── Poster-card component ─────────────────────────────────── */

function MovieCard({
  movie,
  index,
  onClick,
}: {
  movie: MovieEntry;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={onClick}
      className="group relative aspect-[2/3] overflow-hidden rounded-2xl bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {movie.poster ? (
        <img
          src={movie.poster}
          alt={movie.title}
          className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <IconMovie width={36} height={36} className="text-white/15" />
        </div>
      )}

      {/* Rating badge */}
      {movie.rating && (
        <div className="absolute right-2 top-2 rounded-lg bg-ink-950/70 px-2 py-0.5 text-xs font-semibold text-mood-joy shadow-lg backdrop-blur-sm">
          {movie.rating}
        </div>
      )}

      {/* Favorite heart */}
      {movie.favorite && (
        <div className="absolute left-2 top-2 text-mood-love drop-shadow-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 20s-7-4.4-9.2-8.4A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5.6C19 15.6 12 20 12 20Z" />
          </svg>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/40 to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="truncate text-sm font-medium text-white drop-shadow-md">
            {movie.title}
          </p>
          <p className="mt-0.5 text-xs text-white/60">
            {movie.year ?? '—'}
            {movie.rating && ` · ${movie.rating}/10`}
          </p>
          {movie.genres && movie.genres.length > 0 && (
            <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-white/40">
              {movie.genres.slice(0, 2).join(' · ')}
            </p>
          )}
          {movie.mood && (
            <span className="mt-1.5 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
              {movie.mood}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ── Loading skeleton grid ─────────────────────────────────── */

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] animate-pulse rounded-2xl bg-white/5"
        >
          <div className="skeleton h-full w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
