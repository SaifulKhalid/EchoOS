import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from './useAuth';

export interface SessionInfo {
  lastVisit: number | null;
  previousVisit: number | null;
  isLoading: boolean;
}

const SESSION_STALE_MS = 30 * 60 * 1000; // 30 minutes threshold for new session

export function useSessionTracking(): SessionInfo {
  const { user } = useAuth();
  const [session, setSession] = useState<SessionInfo>({
    lastVisit: null,
    previousVisit: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!user) {
      setSession({ lastVisit: null, previousVisit: null, isLoading: false });
      return;
    }

    let isMounted = true;

    async function updateSession() {
      if (!user?.uid) return;
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        const now = Date.now();
        let prevVisit: number | null = null;
        let lastVisit: number | null = null;

        if (snap.exists()) {
          const data = snap.data();
          const storedLastVisit = data.lastVisit?.toMillis ? data.lastVisit.toMillis() : data.lastVisit;
          const storedPrevVisit = data.previousVisit?.toMillis ? data.previousVisit.toMillis() : data.previousVisit;

          if (storedLastVisit && typeof storedLastVisit === 'number') {
            lastVisit = storedLastVisit;
            // If the user hasn't visited in over 30 mins, push lastVisit to previousVisit
            if (now - storedLastVisit > SESSION_STALE_MS) {
              prevVisit = storedLastVisit;
              await setDoc(
                userRef,
                {
                  previousVisit: storedLastVisit,
                  lastVisit: serverTimestamp(),
                },
                { merge: true },
              );
            } else {
              prevVisit = storedPrevVisit ?? null;
            }
          } else {
            // First visit recorded
            await setDoc(userRef, { lastVisit: serverTimestamp() }, { merge: true });
          }
        } else {
          // Profile doc created
          await setDoc(
            userRef,
            {
              createdAt: serverTimestamp(),
              lastVisit: serverTimestamp(),
            },
            { merge: true },
          );
        }

        if (isMounted) {
          setSession({
            lastVisit: lastVisit ?? now,
            previousVisit: prevVisit ?? now - 7 * 24 * 60 * 60 * 1000,
            isLoading: false,
          });
        }
      } catch (err) {
        console.error('Failed to update session tracking:', err);
        if (isMounted) {
          setSession({
            lastVisit: Date.now(),
            previousVisit: Date.now() - 7 * 24 * 60 * 60 * 1000,
            isLoading: false,
          });
        }
      }
    }

    updateSession();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return session;
}
