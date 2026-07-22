import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { ChatMessage } from '@/types';

/**
 * Single-session chat storage. All messages for the current user are
 * stored under a fixed session id so re-loading the page restores the
 * conversation without needing a session browser.
 */

const SESSION_ID = 'current';

function messagesRef(uid: string) {
  return collection(db, 'users', uid, 'chats', SESSION_ID, 'messages');
}

/** Fetch all messages for the current session, oldest-first. */
export async function fetchMessages(uid: string): Promise<ChatMessage[]> {
  const q = query(messagesRef(uid), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ChatMessage[];
}

/** Append a single message to the session. */
export async function addMessage(
  uid: string,
  msg: Omit<ChatMessage, 'id' | 'createdAt'>,
): Promise<string> {
  // Ensure the session document exists (Firestore will auto-create the
  // subcollection, but we write the parent doc explicitly for clarity.)
  const sessionDoc = doc(db, 'users', uid, 'chats', SESSION_ID);
  const sessionSnap = await getDoc(sessionDoc);
  if (!sessionSnap.exists()) {
    await setDoc(sessionDoc, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const ref = await addDoc(messagesRef(uid), {
    ...msg,
    createdAt: serverTimestamp(),
  } as Record<string, unknown>);
  return ref.id;
}
