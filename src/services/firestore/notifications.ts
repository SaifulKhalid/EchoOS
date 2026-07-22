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
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { NotificationEntry } from '@/types';

function notificationsRef(uid: string) {
  return collection(db, 'users', uid, 'notifications');
}

function notifDocRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'notifications', id);
}

/** Fetch all notifications for a user, newest first. */
export async function fetchNotifications(uid: string): Promise<NotificationEntry[]> {
  const q = query(
    notificationsRef(uid),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as NotificationEntry[];
}

/** Create a notification. */
export async function addNotification(
  uid: string,
  data: Omit<NotificationEntry, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(notificationsRef(uid), {
    ...data,
    createdAt: serverTimestamp(),
  } as Record<string, unknown>);
  return ref.id;
}

/** Mark a single notification as read. */
export async function markNotificationRead(
  uid: string,
  id: string,
): Promise<void> {
  await updateDoc(notifDocRef(uid, id), {
    read: true,
  } as Record<string, unknown>);
}

/** Mark all notifications as read. */
export async function markAllNotificationsRead(uid: string): Promise<void> {
  const q = query(notificationsRef(uid), where('read', '==', false));
  const snapshot = await getDocs(q);
  const writes = snapshot.docs.map((d) =>
    updateDoc(d.ref, { read: true } as Record<string, unknown>),
  );
  await Promise.all(writes);
}

/** Delete a single notification. */
export async function deleteNotification(
  uid: string,
  id: string,
): Promise<void> {
  await deleteDoc(notifDocRef(uid, id));
}
