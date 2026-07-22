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

/** Reference to the user's movies subcollection. */
function moviesRef(uid: string) {
  return collection(db, 'users', uid, 'movies');
}

/** Reference to a single movie document. */
function movieRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'movies', id);
}

/** Fetch all movies for a user, newest watch-date first. */
export async function fetchMovies(uid: string): Promise<MovieEntry[]> {
  const q = query(moviesRef(uid), orderBy('watchDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as MovieEntry[];
}

/**
 * Add a new movie entry. If no `watchDate` is provided, it defaults to the
 * server timestamp (≈ today). `createdAt` and `updatedAt` are always set.
 */
export async function addMovie(
  uid: string,
  data: Omit<MovieEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(moviesRef(uid), {
    ...data,
    watchDate: data.watchDate ?? serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
  return ref.id;
}

/** Partial update — merges into the existing document. */
export async function updateMovie(
  uid: string,
  id: string,
  data: Partial<Omit<MovieEntry, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(movieRef(uid, id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

/** Delete a movie entry forever. */
export async function deleteMovie(uid: string, id: string): Promise<void> {
  await deleteDoc(movieRef(uid, id));
}

