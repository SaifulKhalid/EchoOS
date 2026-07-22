import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddNote, useUpdateNote, useDeleteNote } from '@/hooks/useNotes';
import { MOODS, type MoodId } from '@/config/constants';
import { IconSparkle } from '@/components/ui/icons';
import { dateToInputValue, todayInputValue, inputValueToMillis } from '@/utils/dates';
import type { NoteEntry } from '@/types';

const NOTE_TYPES: { id: NoteEntry['type']; label: string; desc: string }[] = [
  { id: 'idea', label: 'Idea', desc: 'A spark worth keeping' },
  { id: 'journal', label: 'Journal', desc: 'A moment in your day' },
  { id: 'thought', label: 'Thought', desc: 'Something on your mind' },
];

interface NoteFormModalProps {
  entry?: NoteEntry | null;
  onClose: () => void;
}

export function NoteFormModal({ entry, onClose }: NoteFormModalProps) {
  const isEditing = !!entry;

  const [type, setType] = useState<NoteEntry['type']>(entry?.type ?? 'thought');
  const [title, setTitle] = useState(entry?.title ?? '');
  const [text, setText] = useState(entry?.text ?? '');
  const [date, setDate] = useState(() => entry?.date ? dateToInputValue(entry.date) : todayInputValue());
  const [mood, setMood] = useState<MoodId | undefined>(entry?.mood);

  const addNote = useAddNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const saving = addNote.isPending || updateNote.isPending;
  const deleting = deleteNote.isPending;
  const valid = text.trim().length > 0;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!valid) return;

    const data = {
      type,
      title: title.trim() || undefined,
      text: text.trim(),
      date: inputValueToMillis(date),
      mood: mood || undefined,
      tags: [] as string[],
    };

    if (isEditing && entry) {
      await updateNote.mutateAsync({ id: entry.id, data });
    } else {
      await addNote.mutateAsync(data);
    }
    onClose();
  }, [valid, type, title, text, date, mood, isEditing, entry, addNote, updateNote, onClose]);

  const handleDelete = useCallback(async () => {
    if (!entry) return;
    await deleteNote.mutateAsync(entry.id);
    onClose();
  }, [entry, deleteNote, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-950/70 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label={isEditing ? 'Edit note' : 'New note'}
          className="glass-strong relative w-full max-w-lg overflow-hidden rounded-3xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="font-display text-lg font-semibold">
              {isEditing ? 'Edit Note' : 'New Note'}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          {/* Form body */}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              {/* Note type selector */}
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Type
                </label>
                <div className="flex gap-2">
                  {NOTE_TYPES.map((nt) => (
                    <button
                      key={nt.id}
                      type="button"
                      onClick={() => setType(nt.id)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-left transition-all ${
                        type === nt.id
                          ? 'border-accent/40 bg-accent/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <p className={`text-sm font-medium ${
                        type === nt.id ? 'text-accent-soft' : 'text-white/70'
                      }`}>
                        {nt.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/40">{nt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Optional title…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                  autoFocus
                />
              </div>

              {/* Text */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Note *
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={5}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                />
              </div>

              {/* Date */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 outline-none transition-colors focus:border-accent/50 focus:bg-white/10"
                />
              </div>

              {/* Mood */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
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
                          : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/80'
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
              <button onClick={onClose} className="btn-ghost text-sm">
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
                  'Save Note'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
