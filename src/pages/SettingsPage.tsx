import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PwaStatus } from '@/components/ui/PwaStatus';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences, type AiPersona } from '@/hooks/usePreferences';
import { useReminders, useAddReminder, useDeleteReminder } from '@/hooks/useReminders';
import { upgradeGuestToGoogle, handleRedirectResult, signOut } from '@/firebase/auth';
import { IconGoogle, IconClock, IconTrash } from '@/components/ui/icons';
import { getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import { deleteUser } from 'firebase/auth';
import { API_BASE_URL } from '@/config/env';
import { dateToInputValue, todayInputValue } from '@/utils/dates';
import { EXPORT_COLLECTIONS, APP_TAGLINE } from '@/config/constants';
import { useToastStore } from '@/services/toastStore';
import pkg from '../../package.json';
import type { ReminderInterval } from '@/types';

/**
 * Settings page — account management, theme, AI persona, PWA status,
 * and data controls. Every preference is persisted to Firestore and
 * localStorage for instant sync.
 */
export default function SettingsPage() {
  const { user } = useAuth();
  const {
    theme,
    aiPersona,
    remindersEnabled,
    setTheme,
    setAiPersona,
    setRemindersEnabled,
    PERSONA_LABELS,
    PERSONA_DESCRIPTIONS,
  } = usePreferences();
  const { data: reminders } = useReminders();
  const addReminder = useAddReminder();
  const deleteReminder = useDeleteReminder();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remMsg, setRemMsg] = useState('');
  const [remDate, setRemDate] = useState(todayInputValue());
  const [remInterval, setRemInterval] = useState<ReminderInterval>('once');

  // Process redirect result after guest-to-Google upgrade
  useEffect(() => {
    handleRedirectResult().then((u) => {
      if (u) {
        setMsg('Account linked — your memories are now saved to Google.');
      }
    });
  }, []);

  async function upgrade() {
    setBusy(true);
    setMsg(null);
    try {
      await upgradeGuestToGoogle();
      setMsg('Account linked — your memories are now saved to Google.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not link account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your account and preferences." />

      <div className="space-y-4">
        {/* ── Account ── */}
        <GlassCard>
          <h3 className="mb-4 text-sm font-medium text-white/70">Account</h3>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-indigo-600 text-lg font-semibold text-white shadow-sm">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                (user?.displayName ?? 'G').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">
                {user?.displayName ?? 'Guest session'}
              </p>
              <p className="truncate text-sm text-white/50">
                {user?.email ?? (user?.isAnonymous ? 'Anonymous mode' : '')}
              </p>
            </div>
          </div>

          {user?.isAnonymous && (
            <div className="mt-5">
              <button onClick={upgrade} disabled={busy} className="btn-primary w-full">
                <IconGoogle />
                {busy ? 'Linking…' : 'Save my data — link Google'}
              </button>
            </div>
          )}

          {msg && <p className="mt-3 text-xs text-white/60">{msg}</p>}

          <button
            onClick={() => {
              const isAnon = user?.isAnonymous;
              if (isAnon && !window.confirm('You are signed in as a guest. Signing out will permanently lose all your data unless you link a Google account first. Continue?')) return;
              signOut();
            }}
            className="mt-4 text-sm text-white/50 underline-offset-4 hover:text-white/80 hover:underline"
          >
            Sign out
          </button>
        </GlassCard>

        {/* ── Appearance ── */}
        <GlassCard>
          <h3 className="mb-4 text-sm font-medium text-white/70">Appearance</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Theme</p>
              <p className="text-xs text-white/60">
                Currently {theme === 'dark' ? 'Dark' : 'Light'} mode
              </p>
            </div>
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        </GlassCard>

        {/* ── AI Persona ── */}
        <GlassCard>
          <h3 className="mb-4 text-sm font-medium text-white/70">AI Persona</h3>
          <p className="mb-4 text-xs text-white/60">
            Choose how EchoOS talks to you in the chat.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(PERSONA_LABELS) as AiPersona[]).map((p) => (
              <button
                key={p}
                onClick={() => setAiPersona(p)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  aiPersona === p
                    ? 'border-accent/40 bg-accent/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-medium ${
                      aiPersona === p ? 'text-accent-soft' : 'text-white/70'
                    }`}
                  >
                    {PERSONA_LABELS[p]}
                  </p>
                  {aiPersona === p && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm"
                    >
                      ✓
                    </motion.span>
                  )}
                </div>
                <p className="mt-1 text-xs text-white/55">{PERSONA_DESCRIPTIONS[p]}</p>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* ── Reminders ── */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-white/70">Reminders</h3>
              <p className="text-xs text-white/60 mt-0.5">
                Get in-app notifications for your memory prompts.
              </p>
            </div>
            <label className="relative inline-flex h-6 w-10 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(e) => setRemindersEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-white/15 transition-colors peer-checked:bg-accent/50" />
              <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white/80 transition-transform peer-checked:translate-x-4" />
            </label>
          </div>

          {remindersEnabled && (
            <>
              {/* Active reminders list */}
              <div className="mb-4 space-y-2">
                {!reminders || reminders.length === 0 ? (
                  <p className="text-xs text-white/55 py-2">
                    No reminders yet. Create one below.
                  </p>
                ) : (
                  reminders.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white/80">{r.title}</p>
                        <p className="text-xs text-white/55 truncate">
                          {r.message} · {r.interval} · {dateToInputValue(r.dueDate)}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteReminder.mutate(r.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-mood-love/20 hover:text-mood-love"
                        aria-label="Delete reminder"
                      >
                        <IconTrash width={14} height={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* New reminder form */}
              <button
                onClick={() => setShowForm((v) => !v)}
                className="flex items-center gap-2 text-xs text-accent-soft transition-colors hover:text-white"
              >
                <IconClock width={14} height={14} />
                {showForm ? 'Cancel' : 'New reminder'}
              </button>

              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 space-y-3 overflow-hidden"
                  >
                    <input
                      placeholder="Reminder title"
                      value={remTitle}
                      onChange={(e) => setRemTitle(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/55 focus:border-accent/40"
                    />
                    <input
                      placeholder="Optional message"
                      value={remMsg}
                      onChange={(e) => setRemMsg(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/55 focus:border-accent/40"
                    />
                    <div className="flex gap-3">
                      <input
                        type="date"
                        value={remDate}
                        onChange={(e) => setRemDate(e.target.value)}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent/40"
                      />
                      <select
                        value={remInterval}
                        onChange={(e) => setRemInterval(e.target.value as ReminderInterval)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent/40"
                      >
                        <option value="once">Once</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (!remTitle.trim()) return;
                        const dueMs = new Date(remDate + 'T09:00:00').getTime();
                        addReminder.mutate(
                          {
                            title: remTitle.trim(),
                            message: remMsg.trim() || remTitle.trim(),
                            dueDate: dueMs,
                            interval: remInterval,
                          },
                          {
                            onSuccess: () => {
                              setRemTitle('');
                              setRemMsg('');
                              setRemDate(todayInputValue());
                              setRemInterval('once');
                              setShowForm(false);
                            },
                          },
                        );
                      }}
                      className="btn-primary w-full"
                    >
                      Create reminder
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </GlassCard>

        {/* ── App (PWA) ── */}
        <GlassCard>
          <h3 className="mb-4 text-sm font-medium text-white/70">App</h3>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-white/80">Install EchoOS</p>
              <p className="text-xs text-white/60">
                Install as a standalone app for offline access and quick launching.
              </p>
            </div>
            <PwaStatus />
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-white/55">
            <span>Version {pkg.version}</span>
            <span>·</span>
            <span>EchoOS</span>
            <span>·</span>
            <span className="lowercase">{APP_TAGLINE}</span>
          </div>
        </GlassCard>

        {/* ── Data ── */}
        <GlassCard>
          <h3 className="mb-4 text-sm font-medium text-white/70">Data</h3>
          <p className="mb-4 text-xs text-white/60">
            Your data is stored securely in Firebase and synced across your devices.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (confirm('This will reload the app and clear local cache. Continue?')) {
                  if ('caches' in window) {
                    caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
                  }
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="rounded-xl border border-mood-love/20 bg-mood-love/10 px-4 py-2 text-xs text-mood-love transition-colors hover:bg-mood-love/20"
            >
              Clear local cache
            </button>

            {/* Export data */}
            <button
              onClick={async () => {
                if (!user) return;
                try {
                  const exportData: Record<string, unknown[]> = {};

                  for (const cat of EXPORT_COLLECTIONS) {
                    const q = query(collection(db, 'users', user.uid, cat), orderBy('createdAt', 'desc'));
                    const snap = await getDocs(q);
                    exportData[cat] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                  }

                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `echoos-export-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  useToastStore.getState().error('Failed to export data. Please try again.');
                }
              }}
              className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-2 text-xs text-accent-soft transition-colors hover:bg-accent/20"
            >
              Export all data (JSON)
            </button>
          </div>
        </GlassCard>

        {/* ── Danger Zone ── */}
        <GlassCard className="border-mood-love/20">
          <h3 className="mb-4 text-sm font-medium text-mood-love">Danger Zone</h3>
          <p className="mb-4 text-xs text-white/60">
            Deleting your account removes all your memories, preferences, and chat history permanently.
            This cannot be undone.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                if (!user) return;
                setDeleteError(null);
                if (!window.confirm('Delete your entire account? All memories, notes, and chat history will be permanently removed. This cannot be undone.')) return;

                try {
                  const token = await user.getIdToken();
                  const base = API_BASE_URL || window.location.origin;

                  const res = await fetch(`${base}/api/delete-account`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                  });

                  if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(text || `Error ${res.status}`);
                  }

                  if (auth.currentUser) {
                    await deleteUser(auth.currentUser).catch(() => {});
                  }

                  signOut();
                } catch (e) {
                  const msg = e instanceof Error ? e.message : 'An error occurred';
                  setDeleteError(`Failed to delete account: ${msg}. Please try again.`);
                }
              }}
              className="rounded-xl border border-mood-love/20 bg-mood-love/10 px-4 py-2 text-xs text-mood-love transition-colors hover:bg-mood-love/20"
            >
              Delete my account and all data
            </button>
          </div>
          {deleteError && <p className="mt-3 text-xs text-mood-love">{deleteError}</p>}
        </GlassCard>
      </div>
    </>
  );
}
