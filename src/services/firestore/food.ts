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
import { safeDoc, firestorePayload } from './_helpers';

function foodsRef(uid: string) {
  return collection(db, 'users', uid, 'food');
}

function foodRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'food', id);
}

export async function fetchFood(uid: string): Promise<FoodEntry[]> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const q = query(foodsRef(uid), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => safeDoc<FoodEntry>(d));
  } catch (err) {
    throw new Error(`Failed to fetch food: ${(err as Error).message}`, { cause: err });
  }
}

export async function addFood(
  uid: string,
  data: Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const ref = await addDoc(
      foodsRef(uid),
      firestorePayload({
        ...data,
        date: data.date ?? serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    return ref.id;
  } catch (err) {
    throw new Error(`Failed to add food: ${(err as Error).message}`, { cause: err });
  }
}

export async function updateFood(
  uid: string,
  id: string,
  data: Partial<Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await updateDoc(
      foodRef(uid, id),
      firestorePayload({
        ...data,
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (err) {
    throw new Error(`Failed to update food: ${(err as Error).message}`, { cause: err });
  }
}

export async function deleteFood(uid: string, id: string): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await deleteDoc(foodRef(uid, id));
  } catch (err) {
    throw new Error(`Failed to delete food: ${(err as Error).message}`, { cause: err });
  }
}
