/**
 * POST /api/chat
 *
 * Serverless proxy that:
 *  1. Verifies the Firebase ID token from the `Authorization` header.
 *  2. Forwards messages to Groq's streaming chat-completions API.
 *  3. Streams tokens back as server-sent events (SSE).
 *  4. After the stream finishes, asks Groq for a structured analysis
 *     (reasoning, confidence, suggestion chips) and sends it as a
 *     final metadata event.
 *
 * Request body (JSON):
 *   messages  – Array of { role, content } objects.
 *   model     – Groq model name (default: llama-3.3-70b-versatile).
 *   stream    – Must be `true` (the client always requests streaming).
 *
 * Response (SSE):
 *   event: delta\n  data: {"content":"token text"}
 *   event: delta\n  data: {"content":"more text"}
 *   ...
 *   event: metadata\n
 *     data: {"reasoning":"...","confidence":0.92,"suggestionChips":["...","..."],"referencedMemoryIds":[]}
 *   event: done\n  data: [DONE]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { auth } from './_lib/firebase.js';

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const ANALYSIS_MODEL = 'llama-3.1-8b-instant';

// ── Types ───────────────────────────────────────────────────

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  model?: string;
  stream?: boolean;
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

// ── Handler ─────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS headers (needed for local `vercel dev`) ──────────
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  try {
    await auth.verifyIdToken(authHeader.slice(7));
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
    return;
  }

  // ── Parse request body ────────────────────────────────────
  const { messages, model } = req.body as ChatRequest;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: '`messages` array is required and must be non-empty.' });
    return;
  }

  // ── Set SSE headers ───────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  const selectedModel = model ?? DEFAULT_MODEL;

  try {
    // ── Step 1: Stream the main answer from Groq ──────────────
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
      const _errorBody = await groqRes.text().catch(() => '');
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

    // Read the streaming response and forward each token
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // Keep incomplete line for next chunk

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const payload = trimmed.slice(6);

        // Groq signals the stream end with "data: [DONE]"
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

    // ── Step 2: Extract metadata via a fast follow-up call ────
    try {
      const meta = await extractMetadata(messages, fullContent);
      writeSSE(res, meta);
    } catch {
      // Metadata extraction is best-effort; the UI still shows the answer
    }

    writeSSEDone(res);
  } catch (err) {
    console.error('Chat error:', err);
    writeSSE(res, { error: 'Internal server error.' });
    writeSSEDone(res);
  }
}

// ── Helpers ─────────────────────────────────────────────────

/** Write a JSON object as an SSE `data:` event. */
function writeSSE(res: VercelResponse, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/** Write the terminal `[DONE]` event and end the response. */
function writeSSEDone(res: VercelResponse) {
  res.write('data: [DONE]\n\n');
  res.end();
}

/**
 * After streaming the main answer, send the full conversation plus the
 * AI's own response to a fast Groq model and ask it to produce a
 * structured analysis (reasoning, confidence, suggestion chips).
 */
async function extractMetadata(
  messages: Message[],
  assistantContent: string,
): Promise<MetadataPayload> {
  const analysisMessages: Message[] = [
    {
      role: 'system',
      content: [
        'You are an AI analyst. Given a conversation between a user and an AI assistant,',
        'output a JSON object (only JSON, no other text) with these fields:',
        '  - `reasoning`: a 1–2 sentence explanation of how the AI arrived at its answer.',
        '  - `confidence`: a number 0–1 indicating how certain the AI should be.',
        '  - `suggestionChips`: an array of 3–4 short, natural follow-up questions the user might ask next.',
        '  - `referencedMemoryIds`: an empty array (reserved for future use).',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        'Here is the conversation:',
        ...messages.slice(1).map((m) => `${m.role}: ${m.content}`),
        `assistant: ${assistantContent}`,
        '',
        'Output only JSON with the fields described above, nothing else.',
      ].join('\n'),
    },
  ];

  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      messages: analysisMessages,
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    throw new Error(`Analysis API error ${res.status}`);
  }

  const body = await res.json();
  const raw = body?.choices?.[0]?.message?.content ?? '';

  // Parse JSON from the response (handle potential markdown fences or extra text)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in analysis response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<MetadataPayload>;

  return {
    reasoning: parsed.reasoning ?? '',
    confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.85,
    suggestionChips: Array.isArray(parsed.suggestionChips) ? parsed.suggestionChips.slice(0, 5) : [],
    referencedMemoryIds: Array.isArray(parsed.referencedMemoryIds) ? parsed.referencedMemoryIds : [],
  };
}
