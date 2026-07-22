import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from '@/config/env';

/**
 * Single Firebase app instance shared across the app.
 * Firestore is initialized with persistent local cache (IndexedDB) so the
 * app supports offline reads and dedupes network reads — directly serving
 * both the "offline support" and Spark-plan read-economy requirements.
 *
 * Firebase Storage is NOT used — all data lives in Firestore or is
 * fetched from external APIs (TMDB, Groq) via the Vercel proxy.
 */

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} else {
  // Placeholder init so the app shell renders even without real config.
  // Live data features guard on `isFirebaseConfigured` before calling out.
  app = initializeApp({ apiKey: 'demo', projectId: 'demo' });
  auth = getAuth(app);
  db = initializeFirestore(app, {});
}

export { app, auth, db };
