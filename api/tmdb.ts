/**
 * GET /api/tmdb
 *
 * Serverless proxy that forwards TMDB API requests from the client.
 *  1. Verifies the Firebase ID token from the `Authorization` header.
 *  2. Forwards the request to TMDB with the server-side secret key.
 *  3. Returns the TMDB JSON response.
 *
 * Query params:
 *   path  – TMDB API path (e.g. "search/movie", "movie/123")
 *   ...   – Additional query params forwarded to TMDB
 *
 * Response: TMDB JSON (passthrough)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth } from './_lib/firebase.js';

const TMDB_API = 'https://api.themoviedb.org/3';

// ── Rate limiting ────────────────────────────────────────────
// Module-level map persists across invocations within the same
// serverless instance. NOTE: This is still best-effort across
// concurrent Vercel instances; for production hardening, replace
// with Vercel KV or a Firestore counter.
const TMDB_RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const TMDB_RATE_LIMIT_MAX = 30; // max 30 TMDB requests per minute
const tmdbRateMap = new Map<string, number[]>();

function isTmdbRateLimited(uid: string): boolean {
  const now = Date.now();
  const windowStart = now - TMDB_RATE_LIMIT_WINDOW_MS;
  const timestamps = (tmdbRateMap.get(uid) ?? []).filter((t) => t > windowStart);
  timestamps.push(now);
  tmdbRateMap.set(uid, timestamps);
  return timestamps.length > TMDB_RATE_LIMIT_MAX;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Only GET is accepted.' });
    return;
  }

  // ── Verify Firebase ID token ─────────────────────────────
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
    res.status(500).json({ error: `Search service unavailable: ${message}` });
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

  if (isTmdbRateLimited(uid)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait before making another request.' });
    return;
  }

  // ── Validate the TMDB path ───────────────────────────────
  const tmdbPath = req.query.path as string | undefined;
  if (!tmdbPath) {
    res.status(400).json({ error: 'Missing `path` query parameter (e.g. "search/movie").' });
    return;
  }

  // Basic safety: only allow known TMDB endpoint patterns
  if (!/^[a-z]+\/[a-z0-9_]+$|^movie\/\d+$/.test(tmdbPath)) {
    res.status(400).json({ error: 'Invalid TMDB path.' });
    return;
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'TMDB API key not configured.' });
    return;
  }

  // ── Forward to TMDB ──────────────────────────────────────
  try {
    const url = new URL(`${TMDB_API}/${tmdbPath}`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('language', 'en-US');

    // Forward any additional query params (except `path`)
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'path' && typeof value === 'string') {
        url.searchParams.set(key, value);
      }
    }

    const tmdbRes = await fetch(url.toString());

    if (tmdbRes.status === 429) {
      res.status(429).json({ error: 'TMDB rate limit exceeded. Please try again later.' });
      return;
    }

    if (!tmdbRes.ok) {
      const errorBody = await tmdbRes.text().catch(() => '');
      res.status(tmdbRes.status).json({
        error: `TMDB API error ${tmdbRes.status}`,
        details: errorBody,
      });
      return;
    }

    const data = await tmdbRes.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('TMDB proxy error:', err);
    res.status(500).json({ error: 'Internal server error while contacting TMDB.' });
  }
}
