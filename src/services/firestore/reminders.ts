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

function remindersRef(uid: string) {
  return collection(db, 'users', uid, 'reminders');
}

function reminderDocRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'reminders', id);
}

/** Fetch all reminders for a user, due-date ascending. */
export async function fetchReminders(uid: string): Promise<ReminderEntry[]> {
  const q = query(remindersRef(uid), orderBy('dueDate', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ReminderEntry[];
}

/** Create a new reminder. */
export async function addReminder(
  uid: string,
  data: Omit<ReminderEntry, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(remindersRef(uid), {
    ...data,
    createdAt: serverTimestamp(),
  } as Record<string, unknown>);
  return ref.id;
}

/** Update an existing reminder. */
export async function updateReminder(
  uid: string,
  id: string,
  data: Partial<Omit<ReminderEntry, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(reminderDocRef(uid, id), {
    ...data,
  } as Record<string, unknown>);
}

/** Delete a reminder. */
export async function deleteReminder(uid: string, id: string): Promise<void> {
  await deleteDoc(reminderDocRef(uid, id));
}
