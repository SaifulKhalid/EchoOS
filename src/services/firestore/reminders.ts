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
import type { ReminderEntry } from '@/types';
import { safeDoc, firestorePayload } from './_helpers';

function remindersRef(uid: string) {
  return collection(db, 'users', uid, 'reminders');
}

function reminderDocRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'reminders', id);
}

export async function fetchReminders(uid: string): Promise<ReminderEntry[]> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const q = query(remindersRef(uid), orderBy('dueDate', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => safeDoc<ReminderEntry>(d));
  } catch (err) {
    throw new Error(`Failed to fetch reminders: ${(err as Error).message}`, { cause: err });
  }
}

export async function addReminder(
  uid: string,
  data: Omit<ReminderEntry, 'id' | 'createdAt'>,
): Promise<string> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const ref = await addDoc(
      remindersRef(uid),
      firestorePayload({
        ...data,
        createdAt: serverTimestamp(),
      }),
    );
    return ref.id;
  } catch (err) {
    throw new Error(`Failed to add reminder: ${(err as Error).message}`, { cause: err });
  }
}

export async function updateReminder(
  uid: string,
  id: string,
  data: Partial<Omit<ReminderEntry, 'id' | 'createdAt'>>,
): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await updateDoc(
      reminderDocRef(uid, id),
      firestorePayload({ ...data }),
    );
  } catch (err) {
    throw new Error(`Failed to update reminder: ${(err as Error).message}`, { cause: err });
  }
}

export async function deleteReminder(uid: string, id: string): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await deleteDoc(reminderDocRef(uid, id));
  } catch (err) {
    throw new Error(`Failed to delete reminder: ${(err as Error).message}`, { cause: err });
  }
}
