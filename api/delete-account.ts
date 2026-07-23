/**
 * POST /api/delete-account
 *
 * Permanently deletes a user's account and all their data.
 *  1. Verifies the Firebase ID token.
 *  2. Recursively deletes all subcollections under users/{uid}.
 *  3. Deletes the user profile document.
 *  4. Deletes the Firebase Auth user.
 *
 * Requires the caller's Firebase ID token in the Authorization header.
 * This is a destructive action and should only be called after user confirmation.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth } from './_lib/firebase.js';
import { getFirestore } from 'firebase-admin/firestore';

// ── Rate limiting ───────────────────────────────────────────
// Simple in-memory sliding window per uid.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 2; // max 2 delete requests per minute
const rateMap = new Map<string, number[]>();

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateMap.get(uid) ?? []).filter((t) => t > windowStart);
  timestamps.push(now);
  rateMap.set(uid, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

// ── All known subcollections under users/{uid} ──────────────
const SUBCOLLECTIONS = [
  'movies',
  'food',
  'travel',
  'notes',
  'wishlist',
  'notifications',
  'reminders',
  'chats',
  'timeline',
] as const;

/**
 * Recursively delete all documents in a collection (including nested
 * subcollections) to avoid orphaned data.
 */
async function deleteCollection(uid: string, collectionName: string): Promise<number> {
  const db = getFirestore();
  const collectionRef = db.collection('users', uid, collectionName);
  let count = 0;

  try {
    const snapshot = await collectionRef.get();

    for (const doc of snapshot.docs) {
      // Delete any nested subcollections first (e.g. chats/{sessionId}/messages)
      const nestedCollections = await doc.ref.listCollections();
      for (const nestedCol of nestedCollections) {
        const nestedSnapshot = await nestedCol.get();
        const batch = db.batch();
        nestedSnapshot.docs.forEach((nestedDoc) => batch.delete(nestedDoc.ref));
        await batch.commit();
        count += nestedSnapshot.size;
      }

      // Delete the document itself
      await doc.ref.delete();
      count++;
    }
  } catch (err) {
    console.error(`Error deleting collection ${collectionName}:`, err);
    throw err;
  }

  return count;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS headers ─────────────────────────────────────────
  const allowedOrigins = [
    'https://echo-os-two.vercel.app',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    'http://localhost:5173',
  ].filter(Boolean);

  const origin = req.headers.origin ?? '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Only POST is accepted.' });
    return;
  }

  // ── Verify Firebase ID token ──────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    return;
  }

  let adminAuth;
  try {
    adminAuth = getAdminAuth();
  } catch (initErr) {
    const message = initErr instanceof Error ? initErr.message : String(initErr);
    console.error('Firebase Admin init failed:', message);
    res.status(500).json({ error: `Account deletion unavailable: ${message}` });
    return;
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
    return;
  }

  // ── Rate limiting ─────────────────────────────────────────
  if (isRateLimited(uid)) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  // ── Delete all user data ──────────────────────────────────
  try {
    const db = getFirestore();
    let totalDeleted = 0;

    // Delete all known subcollections
    for (const col of SUBCOLLECTIONS) {
      const count = await deleteCollection(uid, col);
      totalDeleted += count;
    }

    // Delete the user profile document
    await db.collection('users').doc(uid).delete();
    totalDeleted++;

    // Delete the Firebase Auth user
    try {
      await adminAuth.deleteUser(uid);
    } catch (authErr) {
      // If the auth user is already gone, that's fine — the data is deleted
      console.warn('Auth deletion warning (user may already be deleted):', authErr);
    }

    console.log(`Account deleted for uid=${uid}: ${totalDeleted} documents removed.`);
    res.status(200).json({ success: true, deleted: totalDeleted });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({
      error: 'Failed to delete account. Some data may remain. Please contact support.',
    });
  }
}
