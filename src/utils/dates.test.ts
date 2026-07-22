import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  dateToMillis,
  inputValueToMillis,
  formatDateLong,
  formatDateShort,
  formatDateRange,
  dateToInputValue,
  todayInputValue,
  formatDistanceToNow,
  dateSortKey,
} from './dates';

// ── dateToMillis ────────────────────────────────────────────

describe('dateToMillis', () => {
  it('returns null for null input', () => {
    expect(dateToMillis(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(dateToMillis(undefined)).toBeNull();
  });

  it('passes through a valid epoch-ms number', () => {
    expect(dateToMillis(1700000000000)).toBe(1700000000000);
  });

  it('returns null for Infinity', () => {
    expect(dateToMillis(Infinity)).toBeNull();
  });

  it('returns null for NaN', () => {
    expect(dateToMillis(NaN)).toBeNull();
  });

  it('extracts milliseconds from a Timestamp-like object', () => {
    const ts = { toMillis: () => 1699000000000 };
    expect(dateToMillis(ts as Parameters<typeof dateToMillis>[0])).toBe(1699000000000);
  });

  it('returns null for an object without toMillis', () => {
    expect(dateToMillis({} as Parameters<typeof dateToMillis>[0])).toBeNull();
  });

  it('handles zero', () => {
    expect(dateToMillis(0)).toBe(0);
  });
});

// ── inputValueToMillis ─────────────────────────────────────

describe('inputValueToMillis', () => {
  it('converts a YYYY-MM-DD string to epoch ms', () => {
    const ms = inputValueToMillis('2024-08-12');
    expect(ms).toBeGreaterThan(0);
    // Should parse to Aug 12, 2024 UTC
    const d = new Date(ms!);
    expect(d.getUTCMonth()).toBe(7); // 0-indexed
    expect(d.getUTCDate()).toBe(12);
    expect(d.getUTCFullYear()).toBe(2024);
  });

  it('returns undefined for empty string', () => {
    expect(inputValueToMillis('')).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(inputValueToMillis(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(inputValueToMillis(undefined)).toBeUndefined();
  });

  it('returns undefined for invalid date string', () => {
    expect(inputValueToMillis('not-a-date')).toBeUndefined();
  });
});

// ── formatDateLong ─────────────────────────────────────────

describe('formatDateLong', () => {
  it('formats a valid epoch-ms date', () => {
    // Aug 12, 2024
    const ms = new Date(2024, 7, 12).getTime();
    expect(formatDateLong(ms)).toBe('Aug 12, 2024');
  });

  it('returns empty string for null', () => {
    expect(formatDateLong(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDateLong(undefined)).toBe('');
  });
});

// ── formatDateShort ─────────────────────────────────────────

describe('formatDateShort', () => {
  it('formats a valid epoch-ms date without year', () => {
    const ms = new Date(2024, 7, 12).getTime();
    expect(formatDateShort(ms)).toBe('Aug 12');
  });

  it('returns undefined for null', () => {
    expect(formatDateShort(null)).toBeUndefined();
  });
});

// ── formatDateRange ─────────────────────────────────────────

describe('formatDateRange', () => {
  it('returns a combined range when both dates differ', () => {
    const start = new Date(2024, 7, 12).getTime();
    const end = new Date(2024, 7, 18).getTime();
    expect(formatDateRange(start, end)).toBe('Aug 12 – Aug 18');
  });

  it('returns single date when start === end', () => {
    const start = new Date(2024, 7, 12).getTime();
    expect(formatDateRange(start, start)).toBe('Aug 12');
  });

  it('returns start string when end is missing', () => {
    const start = new Date(2024, 7, 12).getTime();
    expect(formatDateRange(start, null)).toBe('Aug 12');
  });

  it('returns end string when start is missing', () => {
    const end = new Date(2024, 7, 18).getTime();
    expect(formatDateRange(null, end)).toBe('Aug 18');
  });

  it('returns empty string when both are missing', () => {
    expect(formatDateRange(null, null)).toBe('');
  });
});

// ── dateToInputValue ───────────────────────────────────────

describe('dateToInputValue', () => {
  it('converts epoch ms to YYYY-MM-DD', () => {
    // Use UTC to avoid local-timezone offset issues
    const ms = Date.UTC(2024, 7, 12);
    expect(dateToInputValue(ms)).toBe('2024-08-12');
  });

  it('returns empty string for null', () => {
    expect(dateToInputValue(null)).toBe('');
  });
});

// ── todayInputValue ────────────────────────────────────────

describe('todayInputValue', () => {
  it('returns today in YYYY-MM-DD format', () => {
    const today = new Date();
    const expected = today.toISOString().split('T')[0];
    expect(todayInputValue()).toBe(expected);
  });
});

// ── formatDistanceToNow ────────────────────────────────────

describe('formatDistanceToNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 7, 15, 12, 0, 0)); // Aug 15, 2024 12:00:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for < 10 seconds ago', () => {
    const ms = Date.now() - 5000;
    expect(formatDistanceToNow(ms)).toBe('just now');
  });

  it('returns seconds ago for < 60 seconds', () => {
    const ms = Date.now() - 30000;
    expect(formatDistanceToNow(ms)).toBe('30s ago');
  });

  it('returns minutes ago for < 60 minutes', () => {
    const ms = Date.now() - 5 * 60 * 1000;
    expect(formatDistanceToNow(ms)).toBe('5m ago');
  });

  it('returns hours ago for < 24 hours', () => {
    const ms = Date.now() - 3 * 60 * 60 * 1000;
    expect(formatDistanceToNow(ms)).toBe('3h ago');
  });

  it('returns days ago for < 30 days', () => {
    const ms = Date.now() - 10 * 24 * 60 * 60 * 1000;
    expect(formatDistanceToNow(ms)).toBe('10d ago');
  });

  it('returns months ago for < 12 months', () => {
    const ms = Date.now() - 2 * 30 * 24 * 60 * 60 * 1000;
    expect(formatDistanceToNow(ms)).toBe('2mo ago');
  });

  it('returns years ago for >= 12 months', () => {
    const ms = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;
    expect(formatDistanceToNow(ms)).toBe('3y ago');
  });

  it('returns empty string for null', () => {
    expect(formatDistanceToNow(null)).toBe('');
  });
});

// ── dateSortKey ─────────────────────────────────────────────

describe('dateSortKey', () => {
  it('returns epoch ms for a valid date', () => {
    expect(dateSortKey(1700000000000)).toBe(1700000000000);
  });

  it('returns 0 for null', () => {
    expect(dateSortKey(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(dateSortKey(undefined)).toBe(0);
  });
});
