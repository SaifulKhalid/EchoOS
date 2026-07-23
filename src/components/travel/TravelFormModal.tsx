import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddTravel, useUpdateTravel, useDeleteTravel } from '@/hooks/useTravel';
import { MOODS, type MoodId } from '@/config/constants';
import { StarRating } from '@/components/ui/StarRating';
import { IconSparkle } from '@/components/ui/icons';
import { useToastStore } from '@/services/toastStore';
import { dateToInputValue, inputValueToMillis } from '@/utils/dates';
import type { TravelEntry } from '@/types';

interface TravelFormModalProps {
  entry?: TravelEntry | null;
  onClose: () => void;
}

/**
 * Dual-purpose modal: add a new trip or edit an existing one.
 * Duration is auto-calculated from the start and end date range.
 */
export function TravelFormModal({ entry, onClose }: TravelFormModalProps) {
  const isEditing = !!entry;

  const [destination, setDestination] = useState(entry?.destination ?? '');
  const [startDate, setStartDate] = useState(() => dateToInputValue(entry?.startDate));
  const [endDate, setEndDate] = useState(() => dateToInputValue(entry?.endDate));
  const [budget, setBudget] = useState(String(entry?.budget ?? ''));
  const [rating, setRating] = useState(entry?.rating ?? 0);
  const [companions, setCompanions] = useState(
    entry?.companions?.join(', ') ?? '',
  );
  const [places, setPlaces] = useState(entry?.places?.join(', ') ?? '');
  const [favoriteMoments, setFavoriteMoments] = useState(
    entry?.favoriteMoments?.join(', ') ?? '',
  );
  const [mood, setMood] = useState<MoodId | undefined>(entry?.mood);
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [favorite, setFavorite] = useState(entry?.favorite ?? false);

  const addTravel = useAddTravel();
  const updateTravel = useUpdateTravel();
  const deleteTravel = useDeleteTravel();

  const saving = addTravel.isPending || updateTravel.isPending;
  const deleting = deleteTravel.isPending;
  const valid = destination.trim().length > 0;
  const hasContent = destination.trim().length > 0 || budget.trim().length > 0 || rating > 0 || companions.trim().length > 0 || places.trim().length > 0 || favoriteMoments.trim().length > 0 || mood != null || notes.trim().length > 0 || favorite;

  // Auto-calculate duration from date range
  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return undefined;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return undefined;
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (hasContent && !window.confirm('Discard unsaved changes?')) return;
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, hasContent]);

  const handleSave = useCallback(async () => {
    if (!valid) return;

    const data = {
      destination: destination.trim(),
      startDate: inputValueToMillis(startDate),
      endDate: inputValueToMillis(endDate),
      durationDays,
      budget: budget ? Number(budget) : undefined,
      rating: rating || undefined,
      companions: companions
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean) || undefined,
      places: places
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean) || undefined,
      favoriteMoments: favoriteMoments
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean) || undefined,
      mood: mood || undefined,
      notes: notes.trim() || undefined,
      favorite,
      tags: [] as string[],
    };

    try {
      if (isEditing && entry) {
        await updateTravel.mutateAsync({ id: entry.id, data });
        useToastStore.getState().success('Trip updated');
      } else {
        await addTravel.mutateAsync(data);
        useToastStore.getState().success('Trip logged!');
      }
      onClose();
    } catch {
      useToastStore.getState().error('Failed to save. Please check your connection and try again.');
    }
  }, [
    valid, destination, startDate, endDate, durationDays,
    budget, rating, companions, places, favoriteMoments,
    mood, notes, favorite, isEditing, entry, addTravel, updateTravel, onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!entry) return;
    if (!window.confirm(`Delete the trip to "${entry.destination}"? This cannot be undone.`)) return;
    try {
      await deleteTravel.mutateAsync(entry.id);
      useToastStore.getState().success(`Deleted trip to "${entry.destination}"`);
      onClose();
    } catch {
      useToastStore.getState().error('Failed to delete. Please try again.');
    }
  }, [entry, deleteTravel, onClose]);

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
            if (hasContent && !window.confirm('Discard unsaved changes?')) return;
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
          aria-label={isEditing ? 'Edit trip entry' : 'Add new trip'}
          className="glass-strong relative w-full max-w-lg overflow-hidden rounded-3xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="font-display text-lg font-semibold">
              {isEditing ? 'Edit Trip' : 'Add Trip'}
            </h2>
            <button
              onClick={() => {
                if (hasContent && !window.confirm('Discard unsaved changes?')) return;
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          {/* Form body */}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              {/* Destination */}
              <div>
                <label htmlFor="travel-destination" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Destination *
                </label>
                <input
                  id="travel-destination"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Kyoto, Japan"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                  autoFocus
                />
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="travel-start-date" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                    Start Date
                  </label>
                  <input
                    id="travel-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                  />
                </div>
                <div>
                  <label htmlFor="travel-end-date" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                    End Date
                  </label>
                  <input
                    id="travel-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                  />
                </div>
              </div>

              {/* Auto-calculated duration badge */}
              {startDate && endDate && durationDays != null && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-2 text-xs text-accent-soft">
                  Duration: <strong>{durationDays} day{durationDays !== 1 ? 's' : ''}</strong>
                </div>
              )}

              {/* Budget + Rating row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="travel-budget" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                    Budget ($)
                  </label>
                  <input
                    id="travel-budget"
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                    Rating
                  </label>
                  <StarRating value={rating} onChange={setRating} size="2xl" />
                </div>
              </div>

              {/* Companions */}
              <div>
                <label htmlFor="travel-companions" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Companions
                </label>
                <input
                  id="travel-companions"
                  type="text"
                  value={companions}
                  onChange={(e) => setCompanions(e.target.value)}
                  placeholder="Comma-separated names"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                />
              </div>

              {/* Places visited */}
              <div>
                <label htmlFor="travel-places" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Places Visited
                </label>
                <input
                  id="travel-places"
                  type="text"
                  value={places}
                  onChange={(e) => setPlaces(e.target.value)}
                  placeholder="Comma-separated (e.g. Fushimi Inari, Arashiyama)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                />
              </div>

              {/* Favorite moments */}
              <div>
                <label htmlFor="travel-favorite-moments" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Favorite Moments
                </label>
                <input
                  id="travel-favorite-moments"
                  type="text"
                  value={favoriteMoments}
                  onChange={(e) => setFavoriteMoments(e.target.value)}
                  placeholder="Comma-separated"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                />
              </div>

              {/* Mood */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Mood
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
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

              {/* Notes */}
              <div>
                <label htmlFor="travel-notes" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Notes
                </label>
                <textarea
                  id="travel-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How was the trip?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                />
              </div>

              {/* Favorite toggle */}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={favorite}
                  onChange={(e) => setFavorite(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 accent-accent focus:ring-accent"
                />
                Mark as favorite
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
            {isEditing ? (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl px-4 py-2 text-sm text-mood-love transition-colors hover:bg-mood-love/10 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <button onClick={() => {
                if (hasContent && !window.confirm('Discard unsaved changes?')) return;
                onClose();
              }} className="btn-ghost text-sm">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!valid || saving}
                className="btn-primary text-sm"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <IconSparkle width={15} height={15} className="animate-pulse" />
                    Saving…
                  </span>
                ) : isEditing ? (
                  'Save'
                ) : (
                  'Log Trip'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


