import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { NotificationEntry } from '@/types';
import { safeDoc, firestorePayload } from './_helpers';

function notificationsRef(uid: string) {
  return collection(db, 'users', uid, 'notifications');
}

function notifDocRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'notifications', id);
}

export async function fetchNotifications(uid: string): Promise<NotificationEntry[]> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const q = query(
      notificationsRef(uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => safeDoc<NotificationEntry>(d));
  } catch (err) {
    throw new Error(`Failed to fetch notifications: ${(err as Error).message}`, { cause: err });
  }
}

export async function addNotification(
  uid: string,
  data: Omit<NotificationEntry, 'id' | 'createdAt'>,
): Promise<string> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const ref = await addDoc(
      notificationsRef(uid),
      firestorePayload({
        ...data,
        createdAt: serverTimestamp(),
      }),
    );
    return ref.id;
  } catch (err) {
    throw new Error(`Failed to add notification: ${(err as Error).message}`, { cause: err });
  }
}

export async function markNotificationRead(
  uid: string,
  id: string,
): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await updateDoc(
      notifDocRef(uid, id),
      firestorePayload({ read: true }),
    );
  } catch (err) {
    throw new Error(`Failed to mark notification read: ${(err as Error).message}`, { cause: err });
  }
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  try {
    const q = query(
      notificationsRef(uid),
      where('read', '==', false),
      limit(50),
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 500);
      for (const d of chunk) {
        batch.update(d.ref, firestorePayload({ read: true }));
      }
      await batch.commit();
    }
  } catch (err) {
    throw new Error(`Failed to mark all notifications read: ${(err as Error).message}`, { cause: err });
  }
}

export async function deleteNotification(
  uid: string,
  id: string,
): Promise<void> {
  if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  if (!id || typeof id !== 'string') throw new Error('id is required');
  try {
    await deleteDoc(notifDocRef(uid, id));
  } catch (err) {
    throw new Error(`Failed to delete notification: ${(err as Error).message}`, { cause: err });
  }
}
