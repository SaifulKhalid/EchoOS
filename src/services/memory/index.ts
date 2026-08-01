/**
 * services/memory/index.ts
 *
 * The storage abstraction public surface (ADR-0001, Phase 0).
 *
 * getRepository() is the SINGLE injection point for personal-archive
 * storage. Every consumer (hooks, AI tool handlers, memory retriever)
 * obtains a category repository here and depends only on the
 * MemoryRepository interface — never on Firestore directly.
 *
 * Phase 0: always returns FirestoreRepository.
 * Phase 2 (Drive-primary): this factory will select DriveRepository when
 * the user has connected Google Drive, with Firestore as fallback —
 * no consumer changes required.
 */

import type { MemoryCategory } from '@/config/constants';
import type {
  BaseEntry,
  MovieEntry,
  FoodEntry,
  TravelEntry,
  NoteEntry,
  WishlistEntry,
  GoalEntry,
} from '@/types';
import { FirestoreRepository } from './firestoreRepository';
import type { MemoryRepository } from './types';

export type { MemoryRepository, MemoryRetrievalOptions } from './types';

export { FirestoreRepository } from './firestoreRepository';

// ── Singleton per-category repositories ─────────────────────
// One instance per category; stateless except for config, safe to share.
const repositories: Record<
  MemoryCategory,
  MemoryRepository<MovieEntry> |
    MemoryRepository<FoodEntry> |
    MemoryRepository<TravelEntry> |
    MemoryRepository<NoteEntry> |
    MemoryRepository<WishlistEntry> |
    MemoryRepository<GoalEntry>
> = {
  movie: new FirestoreRepository<MovieEntry>('movie'),
  food: new FirestoreRepository<FoodEntry>('food'),
  travel: new FirestoreRepository<TravelEntry>('travel'),
  note: new FirestoreRepository<NoteEntry>('note'),
  wishlist: new FirestoreRepository<WishlistEntry>('wishlist'),
  goal: new FirestoreRepository<GoalEntry>('goal'),
};

/**
 * Get the repository for a memory category, typed with the category's
 * entry type. Phase 2 will branch on the user's storage mode here.
 */
export function getRepository<T extends BaseEntry>(
  category: MemoryCategory,
): MemoryRepository<T> {
  // The registry holds per-category concrete repositories; callers supply
  // the correct type parameter. The cast is safe because each category's
  // repository IS the matching typed implementation.
  return repositories[category] as unknown as MemoryRepository<T>;
}
