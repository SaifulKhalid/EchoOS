import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { NoteEntry } from '@/types';
import { safeDoc, firestorePayload } from './_helpers';

function notesRef(uid: string) {
  return collection(db, 'users', uid, 'notes');
}

function noteRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'notes', id);
}

export async function fetchNotes(uid: string): Promise<NoteEntry[]> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const q = query(notesRef(uid), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => safeDoc<NoteEntry>(d));
  } catch (err) {
    throw new Error(`Failed to fetch notes: ${(err as Error).message}`);
  }
}

export async function addNote(
  uid: string,
  data: Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const ref = await addDoc(
      notesRef(uid),
      firestorePayload({
        ...data,
        date: data.date ?? serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    return ref.id;
  } catch (err) {
    throw new Error(`Failed to add note: ${(err as Error).message}`);
  }
}

export async function updateNote(
  uid: string,
  id: string,
  data: Partial<Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await updateDoc(
      noteRef(uid, id),
      firestorePayload({
        ...data,
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (err) {
    throw new Error(`Failed to update note: ${(err as Error).message}`);
  }
}

export async function deleteNote(uid: string, id: string): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await deleteDoc(noteRef(uid, id));
  } catch (err) {
    throw new Error(`Failed to delete note: ${(err as Error).message}`);
  }
}
