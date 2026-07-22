import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  linkWithPopup,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import type { UserProfile } from '@/types';

/**
 * Auth service — Google Sign-In + Anonymous mode (Phase 1 decision).
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

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function signInAsGuest(): Promise<User> {
  const cred = await signInAnonymously(auth);
  await ensureUserProfile(cred.user);
  return cred.user;
}

/**
 * Upgrade an anonymous account to a permanent Google account, preserving
 * the same uid (and therefore all existing memories).
 */
export async function upgradeGuestToGoogle(): Promise<User> {
  if (!auth.currentUser) throw new Error('No active session to upgrade.');
  const cred = await linkWithPopup(auth.currentUser, googleProvider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}

export function subscribeToAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
