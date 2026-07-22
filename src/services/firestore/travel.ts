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
import type { TravelEntry } from '@/types';

function travelsRef(uid: string) {
  return collection(db, 'users', uid, 'travel');
}

function travelRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'travel', id);
}

/** Fetch all travel entries, newest start-date first. */
export async function fetchTravel(uid: string): Promise<TravelEntry[]> {
  const q = query(travelsRef(uid), orderBy('startDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as TravelEntry[];
}

/** Add a new travel entry. */
export async function addTravel(
  uid: string,
  data: Omit<TravelEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(travelsRef(uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
  return ref.id;
}

/** Partial update — merges into existing document. */
export async function updateTravel(
  uid: string,
  id: string,
  data: Partial<Omit<TravelEntry, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(travelRef(uid, id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

/** Delete a travel entry. */
export async function deleteTravel(uid: string, id: string): Promise<void> {
  await deleteDoc(travelRef(uid, id));
}
