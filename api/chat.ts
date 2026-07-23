/**
 * POST /api/chat
 *
 * Serverless proxy that:
 *  1. Verifies the Firebase ID token from the `Authorization` header.
 *  2. Checks per-uid rate limit (sliding window).
 *  3. Forwards messages to Groq's streaming chat-completions API.
 *  4. Streams tokens back as server-sent events (SSE).
 *  5. Sends inline metadata (reasoning, suggestion chips) parsed from
 *     the main response — no costly second LLM call.
 *
 * Request body (JSON):
 *   messages  – Array of { role, content } objects.
 *   model     – Groq model name (default: llama-3.3-70b-versatile).
 *   stream    – Must be `true` (the client always requests streaming).
 *
 * Response (SSE):
 *   data: {"content":"token text"}
 *   data: {"content":"more text"}
 *   ...
 *   data: {"reasoning":"...","confidence":0.5,"suggestionChips":["...","..."],"referencedMemoryIds":[]}
 *   data: [DONE]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth } from './_lib/firebase.js';

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

// ── Types ───────────────────────────────────────────────────

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqChunk {
  choices?: { delta: { content?: string }; finish_reason?: string | null }[];
}

interface MetadataPayload {
  reasoning: string;
  confidence: number;
  suggestionChips: string[];
  referencedMemoryIds: string[];
}

// ── Rate limiting ───────────────────────────────────────────
// Simple in-memory sliding window per uid.
// NOTE: In-memory only works for single-instance deployments.
// For multi-region Vercel, swap this for Vercel KV or Firestore counter.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateMap = new Map<string, number[]>();

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateMap.get(uid) ?? []).filter((t) => t > windowStart);
  timestamps.push(now);
  rateMap.set(uid, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

// ── Allowed origins for CORS ───────────────────────────────
function getAllowedOrigins(): string[] {
  return [
    'https://echo-os-two.vercel.app',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    'http://localhost:5173',
  ].filter(Boolean);
}

// ── Handler ─────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ──────────────────────────────────────────────────
  const origin = req.headers.origin ?? '';
  if (getAllowedOrigins().includes(origin)) {
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

  // ── Auth ──────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    return;
  }

  let adminAuth: ReturnType<typeof getAdminAuth>;
  try {
    adminAuth = getAdminAuth();
  } catch (initErr) {
    const message = initErr instanceof Error ? initErr.message : String(initErr);
    console.error('Firebase Admin init failed:', message);
    res.status(500).json({ error: `Chat service unavailable: ${message}` });
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

  // ── Rate limit ────────────────────────────────────────────
  if (isRateLimited(uid)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait before sending another message.' });
    return;
  }

  // ── Parse body ────────────────────────────────────────────
  const { messages, model } = req.body as { messages?: Message[]; model?: string };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: '`messages` array is required and must be non-empty.' });
    return;
  }

  // ── SSE headers ───────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const selectedModel = model ?? DEFAULT_MODEL;

  try {
    // ── Stream the answer from Groq ──────────────────────────
    const groqRes = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!groqRes.ok) {
      writeSSE(res, { error: `Groq API error ${groqRes.status}` });
      writeSSEDone(res);
      return;
    }

    const reader = groqRes.body?.getReader();
    if (!reader) {
      writeSSE(res, { error: 'Groq returned an empty body.' });
      writeSSEDone(res);
      return;
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const payload = trimmed.slice(6);
        if (payload === '[DONE]') break;

        try {
          const chunk = JSON.parse(payload) as GroqChunk;
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            writeSSE(res, { content: delta });
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // ── Send inline metadata (no second LLM call) ────────────
    const meta = parseInlineMetadata(fullContent);
    writeSSE(res, meta);
    writeSSEDone(res);
  } catch (err) {
    console.error('Chat error:', err);
    writeSSE(res, { error: 'Internal server error.' });
    writeSSEDone(res);
  }
}

// ── SSE helpers ─────────────────────────────────────────────

function writeSSE(res: VercelResponse, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function writeSSEDone(res: VercelResponse) {
  res.write('data: [DONE]\n\n');
  res.end();
}

// ── Inline metadata parser ──────────────────────────────────

/**
 * Parse reasoning and suggestion chips from the main response inline.
 * The system prompt instructs the model to include a structured block
 * like: <!--ECHOOS_META{"reasoning":"...","suggestionChips":["..."]}-->
 *
 * If no structured block is found, falls back to heuristics.
 * No second LLM call needed — saves cost, latency, and privacy exposure.
 */
function parseInlineMetadata(content: string): MetadataPayload {
  // Try structured JSON block first
  const metaMatch = content.match(/<!--ECHOOS_META(\{[\s\S]*?\})-->/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]) as Partial<MetadataPayload>;
      return {
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
        confidence: 0.5, // Neutral — not calibrated, just a default
        suggestionChips: Array.isArray(parsed.suggestionChips)
          ? parsed.suggestionChips.slice(0, 5)
          : [],
        referencedMemoryIds: [],
      };
    } catch {
      // Malformed JSON, fall through
    }
  }

  // Fallback: parse from --- delimiter format
  const fallbackMatch = content.match(/---\s*\nReasoning:\s*(.+?)(\n|$)/s);
  const reasoning = fallbackMatch ? fallbackMatch[1].trim() : '';

  // Generate contextual suggestion chips from content topic keywords
  const words = content.toLowerCase().split(/\s+/);
  const suggestions: string[] = [];

  if (words.some((w) => ['movie', 'film', 'watch', 'genre'].includes(w))) {
    suggestions.push('What patterns do you see in my movie taste?');
  }
  if (words.some((w) => ['restaurant', 'food', 'meal', 'cuisine'].includes(w))) {
    suggestions.push('What do my food ratings reveal?');
  }
  if (words.some((w) => ['travel', 'trip', 'visit', 'destination'].includes(w))) {
    suggestions.push('Tell me something about my travel habits');
  }
  if (words.some((w) => ['note', 'journal', 'thought'].includes(w))) {
    suggestions.push('What themes do my notes share?');
  }
  if (words.some((w) => ['wishlist', 'want', 'bucket'].includes(w))) {
    suggestions.push("What does my wishlist say about me?");
  }

  if (suggestions.length === 0) {
    suggestions.push('What patterns do you notice in my memories?', 'Compare my habits across categories');
  }

  return {
    reasoning,
    confidence: 0.5,
    suggestionChips: suggestions.slice(0, 4),
    referencedMemoryIds: [],
  };
}
