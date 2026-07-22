import { auth, db } from '@/firebase/config';
import { API_BASE_URL } from '@/config/env';
import { GROQ_MODELS } from '@/config/constants';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import type { MovieEntry, FoodEntry, TravelEntry, NoteEntry, WishlistEntry } from '@/types';
import type { AiPersona } from '@/hooks/usePreferences';

/**
 * Groq chat client. Calls the Vercel proxy at `/api/chat` which injects
 * the secret Groq API key server-side and proxies streaming SSE events.
 *
 * Memory context (all of the user's entries) is fetched client-side and
 * bundled into the system prompt so the AI can answer from their life.
 */

export interface ChatRequest {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  stream?: boolean;
}

export interface StreamEvent {
  /** The delta text chunk from the model. */
  content?: string;
  /** Final metadata sent after streaming completes. */
  reasoning?: string;
  confidence?: number;
  referencedMemoryIds?: string[];
  suggestionChips?: string[];
}

// ── Memory context builder ──────────────────────────────────

export interface MemoryBundle {
  movies: MovieEntry[];
  food: FoodEntry[];
  travel: TravelEntry[];
  notes: NoteEntry[];
  wishlist: WishlistEntry[];
}

/** Fetch all user memories across every category. */
export async function fetchUserMemories(
  uid: string,
): Promise<MemoryBundle> {
  async function fetchAll<T>(col: string): Promise<T[]> {
    const q = query(collection(db, 'users', uid, col), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
  }

  const [movies, food, travel, notes, wishlist] = await Promise.all([
    fetchAll<MovieEntry>('movies'),
    fetchAll<FoodEntry>('food'),
    fetchAll<TravelEntry>('travel'),
    fetchAll<NoteEntry>('notes'),
    fetchAll<WishlistEntry>('wishlist'),
  ]);

  return { movies, food, travel, notes, wishlist };
}

/** Format all memories into a compact plain-text system-prompt segment. */
export function buildContext(memories: MemoryBundle): string {
  const parts: string[] = [];

  if (memories.movies.length > 0) {
    parts.push('## Movies Watched');
    for (const m of memories.movies) {
      const line = [
        m.title,
        m.year ? `(${m.year})` : '',
        m.genres?.length ? `[${m.genres.join(', ')}]` : '',
        m.rating ? `Rating: ${m.rating}/10` : '',
        m.review ? `"${m.review.slice(0, 80)}"` : '',
      ]
        .filter(Boolean)
        .join(' ');
      parts.push(`  - ${line}`);
    }
  }

  if (memories.food.length > 0) {
    parts.push('## Food Log');
    for (const f of memories.food) {
      const line = [
        f.restaurant,
        f.cuisine ? `(${f.cuisine})` : '',
        f.rating ? `Rating: ${f.rating}/10` : '',
        f.favoriteDishes?.length ? `Faves: ${f.favoriteDishes.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      parts.push(`  - ${line}`);
    }
  }

  if (memories.travel.length > 0) {
    parts.push('## Travel');
    for (const t of memories.travel) {
      const line = [
        t.destination,
        t.durationDays ? `${t.durationDays}d` : '',
        t.rating ? `Rating: ${t.rating}/10` : '',
        t.companions?.length ? `with ${t.companions.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      parts.push(`  - ${line}`);
    }
  }

  if (memories.notes.length > 0) {
    parts.push('## Notes');
    for (const n of memories.notes) {
      const preview = n.text.length > 120 ? n.text.slice(0, 120) + '…' : n.text;
      const line = n.title ? `[${n.type}] ${n.title}: ${preview}` : `[${n.type}] ${preview}`;
      parts.push(`  - ${line}`);
    }
  }

  if (memories.wishlist.length > 0) {
    parts.push('## Wishlist');
    for (const w of memories.wishlist) {
      parts.push(`  - [${w.category}] ${w.title}${w.done ? ' ✓' : ''}`);
    }
  }

  return parts.join('\n');
}

const PERSONA_INSTRUCTIONS: Record<AiPersona, string> = {
  default: 'Be warm, insightful, and conversational — like a close friend who remembers everything.',
  witty: 'Be quick with humor and clever observations. A light, playful tone that keeps things fun.',
  analytical: 'Be data-driven, precise, and structured. Focus on patterns, statistics, and clear reasoning.',
  enthusiastic: 'Be energetic and excited about their memories. Use exclamation points and express genuine delight.',
  minimalist: 'Be short, direct, and efficient. Give the answer with minimal fluff or extra words.',
};

/** Build the full system prompt that makes EchoOS an expert on the user's life. */
export function buildSystemPrompt(context: string, persona: AiPersona = 'default'): string {
  return [
    'You are EchoOS, a personal AI assistant that helps the user explore their memories and taste.',
    'You answer questions based ONLY on the user\'s memories listed below. DO NOT make up facts.',
    'If the user asks about something not in their memories, say you don\'t have that information yet.',
    '',
    'When referencing a specific memory, mention its category and year/date if available.',
    PERSONA_INSTRUCTIONS[persona],
    '',
    'After your main answer, include a line like:',
    '---',
    'Reasoning: <brief explanation of how you arrived at this answer>',
    'Confidence: <0-100%>',
    '---',
    '',
    'Here are the user\'s memories:',
    '',
    context,
    '',
    'Remember: only answer from the data above. Be honest if you don\'t know.',
  ].join('\n');
}

// ── Streaming chat client ───────────────────────────────────

/**
 * Send a streaming chat request to the proxy. Calls `onDelta` for each
 * text token and `onMetadata` when the final metadata payload arrives.
 * Returns the complete response text when done.
 */
export async function streamChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  onDelta: (text: string) => void,
  onMetadata?: (meta: Partial<StreamEvent>) => void,
  model: string = GROQ_MODELS.reasoning,
  _persona?: AiPersona, // reserved for future server-side use
): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in to chat.');

  const base = API_BASE_URL || window.location.origin;
  const url = new URL(`${base}/api/chat`);
  url.searchParams.set('stream', '1');

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      model,
      stream: true,
    } satisfies ChatRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Chat error ${res.status}: ${text || res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // Keep incomplete line for next chunk

      for (const line of lines) {
        if (line.startsWith('event: ')) continue; // Event type line
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();

        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data) as StreamEvent;

          if (parsed.content) {
            fullText += parsed.content;
            onDelta(parsed.content);
          }

          if (parsed.reasoning || parsed.confidence != null || parsed.suggestionChips) {
            onMetadata?.({
              reasoning: parsed.reasoning,
              confidence: parsed.confidence,
              referencedMemoryIds: parsed.referencedMemoryIds,
              suggestionChips: parsed.suggestionChips,
            });
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Parse inline metadata from the final text as fallback
  const metaMatch = fullText.match(/---\s*\nReasoning:\s*(.+?)\nConfidence:\s*(\d+)%/s);
  if (metaMatch && !onMetadata) {
    // metadata already sent via SSE; this is a fallback
  }

  return fullText;
}
