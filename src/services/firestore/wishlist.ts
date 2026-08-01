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
import type { WishlistEntry } from '@/types';
import { safeDoc, firestorePayload } from './_helpers';

function wishlistRef(uid: string) {
  return collection(db, 'users', uid, 'wishlist');
}

function wishlistItemRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'wishlist', id);
}

export async function fetchWishlist(uid: string): Promise<WishlistEntry[]> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const q = query(wishlistRef(uid), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => safeDoc<WishlistEntry>(d));
  } catch (err) {
    throw new Error(`Failed to fetch wishlist: ${(err as Error).message}`, { cause: err });
  }
}

export async function addWishlistItem(
  uid: string,
  data: Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const ref = await addDoc(
      wishlistRef(uid),
      firestorePayload({
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    return ref.id;
  } catch (err) {
    throw new Error(`Failed to add wishlist item: ${(err as Error).message}`, { cause: err });
  }
}

export async function updateWishlistItem(
  uid: string,
  id: string,
  data: Partial<Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await updateDoc(
      wishlistItemRef(uid, id),
      firestorePayload({
        ...data,
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (err) {
    throw new Error(`Failed to update wishlist item: ${(err as Error).message}`, { cause: err });
  }
}

export async function deleteWishlistItem(uid: string, id: string): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await deleteDoc(wishlistItemRef(uid, id));
  } catch (err) {
    throw new Error(`Failed to delete wishlist item: ${(err as Error).message}`, { cause: err });
  }
}
