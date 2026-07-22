import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from './useAuth';
import type { UserProfile } from '@/types';

export type ThemeMode = 'dark' | 'light';
export type AiPersona = 'default' | 'witty' | 'analytical' | 'enthusiastic' | 'minimalist';

export interface Preferences {
  theme: ThemeMode;
  aiPersona: AiPersona;
  remindersEnabled: boolean;
}

const STORAGE_KEY = 'echoos:prefs';

const PERSONA_LABELS: Record<AiPersona, string> = {
  default: 'Default',
  witty: 'Witty',
  analytical: 'Analytical',
  enthusiastic: 'Enthusiastic',
  minimalist: 'Minimalist',
};

const PERSONA_DESCRIPTIONS: Record<AiPersona, string> = {
  default: 'Friendly and insightful, like a close friend.',
  witty: 'Quick with humor and clever observations.',
  analytical: 'Data-driven and precise, focusing on patterns.',
  enthusiastic: 'Energetic and excited about your memories.',
  minimalist: 'Short, direct answers with minimum fluff.',
};

function loadLocal(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Preferences;
  } catch { /* ignore */ }
  return { theme: 'dark', aiPersona: 'default', remindersEnabled: true };
}

function saveLocal(prefs: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

/**
 * Synchronizes user preferences between Firestore and localStorage.
 * On mount, reads from localStorage (fast) then hydrates from Firestore
 * if available. Updates are written optimistically to localStorage then
 * pushed to Firestore in the background.
 */
export function usePreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(loadLocal);

  // Apply theme on every change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', prefs.theme === 'dark');
  }, [prefs.theme]);

  // Hydrate from Firestore whenever the user changes
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const profile = snap.data() as UserProfile | undefined;
        if (profile?.settings?.theme || profile?.settings?.aiPersona) {
          setPrefs((prev) => ({
            theme: (profile.settings?.theme as ThemeMode) ?? prev.theme,
            aiPersona: (profile.settings?.aiPersona as AiPersona) ?? prev.aiPersona,
            remindersEnabled: profile.settings?.notificationsEnabled ?? prev.remindersEnabled,
          }));
        }
      } catch { /* fall back to local */ }
    })();
  }, [user]);

  const update = useCallback(
    (patch: Partial<Preferences>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        saveLocal(next);

        // Optimistic Firestore write
        if (user) {
          updateDoc(doc(db, 'users', user.uid), {
            settings: { theme: next.theme, aiPersona: next.aiPersona, notificationsEnabled: next.remindersEnabled },
            updatedAt: serverTimestamp(),
          } as Record<string, unknown>).catch(() => { /* ignore */ });
        }

        return next;
      });
    },
    [user],
  );

  const setTheme = useCallback((theme: ThemeMode) => update({ theme }), [update]);
  const setAiPersona = useCallback((aiPersona: AiPersona) => update({ aiPersona }), [update]);
  const setRemindersEnabled = useCallback(
    (remindersEnabled: boolean) => update({ remindersEnabled }),
    [update],
  );

  return { ...prefs, setTheme, setAiPersona, setRemindersEnabled, PERSONA_LABELS, PERSONA_DESCRIPTIONS };
}
