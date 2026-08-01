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
import { safeDoc, firestorePayload } from './_helpers';

const SESSION_ID = 'current';

function messagesRef(uid: string) {
  return collection(db, 'users', uid, 'chats', SESSION_ID, 'messages');
}

export async function fetchMessages(uid: string): Promise<ChatMessage[]> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const q = query(messagesRef(uid), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => safeDoc<ChatMessage>(d));
  } catch (err) {
    throw new Error(`Failed to fetch messages: ${(err as Error).message}`, { cause: err });
  }
}

export async function addMessage(
  uid: string,
  msg: Omit<ChatMessage, 'id' | 'createdAt'>,
): Promise<string> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const sessionDoc = doc(db, 'users', uid, 'chats', SESSION_ID);
    const sessionSnap = await getDoc(sessionDoc);
    if (!sessionSnap.exists()) {
      await setDoc(sessionDoc, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const ref = await addDoc(
      messagesRef(uid),
      firestorePayload({
        ...msg,
        createdAt: serverTimestamp(),
      }),
    );
    return ref.id;
  } catch (err) {
    throw new Error(`Failed to add message: ${(err as Error).message}`, { cause: err });
  }
}
