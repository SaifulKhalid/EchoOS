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
import type { MovieEntry } from '@/types';
import { safeDoc, firestorePayload } from './_helpers';

function moviesRef(uid: string) {
  return collection(db, 'users', uid, 'movies');
}

function movieRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'movies', id);
}

export async function fetchMovies(uid: string): Promise<MovieEntry[]> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const q = query(moviesRef(uid), orderBy('watchDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => safeDoc<MovieEntry>(d));
  } catch (err) {
    throw new Error(`Failed to fetch movies: ${(err as Error).message}`);
  }
}

export async function addMovie(
  uid: string,
  data: Omit<MovieEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const ref = await addDoc(
      moviesRef(uid),
      firestorePayload({
        ...data,
        watchDate: data.watchDate ?? serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    return ref.id;
  } catch (err) {
    throw new Error(`Failed to add movie: ${(err as Error).message}`);
  }
}

export async function updateMovie(
  uid: string,
  id: string,
  data: Partial<Omit<MovieEntry, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await updateDoc(
      movieRef(uid, id),
      firestorePayload({
        ...data,
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (err) {
    throw new Error(`Failed to update movie: ${(err as Error).message}`);
  }
}

export async function deleteMovie(uid: string, id: string): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await deleteDoc(movieRef(uid, id));
  } catch (err) {
    throw new Error(`Failed to delete movie: ${(err as Error).message}`);
  }
}
