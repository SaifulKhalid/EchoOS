import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateMovie, useDeleteMovie } from '@/hooks/useMovies';
import { MOODS, type MoodId } from '@/config/constants';
import { StarRating } from '@/components/ui/StarRating';
import { IconSparkle } from '@/components/ui/icons';
import { useToastStore } from '@/services/toastStore';
import type { MovieEntry } from '@/types';

/**
 * Full-screen modal for editing a logged movie entry. Provides controls
 * for rating, mood, review, watch date, favorite, rewatch, and deletion.
 * Opens with a fade + scale animation and closes on backdrop click / Escape.
 */
export function MovieEditModal({
  movie,
  onClose,
}: {
  movie: MovieEntry;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(movie.rating ?? 0);
  const [mood, setMood] = useState<MoodId | undefined>(movie.mood);
  const [review, setReview] = useState(movie.review ?? '');
  const [favorite, setFavorite] = useState(movie.favorite ?? false);
  const [rewatch, setRewatch] = useState(movie.rewatch ?? false);
  const [tagsInput, setTagsInput] = useState(movie.tags?.join(', ') ?? '');

  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();

  // Derive dirty state from current vs original values
  const dirty = useMemo(
    () =>
      rating !== (movie.rating ?? 0) ||
      mood !== movie.mood ||
      review !== (movie.review ?? '') ||
      favorite !== (movie.favorite ?? false) ||
      rewatch !== (movie.rewatch ?? false),
    [rating, mood, review, favorite, rewatch, movie],
  );

  const handleSave = useCallback(async () => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      await updateMovie.mutateAsync({
        id: movie.id,
        data: {
          rating: rating || undefined,
          mood: mood || undefined,
          review: review || undefined,
          favorite,
          rewatch,
          tags: tags.length > 0 ? tags : undefined,
        },
      });
      useToastStore.getState().success(`Updated "${movie.title}"`);
      onClose();
    } catch {
      useToastStore.getState().error('Failed to save. Please check your connection and try again.');
    }
  }, [movie.id, movie.title, rating, mood, review, favorite, rewatch, tagsInput, updateMovie, onClose]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`Delete "${movie.title}"? This cannot be undone.`)) return;
    try {
      await deleteMovie.mutateAsync(movie.id);
      useToastStore.getState().success(`Deleted "${movie.title}"`);
      onClose();
    } catch {
      useToastStore.getState().error('Failed to delete. Please try again.');
    }
  }, [movie.id, movie.title, deleteMovie, onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (dirty && !window.confirm('Discard unsaved changes?')) return;
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, dirty]);

  const saving = updateMovie.isPending;
  const deleting = deleteMovie.isPending;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-950/70 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            if (dirty && !window.confirm('Discard unsaved changes?')) return;
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${movie.title}`}
          className="glass-strong relative w-full max-w-xl overflow-hidden rounded-3xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="font-display text-lg font-semibold">Edit Entry</h2>
            <button
              onClick={() => {
                if (dirty && !window.confirm('Discard unsaved changes?')) return;
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            {/* Movie info banner */}
            <div className="mb-6 flex gap-4">
              <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/20">
                    ?
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-xl font-semibold leading-tight">
                  {movie.title}
                </h3>
                <p className="mt-0.5 text-sm text-white/60">
                  {movie.year}
                  {movie.director ? ` · ${movie.director}` : ''}
                  {movie.runtime ? ` · ${movie.runtime} min` : ''}
                </p>
                {movie.genres && movie.genres.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {movie.genres.map((g) => (
                      <span
                        key={g}
                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/60"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {/* Rating */}
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Your Rating
                </label>
                <StarRating value={rating} onChange={setRating} size="2xl" />
              </div>

              {/* Mood */}
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Mood
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMood(mood === m.id ? undefined : m.id)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                        mood === m.id
                          ? 'border-white/30 bg-white/15 text-white shadow-glow'
                          : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white/80'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review */}
              <div>
                <label htmlFor="movie-review" className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Review
                </label>
                <textarea
                  id="movie-review"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="What did you think of this movie?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={favorite}
                    onChange={(e) => setFavorite(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 accent-accent focus:ring-accent"
                  />
                  Favorite
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={rewatch}
                    onChange={(e) => setRewatch(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 accent-accent focus:ring-accent"
                  />
                  Rewatch
                </label>
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="movie-tags" className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Tags
                </label>
                <input
                  id="movie-tags"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Comma-separated tags (e.g. must-watch, sci-fi, classic)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl px-4 py-2 text-sm text-mood-love transition-colors hover:bg-mood-love/10 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (dirty && !window.confirm('Discard unsaved changes?')) return;
                  onClose();
                }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="btn-primary text-sm"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <IconSparkle width={15} height={15} className="animate-pulse" />
                    Saving…
                  </span>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
