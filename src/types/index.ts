import type { Timestamp } from 'firebase/firestore';
import type { MemoryCategory, MoodId } from '@/config/constants';
import type { ActionDescriptor } from '@/services/tools/types';

export type { MemoryCategory, MoodId };
export type { ActionDescriptor };

/**
 * Core domain types for EchoOS.
 * Every persisted entry carries an `embedding?: number[]` field that is
 * RESERVED for a future semantic-search upgrade (Phase 1 decision: lean
 * tag/keyword retrieval now, semantic later with no schema migration).
 */

/** Firestore stores dates as Timestamps; app code often uses epoch millis. */
export type FireDate = Timestamp | number;

export interface BaseEntry {
  id: string;
  createdAt: FireDate;
  updatedAt: FireDate;
  mood?: MoodId;
  /** RESERVED — populated when semantic search ships. */
  embedding?: number[];
  /** Lowercased keyword tags used for lean retrieval + filtering. */
  tags?: string[];
}

// ── Movies ──────────────────────────────────────────────────
export interface MovieEntry extends BaseEntry {
  tmdbId: number;
  title: string;
  poster?: string;
  backdrop?: string;
  genres: string[];
  year?: number;
  language?: string;
  cast?: string[];
  director?: string;
  runtime?: number;
  overview?: string;
  rating?: number; // user rating 0–10
  watchDate?: FireDate;
  review?: string;
  favorite?: boolean;
  rewatch?: boolean;
  aiNotes?: string;
}

// ── Food ────────────────────────────────────────────────────
export interface FoodEntry extends BaseEntry {
  restaurant: string;
  location?: { name: string; lat?: number; lng?: number };
  cuisine?: string;
  price?: number;
  rating?: number;
  photos?: string[];
  favoriteDishes?: string[];
  companions?: string[];
  date?: FireDate;
  notes?: string;
  favorite?: boolean;
}

// ── Travel ──────────────────────────────────────────────────
export interface TravelEntry extends BaseEntry {
  destination: string;
  budget?: number;
  durationDays?: number;
  startDate?: FireDate;
  endDate?: FireDate;
  photos?: string[];
  notes?: string;
  places?: string[];
  companions?: string[];
  favoriteMoments?: string[];
  rating?: number; // user rating 0–10
  status?: 'planned' | 'completed' | 'cancelled';
  favorite?: boolean;
}

// ── Notes ───────────────────────────────────────────────────
export interface NoteEntry extends BaseEntry {
  text: string;
  type: 'idea' | 'journal' | 'thought';
  title?: string;
  date?: FireDate;
}

// ── Wishlist ────────────────────────────────────────────────
export interface WishlistEntry extends BaseEntry {
  category: 'movie' | 'place' | 'food' | 'book' | 'product';
  title: string;
  note?: string;
  done?: boolean;
}

// ── Goals ───────────────────────────────────────────────────
export interface GoalCheckIn {
  date: FireDate;
  notes?: string;
  completed: boolean;
}

export interface GoalEntry extends BaseEntry {
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  targetCount?: number;
  checkIns?: GoalCheckIn[];
  streak: number;
  completionRate: number; // 0-100%
  status: 'active' | 'completed' | 'paused' | 'archived';
  category?: MemoryCategory;
}

// ── Unified timeline index (denormalized for cheap 1-query reads) ──
export interface MemoryIndexEntry {
  id: string;
  type: MemoryCategory;
  refId: string; // id in the source collection
  title: string;
  date: FireDate;
  mood?: MoodId;
  thumb?: string;
}

// ── AI taste profile (Layer 2 — the "digital twin") ──────────
export interface AIProfile {
  topGenres: { name: string; weight: number }[];
  favoriteActors: string[];
  favoriteDirectors: string[];
  preferredLanguages: string[];
  avgMovieRating?: number;
  avgFoodRating?: number;
  moodPatterns: Partial<Record<MoodId, number>>;
  seasonalTastes?: Record<string, string[]>;
  priceComfort?: { min: number; max: number; avg: number };
  travelCadence?: string;
  cuisineAffinity?: { name: string; weight: number }[];
  entryCounts: Partial<Record<MemoryCategory, number>>;
  updatedAt: FireDate;
}

// ── Chat ────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: FireDate;
  referencedMemoryIds?: string[];
  confidence?: number; // 0–1
  suggestionChips?: string[];
  reasoning?: string;
  /** AI Actions performed for this message (addMovie, logTravel, …). */
  actions?: ActionDescriptor[];
}

// ── Notifications ──────────────────────────────────────────────
/** Types of in-app notifications. */
export type NotificationType = 'reminder' | 'milestone' | 'system';

export interface NotificationEntry {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: FireDate;
  /** Optional link to an entry that triggered this notification. */
  linkedEntryId?: string;
  linkedCategory?: MemoryCategory;
  /** If this notification was triggered by a reminder. */
  reminderId?: string;
}

// ── Reminders ──────────────────────────────────────────────────
export type ReminderInterval = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ReminderEntry {
  id: string;
  title: string;
  message: string;
  /** Epoch millis for the next/only trigger time. */
  dueDate: FireDate;
  interval: ReminderInterval;
  enabled: boolean;
  createdAt: FireDate;
  lastTriggered?: FireDate;
  /** Category hint for context (optional). */
  category?: MemoryCategory;
}

/** User profile document stored at users/{uid}. */
export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  createdAt: FireDate;
  lastVisit?: FireDate;
  previousVisit?: FireDate;
  settings?: {
    theme?: 'dark' | 'light';
    aiPersona?: string;
    notificationsEnabled?: boolean;
  };
}
