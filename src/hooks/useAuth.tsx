import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { subscribeToAuth } from '@/firebase/auth';
import { isFirebaseConfigured } from '@/config/env';

interface AuthState {
  user: User | null;
  loading: boolean;
  /** False when Firebase env vars are missing — UI shows a setup notice. */
  configured: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  configured: isFirebaseConfigured,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Start loading as true only when Firebase is configured; if not
  // configured we skip the auth subscription entirely.
  const [loading, setLoading] = useState(() => isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    // onAuthStateChanged fires immediately with the cached session, then on
    // every sign-in/out — this is our single source of truth for auth.
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, configured: isFirebaseConfigured }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
