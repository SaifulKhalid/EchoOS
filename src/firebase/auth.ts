import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  linkWithRedirect,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import type { UserProfile } from '@/types';

/**
 * Auth service — Google Sign-In + Anonymous mode.
 * Uses redirect-based sign-in to avoid Cross-Origin-Opener-Policy
 * console warnings that popup mode triggers.
 *
 * On first sign-in we lazily create the users/{uid} profile document.
 */

const googleProvider = new GoogleAuthProvider();

/** Ensure a users/{uid} profile doc exists; create it on first login. */
export async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const profile: Omit<UserProfile, 'createdAt'> & { createdAt: unknown } = {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
    createdAt: serverTimestamp(),
    settings: { theme: 'dark' },
  };
  await setDoc(ref, profile, { merge: true });
}

/**
 * Check and process a pending redirect sign-in result.
 * Must be called on mount in the login page (and settings page for upgrades).
 * Returns the signed-in user if the redirect completed, or null if nothing pending.
 */
export async function handleRedirectResult(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  if (result?.user) {
    await ensureUserProfile(result.user);
    return result.user;
  }
  return null;
}

/**
 * Initiate Google sign-in via redirect.
 * The user leaves the page for Google, then returns.
 * Call `handleRedirectResult()` on mount to process the result.
 */
export function signInWithGoogle(): Promise<void> {
  return signInWithRedirect(auth, googleProvider);
}

export async function signInAsGuest(): Promise<User> {
  const cred = await signInAnonymously(auth);
  await ensureUserProfile(cred.user);
  return cred.user;
}

/**
 * Upgrade an anonymous account to a permanent Google account, preserving
 * the same uid (and therefore all existing memories).
 * Uses redirect-based linking to avoid COOP console warnings.
 */
export function upgradeGuestToGoogle(): Promise<void> {
  if (!auth.currentUser) throw new Error('No active session to upgrade.');
  return linkWithRedirect(auth.currentUser, googleProvider);
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}

export function subscribeToAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
