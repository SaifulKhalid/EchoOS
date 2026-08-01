import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddWishlistItem, useUpdateWishlistItem, useDeleteWishlistItem } from '@/hooks/useWishlist';
import { MOODS, type MoodId } from '@/config/constants';
import { IconSparkle } from '@/components/ui/icons';
import { useToastStore } from '@/services/toastStore';
import type { WishlistEntry } from '@/types';

const CATEGORIES: { id: WishlistEntry['category']; label: string; icon: string }[] = [
  { id: 'movie', label: 'Movie', icon: '🎬' },
  { id: 'place', label: 'Place', icon: '📍' },
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'book', label: 'Book', icon: '📚' },
  { id: 'product', label: 'Product', icon: '🛍️' },
];

interface WishlistFormModalProps {
  entry?: WishlistEntry | null;
  onClose: () => void;
}

export function WishlistFormModal({ entry, onClose }: WishlistFormModalProps) {
  const isEditing = !!entry;

  const [category, setCategory] = useState<WishlistEntry['category']>(entry?.category ?? 'movie');
  const [title, setTitle] = useState(entry?.title ?? '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [done, setDone] = useState(entry?.done ?? false);
  const [mood, setMood] = useState<MoodId | undefined>(entry?.mood);

  const addItem = useAddWishlistItem();
  const updateItem = useUpdateWishlistItem();
  const deleteItem = useDeleteWishlistItem();

  const saving = addItem.isPending || updateItem.isPending;
  const deleting = deleteItem.isPending;
  const valid = title.trim().length > 0;
  const hasContent = title.trim().length > 0 || note.trim().length > 0 || mood != null;

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
      category,
      title: title.trim(),
      note: note.trim() || undefined,
      done,
      mood: mood || undefined,
      tags: [] as string[],
    };

    try {
      if (isEditing && entry) {
        await updateItem.mutateAsync({ id: entry.id, data });
        useToastStore.getState().success('Wishlist item updated');
      } else {
        await addItem.mutateAsync(data);
        useToastStore.getState().success('Added to wishlist!');
      }
      onClose();
    } catch {
      useToastStore.getState().error('Failed to save. Please check your connection and try again.');
    }
  }, [valid, category, title, note, done, mood, isEditing, entry, addItem, updateItem, onClose]);

  const handleDelete = useCallback(async () => {
    if (!entry) return;
    if (!window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    try {
      await deleteItem.mutateAsync(entry.id);
      useToastStore.getState().success(`Deleted "${entry.title}"`);
      onClose();
    } catch {
      useToastStore.getState().error('Failed to delete. Please try again.');
    }
  }, [entry, deleteItem, onClose]);

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
          aria-label={isEditing ? 'Edit wishlist item' : 'Add to wishlist'}
          className="glass-strong relative w-full max-w-lg overflow-hidden rounded-3xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="font-display text-lg font-semibold">
              {isEditing ? 'Edit Wishlist Item' : 'Add to Wishlist'}
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
              {/* Category selector */}
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/60">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                        category === cat.id
                          ? 'border-indigo-500/50 bg-indigo-600 text-white shadow-sm'
                          : 'border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="wishlist-title" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                  Title *
                </label>
                <input
                  id="wishlist-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you want to experience?"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none transition-colors focus:border-indigo-500/60 focus:bg-white/[0.06]"
                  autoFocus
                />
              </div>

              {/* Note */}
              <div>
                <label htmlFor="wishlist-note" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                  Note
                </label>
                <textarea
                  id="wishlist-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why do you want this? Any specific details?"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-colors focus:border-indigo-500/60 focus:bg-white/[0.06]"
                />
              </div>

              {/* Done toggle */}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={(e) => setDone(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 accent-indigo-600 focus:ring-indigo-500"
                />
                Mark as completed
              </label>

              {/* Mood */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
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
                          ? 'border-indigo-500/50 bg-indigo-600 text-white shadow-sm'
                          : 'border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
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
                  'Add Item'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
