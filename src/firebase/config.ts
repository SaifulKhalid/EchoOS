import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig, isFirebaseConfigured } from '@/config/env';

/**
 * Single Firebase app instance shared across the app.
 * Firestore is initialized with persistent local cache (IndexedDB) so the
 * app supports offline reads and dedupes network reads — directly serving
 * both the "offline support" and Spark-plan read-economy requirements.
 */

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  storage = getStorage(app);
} else {
  // Placeholder init so the app shell renders even without real config.
  // Live data features guard on `isFirebaseConfigured` before calling out.
  app = initializeApp({ apiKey: 'demo', projectId: 'demo' });
  auth = getAuth(app);
  db = initializeFirestore(app, {});
  storage = getStorage(app);
}

export { app, auth, db, storage };
