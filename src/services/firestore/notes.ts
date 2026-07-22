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

function notesRef(uid: string) {
  return collection(db, 'users', uid, 'notes');
}

function noteRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'notes', id);
}

/** Fetch all notes, newest first. */
export async function fetchNotes(uid: string): Promise<NoteEntry[]> {
  const q = query(notesRef(uid), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as NoteEntry[];
}

/** Add a new note. Date defaults to server timestamp if not provided. */
export async function addNote(
  uid: string,
  data: Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(notesRef(uid), {
    ...data,
    date: data.date ?? serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
  return ref.id;
}

/** Partial update to an existing note. */
export async function updateNote(
  uid: string,
  id: string,
  data: Partial<Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(noteRef(uid, id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

/** Delete a note. */
export async function deleteNote(uid: string, id: string): Promise<void> {
  await deleteDoc(noteRef(uid, id));
}
