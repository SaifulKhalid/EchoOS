/**
 * Shared date-formatting utilities.
 *
 * EchoOS stores dates as either Firestore `Timestamp` objects (when read
 * from the server) or Unix-epoch milliseconds (when created locally). All
 * of these helpers accept both forms via the `FireDate` type alias.
 *
 * Previously each card, form modal, and page duplicated this conversion
 * logic inline — this module is the single canonical place for it.
 */

import type { FireDate } from '@/types';

// ── Low-level conversion ────────────────────────────────────

/**
 * Extract epoch milliseconds from a Firestore `Timestamp` or a raw
 * number. Returns `null` for missing, null, or invalid values.
 */
export function dateToMillis(date: FireDate | undefined | null): number | null {
  if (date == null) return null;
  try {
    if (typeof date === 'object' && 'toMillis' in date) {
      return (date as { toMillis: () => number }).toMillis();
    }
    if (typeof date === 'number' && Number.isFinite(date)) {
      return date;
    }
  } catch {
    // Ignore — return null below
  }
  return null;
}

/**
 * Inverse of `dateToInputValue`: convert an HTML date-input string
 * ("YYYY-MM-DD") back to epoch milliseconds, or `undefined` if empty.
 */
export function inputValueToMillis(
  value: string | undefined | null,
): number | undefined {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

// ── Display formatting ─────────────────────────────────────

/** Format a FireDate as "Aug 12, 2024". Returns empty string if missing. */
export function formatDateLong(date: FireDate | undefined | null): string {
  const ms = dateToMillis(date);
  if (ms == null) return '';
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format a FireDate as "Aug 12". Returns `undefined` if missing. */
export function formatDateShort(
  date: FireDate | undefined | null,
): string | undefined {
  const ms = dateToMillis(date);
  if (ms == null) return undefined;
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date range: "Aug 12 – Aug 18".
 * Returns empty string if both dates are missing.
 */
export function formatDateRange(
  start: FireDate | undefined | null,
  end: FireDate | undefined | null,
): string {
  const startStr = formatDateShort(start);
  const endStr = formatDateShort(end);
  if (!startStr && !endStr) return '';
  if (startStr && endStr && startStr !== endStr) return `${startStr} – ${endStr}`;
  return startStr || endStr || '';
}

// ── Input-field helpers ─────────────────────────────────────

/**
 * Convert a FireDate to a `YYYY-MM-DD` string suitable for an HTML
 * `<input type="date">`. Returns empty string if the date is missing.
 */
export function dateToInputValue(date: FireDate | undefined | null): string {
  const ms = dateToMillis(date);
  if (ms == null) return '';
  return new Date(ms).toISOString().split('T')[0];
}

/** Return today's date as a `YYYY-MM-DD` string for date inputs. */
export function todayInputValue(): string {
  const ms = Date.now();
  return new Date(ms).toISOString().split('T')[0];
}

/**
 * Format a FireDate as a human-friendly relative string
 * ("just now", "5 min ago", "2 hours ago", "3 days ago").
 */
export function formatDistanceToNow(
  date: FireDate | undefined | null,
): string {
  const ms = dateToMillis(date);
  if (ms == null) return '';
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ── Sort-comparison helper ──────────────────────────────────

/**
 * Return a numeric sort key for a FireDate (epoch millis, or 0 as
 * fallback). Use inside array `.sort()` when ordering by a date field.
 */
export function dateSortKey(date: FireDate | undefined | null): number {
  return dateToMillis(date) ?? 0;
}
