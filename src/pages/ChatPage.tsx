import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconChat, IconSparkle } from '@/components/ui/icons';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences } from '@/hooks/usePreferences';
import {
  fetchMessages,
  addMessage,
} from '@/services/firestore/chats';
import {
  fetchUserMemories,
  buildContext,
  buildSystemPrompt,
  streamChat,
  type StreamEvent,
  type MemoryBundle,
} from '@/services/groq/client';
import type { ChatMessage as ChatMessageType } from '@/types';

const WELCOME_SUGGESTIONS = [
  'What patterns do you see in my movie taste?',
  'Tell me something about myself I might have missed',
  'What do my ratings say about my preferences?',
  'Compare my habits from last year to this year',
];

const EMPTY_STATE_TAGLINE = 'Ask anything about your movies, meals, trips, notes, and wishlist. EchoOS answers from your own memories — not the internet.';

/**
 * AI Chat page — a streaming conversational interface wired to the
 * user's Firestore memories. The AI answers exclusively from the user's
 * own data, with reasoning, confidence, and suggestion chips shown.
 */
export default function ChatPage() {
  const { user } = useAuth();
  const { aiPersona } = usePreferences();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [lastMeta, setLastMeta] = useState<Partial<StreamEvent> | null>(null);
  const [streamStartedAt, setStreamStartedAt] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const memoriesRef = useRef<MemoryBundle | null>(null);

  // ── Load persisted messages + memories on mount ──────────
  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const [saved] = await Promise.all([
          fetchMessages(user.uid),
          fetchUserMemories(user.uid).then((m) => { memoriesRef.current = m; }),
        ]);
        setMessages(saved);
      } catch {
        // Fail silently — user can start fresh
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  // ── Auto-scroll to bottom ────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // ── Send message ──────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      if (!user || isSending) return;
      setStreamStartedAt(Date.now());

      const userMsg: ChatMessageType = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsSending(true);
      setStreamingText('');
      setLastMeta(null);

      try {
        // 1. Save user message to Firestore
        await addMessage(user.uid, {
          role: 'user',
          content: text,
        });

        // 2. Use cached memories for context
        const bundle = memoriesRef.current ?? (await fetchUserMemories(user.uid));
        if (!memoriesRef.current) memoriesRef.current = bundle;
        const context = buildContext(bundle);
        const systemPrompt = buildSystemPrompt(context, aiPersona);

        // 3. Build message history for the AI
        const history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
          { role: 'system', content: systemPrompt },
        ];
        // Include last few messages for conversation continuity
        for (const msg of messages.slice(-6)) {
          history.push({ role: msg.role, content: msg.content });
        }
        history.push({ role: 'user', content: text });

        // 4. Stream the response
        let fullContent = '';
        let meta: Partial<StreamEvent> = {};

        await streamChat(
          history,
          (delta) => {
            fullContent += delta;
            setStreamingText(fullContent);
          },
          (m) => {
            meta = { ...meta, ...m };
            setLastMeta(meta);
          },
        );

        // 5. Build the assistant message
        // Parse metadata from the last line of the response if not already received
        const assistantMsg: ChatMessageType = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: fullContent,
          createdAt: Date.now(),
          reasoning: meta.reasoning,
          confidence: meta.confidence,
          suggestionChips: meta.suggestionChips ?? [],
          referencedMemoryIds: meta.referencedMemoryIds,
        };

        // 6. Save AI response to Firestore
        await addMessage(user.uid, {
          role: 'assistant',
          content: fullContent,
          reasoning: assistantMsg.reasoning,
          confidence: assistantMsg.confidence,
          suggestionChips: assistantMsg.suggestionChips,
          referencedMemoryIds: assistantMsg.referencedMemoryIds,
        });

        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText('');
      } catch (e) {
        const errorMsg: ChatMessageType = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            e instanceof Error
              ? `I ran into an issue: ${e.message}`
              : 'Something went wrong. Please try again.',
          createdAt: Date.now(),
          confidence: 0,
        };
        setMessages((prev) => [...prev, errorMsg]);
        setStreamingText('');
      } finally {
        setIsSending(false);
      }
    },
    [user, messages, isSending, aiPersona],
  );

  // ── Handle suggestion chip click ─────────────────────────
  const handleSuggestion = useCallback(
    (chip: string) => {
      handleSend(chip);
    },
    [handleSend],
  );

  return (
    <>
      <PageHeader
        title="AI Chat"
        subtitle="Your private AI Memory Operating System — answers come from your life."
      />

      {/* Chat area */}
      <div className="relative flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                <p className="text-xs text-white/55">Loading conversation…</p>
              </div>
            </div>
          ) : messages.length === 0 && !isSending ? (
            /* ── Welcome state ── */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-gradient text-ink-950 shadow-glow">
                <IconChat width={28} height={28} />
              </div>
              <h2 className="font-display text-xl font-semibold">
                Your memory intelligence
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/50">
                {EMPTY_STATE_TAGLINE}
              </p>

              {/* Suggestion chips */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {WELCOME_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white/90"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* ── Message list ── */
            <>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onSuggestionClick={handleSuggestion}
                />
              ))}

              {/* Streaming message in progress */}
              {isSending && streamingText && (
                <ChatMessage
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingText,
                    createdAt: streamStartedAt,
                    reasoning: lastMeta?.reasoning,
                    confidence: lastMeta?.confidence,
                    suggestionChips: lastMeta?.suggestionChips,
                  }}
                  isStreaming
                  onSuggestionClick={handleSuggestion}
                />
              )}

              {/* Thinking indicator before first token */}
              {isSending && !streamingText && (
                <div className="flex items-center gap-3 px-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-gradient/50 text-[10px] font-bold text-ink-950">
                    <IconSparkle width={12} height={12} />
                  </div>
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/30" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/30" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/30" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="sticky bottom-0 pt-2">
          <ChatInput onSend={handleSend} disabled={isSending} />
          <p className="mt-1.5 text-center text-[10px] text-white/25">
            Messages are processed by Groq's third-party API. Avoid sharing sensitive personal information.
          </p>
        </div>
      </div>
    </>
  );
}
