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

function wishlistRef(uid: string) {
  return collection(db, 'users', uid, 'wishlist');
}

function wishlistItemRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'wishlist', id);
}

/** Fetch all wishlist items, newest first. */
export async function fetchWishlist(uid: string): Promise<WishlistEntry[]> {
  const q = query(wishlistRef(uid), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WishlistEntry[];
}

/** Add a wishlist item. */
export async function addWishlistItem(
  uid: string,
  data: Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(wishlistRef(uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
  return ref.id;
}

/** Partial update to an existing wishlist item. */
export async function updateWishlistItem(
  uid: string,
  id: string,
  data: Partial<Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(wishlistItemRef(uid, id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

/** Delete a wishlist item. */
export async function deleteWishlistItem(uid: string, id: string): Promise<void> {
  await deleteDoc(wishlistItemRef(uid, id));
}
