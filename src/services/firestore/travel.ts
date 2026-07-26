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
import { safeDoc, firestorePayload } from './_helpers';

function travelsRef(uid: string) {
  return collection(db, 'users', uid, 'travel');
}

function travelRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'travel', id);
}

export async function fetchTravel(uid: string): Promise<TravelEntry[]> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const q = query(travelsRef(uid), orderBy('startDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => safeDoc<TravelEntry>(d));
  } catch (err) {
    throw new Error(`Failed to fetch travel: ${(err as Error).message}`);
  }
}

export async function addTravel(
  uid: string,
  data: Omit<TravelEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const ref = await addDoc(
      travelsRef(uid),
      firestorePayload({
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    return ref.id;
  } catch (err) {
    throw new Error(`Failed to add travel: ${(err as Error).message}`);
  }
}

export async function updateTravel(
  uid: string,
  id: string,
  data: Partial<Omit<TravelEntry, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await updateDoc(
      travelRef(uid, id),
      firestorePayload({
        ...data,
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (err) {
    throw new Error(`Failed to update travel: ${(err as Error).message}`);
  }
}

export async function deleteTravel(uid: string, id: string): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await deleteDoc(travelRef(uid, id));
  } catch (err) {
    throw new Error(`Failed to delete travel: ${(err as Error).message}`);
  }
}
