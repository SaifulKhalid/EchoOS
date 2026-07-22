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

function getFirebaseAdmin() {
  if (getApps().length > 0) {
    return getAuth();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in environment variables.',
    );
  }

  // The Vercel dashboard strips newlines from env vars, so keys are often
  // stored with literal `\n` sequences that need to be replaced.
  privateKey = privateKey.replace(/\\n/g, '\n');

  // Also handle the case where the key uses single backslash-n (as in Firebase JSON format)
  privateKey = privateKey.replace(/\n/g, '\n');

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return getAuth();
}

export const auth = getFirebaseAdmin();
