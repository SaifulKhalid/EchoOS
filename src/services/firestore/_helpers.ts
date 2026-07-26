import type { DocumentSnapshot } from 'firebase/firestore';

export function safeDoc<T extends { id: string }>(doc: DocumentSnapshot): T {
  return { id: doc.id, ...doc.data() } as T;
}

export function firestorePayload<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }
  return payload;
}
