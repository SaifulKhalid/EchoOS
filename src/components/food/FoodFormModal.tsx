import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddFood, useUpdateFood, useDeleteFood } from '@/hooks/useFood';
import { MOODS, type MoodId } from '@/config/constants';
import { StarRating } from '@/components/ui/StarRating';
import { IconSparkle } from '@/components/ui/icons';
import { useToastStore } from '@/services/toastStore';
import { dateToInputValue, todayInputValue, inputValueToMillis } from '@/utils/dates';
import type { FoodEntry } from '@/types';

interface FoodFormModalProps {
  /** When provided, modal is in edit mode; otherwise add mode. */
  entry?: FoodEntry | null;
  onClose: () => void;
}

/**
 * Dual-purpose modal: add a new food entry or edit an existing one.
 * All form fields are optional except `restaurant` (required on save).
 */
export function FoodFormModal({ entry, onClose }: FoodFormModalProps) {
  const isEditing = !!entry;

  const [restaurant, setRestaurant] = useState(entry?.restaurant ?? '');
  const [cuisine, setCuisine] = useState(entry?.cuisine ?? '');
  const [price, setPrice] = useState(String(entry?.price ?? ''));
  const [rating, setRating] = useState(entry?.rating ?? 0);
  const [favoriteDishes, setFavoriteDishes] = useState(
    entry?.favoriteDishes?.join(', ') ?? '',
  );
  const [mood, setMood] = useState<MoodId | undefined>(entry?.mood);
  const [date, setDate] = useState(() => entry?.date ? dateToInputValue(entry.date) : todayInputValue());
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [favorite, setFavorite] = useState(entry?.favorite ?? false);

  const addFood = useAddFood();
  const updateFood = useUpdateFood();
  const deleteFood = useDeleteFood();

  const saving = addFood.isPending || updateFood.isPending;
  const deleting = deleteFood.isPending;
  const valid = restaurant.trim().length > 0;
  const hasContent = restaurant.trim().length > 0 || cuisine.trim().length > 0 || price.trim().length > 0 || rating > 0 || favoriteDishes.trim().length > 0 || mood != null || notes.trim().length > 0 || favorite;

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

    const dishes = favoriteDishes
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    const data = {
      restaurant: restaurant.trim(),
      cuisine: cuisine.trim() || undefined,
      price: price ? Number(price) : undefined,
      rating: rating || undefined,
      favoriteDishes: dishes.length > 0 ? dishes : undefined,
      date: inputValueToMillis(date),
      mood: mood || undefined,
      notes: notes.trim() || undefined,
      favorite,
      tags: [] as string[],
    };

    try {
      if (isEditing && entry) {
        await updateFood.mutateAsync({ id: entry.id, data });
        useToastStore.getState().success('Entry updated');
      } else {
        await addFood.mutateAsync(data);
        useToastStore.getState().success('Meal logged!');
      }
      onClose();
    } catch {
      useToastStore.getState().error('Failed to save. Please check your connection and try again.');
    }
  }, [
    valid, restaurant, cuisine, price, rating, favoriteDishes, date,
    mood, notes, favorite, isEditing, entry, addFood, updateFood, onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!entry) return;
    if (!window.confirm(`Delete the entry for "${entry.restaurant}"? This cannot be undone.`)) return;
    try {
      await deleteFood.mutateAsync(entry.id);
      useToastStore.getState().success(`Deleted "${entry.restaurant}"`);
      onClose();
    } catch {
      useToastStore.getState().error('Failed to delete. Please try again.');
    }
  }, [entry, deleteFood, onClose]);

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
          aria-label={isEditing ? 'Edit meal entry' : 'Add new meal'}
          className="glass-strong relative w-full max-w-lg overflow-hidden rounded-3xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="font-display text-lg font-semibold">
              {isEditing ? 'Edit Entry' : 'Add Meal'}
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
              {/* Restaurant name */}
              <div>
                <label htmlFor="food-restaurant" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Restaurant *
                </label>
                <input
                  id="food-restaurant"
                  type="text"
                  value={restaurant}
                  onChange={(e) => setRestaurant(e.target.value)}
                  placeholder="e.g. Joe's Italian Kitchen"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                  autoFocus
                />
              </div>

              {/* Cuisine + Price row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="food-cuisine" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                    Cuisine
                  </label>
                  <input
                    id="food-cuisine"
                    type="text"
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    placeholder="e.g. Italian"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                  />
                </div>
                <div>
                  <label htmlFor="food-price" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                    Price ($)
                  </label>
                  <input
                    id="food-price"
                    type="number"
                    min={0}
                    step={0.5}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Rating
                </label>
                <StarRating value={rating} onChange={setRating} size="2xl" />
              </div>

              {/* Favorite dishes */}
              <div>
                <label htmlFor="food-favorite-dishes" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Favorite Dishes
                </label>
                <input
                  id="food-favorite-dishes"
                  type="text"
                  value={favoriteDishes}
                  onChange={(e) => setFavoriteDishes(e.target.value)}
                  placeholder="Comma-separated (e.g. Pasta Carbonara, Tiramisu)"
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
                <label htmlFor="food-notes" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Notes
                </label>
                <textarea
                  id="food-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How was the experience?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                />
              </div>

                {/* Date */}
              <div>
                <label htmlFor="food-date" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Date
                </label>
                <input
                  id="food-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
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
                  'Log Meal'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
