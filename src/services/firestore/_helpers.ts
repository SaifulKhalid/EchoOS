import type { DocumentSnapshot } from 'firebase/firestore';

export function safeDoc<T extends { id: string }>(doc: DocumentSnapshot): T {
  return { id: doc.id, ...doc.data() } as T;
}

export function firestorePayload<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  return { ...data };
}
