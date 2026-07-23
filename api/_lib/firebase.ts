/**
 * Firebase Admin SDK singleton.
 *
 * Initialized from Vercel environment variables:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *
 * The private key from the Firebase Console JSON file uses literal `\n`
 * sequences that must be replaced with actual newlines for the SDK.
 *
 * ⚠️  NEVER commit a real service-account key to the repo. Set these
 *     three env vars in the Vercel dashboard (or a local .env file if
 *     testing with `vercel dev`).
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/** Lazy-initialized Firebase Admin Auth instance. */
let _auth: ReturnType<typeof getAuth> | null = null;
let _initError: Error | null = null;

/**
 * Returns the Firebase Admin Auth singleton, initializing it on first call.
 * Throws with a descriptive message if initialization fails.
 *
 * Unlike the old top-level `export const auth = getFirebaseAdmin()`, this
 * lazy pattern means the module always loads successfully. If Firebase
 * Admin is misconfigured, callers catch the error and return HTTP 500
 * with the actual reason — rather than crashing the function with a
 * cryptic `FUNCTION_INVOCATION_FAILED`.
 */
export function getAdminAuth() {
  if (_auth) return _auth;
  if (_initError) throw _initError;

  try {
    if (getApps().length > 0) {
      _auth = getAuth();
      return _auth;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, ' +
          'FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel environment variables.',
      );
    }

    // Vercel's single-line env input strips real newlines. Two common formats:
    // 1. Firebase JSON has `\n` (backslash + n) escape sequences
    // 2. Some pastes double-escape to `\\n`
    // Replace both in order: `\\n` → `\n` → actual newline.
    privateKey = privateKey.replace(/\\n/g, '\n');
    privateKey = privateKey.replace(/\n/g, '\n');

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });

    _auth = getAuth();
    return _auth;
  } catch (err) {
    _initError = err instanceof Error ? err : new Error(String(err));
    throw _initError;
  }
}
