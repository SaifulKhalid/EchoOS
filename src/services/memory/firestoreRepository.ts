/**
 * services/memory/firestoreRepository.ts
 *
 * Firestore-backed implementation of MemoryRepository (ADR-0001, Phase 0).
 *
 * This is the CONSOLIDATION of the former per-category services
 * (services/firestore/movies.ts, food.ts, travel.ts, notes.ts, wishlist.ts)
 * into a single config-driven class. Queries, payload shapes, and error
 * messages are preserved 1:1 — this is a pure structural refactor with
 * zero behavior change.
 *
 * Later, DriveRepository (Google Drive + IndexedDB mirror) will implement
 * the same MemoryRepository interface behind the same getRepository()
 * factory (see services/memory/index.ts).
 */

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
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { MemoryCategory } from '@/config/constants';
import type { BaseEntry } from '@/types';
import { safeDoc, firestorePayload } from '@/services/firestore/_helpers';
import type { MemoryRepository, MemoryRetrievalOptions } from './types';

// ── Per-category config ─────────────────────────────────────
// Preserves the exact sort field, server-timestamp default, and error
// labels that each former service used.
interface CategoryConfig {
  /** Firestore subcollection under users/{uid}. */
  collection: string;
  /** Field used by fetchAll() ordering (desc). */
  sortField: string;
  /** Optional field defaulted to serverTimestamp on add. */
  defaultDateField?: string;
  /** Label in "Failed to fetch …" messages. */
  fetchLabel: string;
  /** Label in add/update/delete error messages. */
  itemLabel: string;
}

const CATEGORY_CONFIG: Record<MemoryCategory, CategoryConfig> = {
  movie: {
    collection: 'movies',
    sortField: 'watchDate',
    defaultDateField: 'watchDate',
    fetchLabel: 'movies',
    itemLabel: 'movie',
  },
  food: {
    collection: 'food',
    sortField: 'date',
    defaultDateField: 'date',
    fetchLabel: 'food',
    itemLabel: 'food',
  },
  travel: {
    collection: 'travel',
    sortField: 'startDate',
    fetchLabel: 'travel',
    itemLabel: 'travel',
  },
  note: {
    collection: 'notes',
    sortField: 'date',
    defaultDateField: 'date',
    fetchLabel: 'notes',
    itemLabel: 'note',
  },
  wishlist: {
    collection: 'wishlist',
    sortField: 'createdAt',
    fetchLabel: 'wishlist',
    itemLabel: 'wishlist item',
  },
  goal: {
    collection: 'goals',
    sortField: 'createdAt',
    fetchLabel: 'goals',
    itemLabel: 'goal',
  },
};

// ── Implementation ──────────────────────────────────────────

export class FirestoreRepository<T extends BaseEntry> implements MemoryRepository<T> {
  private readonly config: CategoryConfig;

  constructor(category: MemoryCategory) {
    this.config = CATEGORY_CONFIG[category];
  }

  private collectionRef(uid: string) {
    return collection(db, 'users', uid, this.config.collection);
  }

  private docRef(uid: string, id: string) {
    return doc(db, 'users', uid, this.config.collection, id);
  }

  private requireUid(uid: string): void {
    if (!uid || typeof uid !== 'string') throw new Error('uid is required');
  }

  private requireId(id: string): void {
    if (!id || typeof id !== 'string') throw new Error('id is required');
  }

  async fetchAll(uid: string): Promise<T[]> {
    this.requireUid(uid);
    try {
      const q = query(this.collectionRef(uid), orderBy(this.config.sortField, 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => safeDoc<T>(d));
    } catch (err) {
      throw new Error(`Failed to fetch ${this.config.fetchLabel}: ${(err as Error).message}`, {
        cause: err,
      });
    }
  }

  /**
   * AI-oriented retrieval: newest-first by createdAt, capped, optionally
   * time-filtered. Mirrors the former memoryRetriever.fetchCategory query
   * EXACTLY — including no error wrapping (the old code let Firestore
   * errors propagate raw, and the AI pipeline surfaces those messages).
   */
  async retrieve(uid: string, options: MemoryRetrievalOptions = {}): Promise<T[]> {
    this.requireUid(uid);
    const limitCount = options.limitPerCategory ?? 50;

    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (options.since) {
      constraints.push(where('createdAt', '>=', options.since));
    }
    if (options.until) {
      constraints.push(where('createdAt', '<=', options.until));
    }
    constraints.push(limit(limitCount));

    const q = query(this.collectionRef(uid), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => safeDoc<T>(d));
  }

  async add(uid: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    this.requireUid(uid);
    try {
      const payload: Record<string, unknown> = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      // Categories that display on a date field default it to now (as the
      // former services did: movies.watchDate, food.date, notes.date).
      if (this.config.defaultDateField) {
        const value = (data as Record<string, unknown>)[this.config.defaultDateField];
        payload[this.config.defaultDateField] = value ?? serverTimestamp();
      }
      const ref = await addDoc(this.collectionRef(uid), firestorePayload(payload));
      return ref.id;
    } catch (err) {
      throw new Error(`Failed to add ${this.config.itemLabel}: ${(err as Error).message}`, {
        cause: err,
      });
    }
  }

  async update(
    uid: string,
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<void> {
    this.requireUid(uid);
    this.requireId(id);
    try {
      await updateDoc(
        this.docRef(uid, id),
        firestorePayload({ ...data, updatedAt: serverTimestamp() }),
      );
    } catch (err) {
      throw new Error(`Failed to update ${this.config.itemLabel}: ${(err as Error).message}`, {
        cause: err,
      });
    }
  }

  async delete(uid: string, id: string): Promise<void> {
    this.requireUid(uid);
    this.requireId(id);
    try {
      await deleteDoc(this.docRef(uid, id));
    } catch (err) {
      throw new Error(`Failed to delete ${this.config.itemLabel}: ${(err as Error).message}`, {
        cause: err,
      });
    }
  }
}
