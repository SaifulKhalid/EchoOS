/**
 * services/memory/types.ts
 *
 * The storage abstraction behind ADR-0001 (Google Drive migration, Phase 0).
 *
 * MemoryRepository is the single injection point between the UI/AI layers
 * and personal-archive storage. Today the only implementation is
 * FirestoreRepository; a future DriveRepository (Google Drive + IndexedDB
 * mirror) will implement the same interface behind the same getRepository()
 * factory — so no consumer needs to change when storage moves to Drive.
 *
 * Consumers must depend ONLY on this interface:
 *   - hooks (useMovies, useFood, …)
 *   - services/tools/handlers.ts (AI action handlers)
 *   - memory/memoryRetriever.ts (AI retrieval)
 */

import type { BaseEntry } from '@/types';

/** Options for AI retrieval (time-range + cap per category). */
export interface MemoryRetrievalOptions {
  /** Epoch ms — only entries created at/after this time. */
  since?: number;
  /** Epoch ms — only entries created at/before this time. */
  until?: number;
  /** Maximum items per category. Default 50. */
  limitPerCategory?: number;
}

/**
 * CRUD contract for one memory category.
 *
 * Implementations:
 *   - FirestoreRepository (current, Phase 0)
 *   - DriveRepository     (future, Google Drive + IndexedDB mirror)
 *
 * Every entry type extends BaseEntry (id, createdAt, updatedAt).
 * Storage backends decide how ids/dates are minted — consumers never do.
 */
export interface MemoryRepository<T extends BaseEntry = BaseEntry> {
  /** Fetch all entries for a user, newest-first. */
  fetchAll(uid: string): Promise<T[]>;
  /** AI-oriented retrieval: capped, optionally time-filtered, newest-first. */
  retrieve(uid: string, options?: MemoryRetrievalOptions): Promise<T[]>;
  /** Create an entry; returns the new id. */
  add(uid: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  /** Patch an existing entry. */
  update(
    uid: string,
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<void>;
  /** Delete an entry by id. */
  delete(uid: string, id: string): Promise<void>;
}

