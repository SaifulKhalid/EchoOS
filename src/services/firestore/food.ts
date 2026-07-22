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
import type { FoodEntry } from '@/types';

function foodsRef(uid: string) {
  return collection(db, 'users', uid, 'food');
}

function foodRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'food', id);
}

/** Fetch all food entries, newest date first. */
export async function fetchFood(uid: string): Promise<FoodEntry[]> {
  const q = query(foodsRef(uid), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FoodEntry[];
}

/** Add a new food entry. Date defaults to server timestamp if not provided. */
export async function addFood(
  uid: string,
  data: Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(foodsRef(uid), {
    ...data,
    date: data.date ?? serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
  return ref.id;
}

/** Partial update — merges into existing document. */
export async function updateFood(
  uid: string,
  id: string,
  data: Partial<Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(foodRef(uid, id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

/** Delete a food entry. */
export async function deleteFood(uid: string, id: string): Promise<void> {
  await deleteDoc(foodRef(uid, id));
}
