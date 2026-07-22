/**
 * Centralized, typed access to environment variables.
 * Only VITE_-prefixed vars exist in the browser bundle. Secret keys
 * (Groq/TMDB) live in the Vercel proxy and are never referenced here.
 */

interface FirebaseEnv {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

function required(key: string, value: string | undefined): string {
  if (!value || value.startsWith('your-')) {
    // In dev we warn loudly but don't crash the whole app, so the UI shell
    // still renders and the developer sees a clear message.
    console.warn(
      `[EchoOS] Missing env var "${key}". Copy .env.example to .env.local and fill it in.`,
    );
    return value ?? '';
  }
  return value;
}

export const firebaseConfig: FirebaseEnv = {
  apiKey: required('VITE_FIREBASE_API_KEY', import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: required('VITE_FIREBASE_AUTH_DOMAIN', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: required('VITE_FIREBASE_PROJECT_ID', import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: required(
    'VITE_FIREBASE_STORAGE_BUCKET',
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId: required(
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: required('VITE_FIREBASE_APP_ID', import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * LOCAL-DEV-ONLY TMDB key. When present, the client calls TMDB directly so
 * you can test with just `npm run dev` (no `vercel dev`). In production this
 * is unset and all TMDB traffic flows through the secure Vercel proxy.
 * NEVER set this in a production build — it would expose the key.
 */
export const TMDB_DEV_KEY: string | undefined = import.meta.env.VITE_TMDB_DEV_KEY;

/** True when the Firebase config looks real (used to gate live features). */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);
