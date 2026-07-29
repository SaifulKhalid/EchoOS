import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconChat, IconSparkle } from '@/components/ui/icons';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ActionCardRow } from '@/components/chat/ActionCard';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences, type AiPersona } from '@/hooks/usePreferences';
import { fetchMessages, addMessage } from '@/services/firestore/chats';
import {
  streamChatWithPipeline,
  streamChat,
  type StreamEvent,
} from '@/services/groq/client';
import {
  TOOL_SCHEMAS,
  executeToolCalls,
} from '@/services/tools';
import type { ChatMessage as ChatMessageType, ActionDescriptor as AD } from '@/types';

// ── Tool instructions (appended to pipeline system prompt) ────
function buildToolInstructions(): string {
  return [
    '',
    '=== AI ACTIONS (CRITICAL) ===',
    'You have access to TOOLS that let you search, add, update, and delete memories.',
    'When the user describes an experience (watched a movie, visited a place, ate at a',
    'restaurant, had a thought, wants to remember something), USE THE TOOLS to log it.',
    '',
    'Examples of when to use tools:',
    '- "I watched Parineeta yesterday" → searchMovie("Parineeta") then addMovie(tmdbId, watchDate="yesterday")',
    '- "I visited Bandarban last week" → logTravel(destination="Bandarban", startDate=...)',
    '- "I had pizza at Joe\'s" → logFood(restaurant="Joe\'s", cuisine="Italian")',
    '- "Remind me to watch Interstellar" → updateWishlist(title="Interstellar", category="movie")',
    '- "What was that movie about space?" → searchMemory(query="space movie")',
    '',
    'Always searchMovie FIRST before addMovie to get the correct tmdbId.',
    'If the user asks about their memories, use searchMemory to find relevant entries.',
  ].join('\n');
}

// ── Strip the machine-readable metadata block from displayed/saved text ──
function stripMetaBlock(text: string): string {
  return text.replace(/<!--ECHOOS_META\{[\s\S]*?\}-->/, '').trimEnd();
}

const WELCOME_SUGGESTIONS = [
  'What patterns do you see in my movie taste?',
  'Tell me something about myself I might have missed',
  'What do my ratings say about my preferences?',
  'Compare my habits from last year to this year',
];

const EMPTY_STATE_TAGLINE =
  'Ask anything about your movies, meals, trips, notes, and wishlist. ' +
  "EchoOS answers from your own memories — and can add them for you. Try " +
  '"I watched Parineeta yesterday" or "I visited Bandarban last week."';

/**
 * AI Chat page — a streaming agentic interface wired to the user's
 * Firestore memories. The AI can ANSWER from memory AND ACT by calling
 * tools (searchMovie, addMovie, logTravel, …). Tool results appear as
 * action cards inline, followed by the natural-language reply.
 */
export default function ChatPage() {
  const { user } = useAuth();
  const { aiPersona } = usePreferences();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [lastMeta, setLastMeta] = useState<Partial<StreamEvent> | null>(null);
  const [streamStartedAt, setStreamStartedAt] = useState(0);
  /** Live action cards rendered while tools execute (before final reply). */
  const [liveActions, setLiveActions] = useState<AD[]>([]);
  /** True while tools are executing between the two Groq calls. */
  const [isExecutingTools, setIsExecutingTools] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // ── Load persisted messages on mount ───────────────────────
  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const saved = await fetchMessages(user.uid);
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
  }, [messages, streamingText, liveActions, isAnalyzing]);

  // ── Build the tool execution context ──────────────────────
  const invalidateForTools = useCallback(
    (keys: readonly (readonly string[])[]) => {
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    [queryClient],
  );

  // ── Agentic send ──────────────────────────────────────────
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
      setLiveActions([]);
      setIsExecutingTools(false);
      setIsAnalyzing(false);

      try {
        // 1. Save user message to Firestore
        await addMessage(user.uid, {
          role: 'user',
          content: text,
        });

        // 2. Build history from previous messages (last ~6 turns)
        const history = messages.slice(-6).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        // 3. First pass: Memory Pipeline + streaming with tools
        setIsAnalyzing(true);
        let firstMeta: Partial<StreamEvent> = {};

        const firstPass = await streamChatWithPipeline({
          text,
          uid: user.uid,
          persona: aiPersona as AiPersona,
          history,
          tools: TOOL_SCHEMAS,
          onDelta: (delta) => {
            setStreamingText((prev) => prev + delta);
          },
          onToolDelta: () => {
            // Model is thinking about tools — no visual change needed yet
          },
          onMetadata: (meta) => {
            firstMeta = { ...firstMeta, ...meta };
            setLastMeta(firstMeta);
          },
          onPipelineResult: () => {
            setIsAnalyzing(false);
          },
        });

        setIsAnalyzing(false);

        // 4. If no tool calls, the first pass is the final answer
        if (firstPass.toolCalls.length === 0) {
          const cleanText = stripMetaBlock(firstPass.responseText);
          const assistantMsg: ChatMessageType = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: cleanText,
            createdAt: Date.now(),
            reasoning: firstMeta.reasoning,
            confidence: firstPass.pipelineResult.confidence.overall ?? firstMeta.confidence,
            suggestionChips: firstMeta.suggestionChips ?? [],
            referencedMemoryIds: firstMeta.referencedMemoryIds,
          };

          await addMessage(user.uid, {
            role: 'assistant',
            content: cleanText,
            reasoning: assistantMsg.reasoning,
            confidence: assistantMsg.confidence,
            suggestionChips: assistantMsg.suggestionChips,
          });

          setMessages((prev) => [...prev, assistantMsg]);
          setStreamingText('');
          return;
        }

        // 5. Execute tools client-side
        setIsExecutingTools(true);
        setStreamingText('');

        const batch = await executeToolCalls(firstPass.toolCalls, {
          uid: user.uid,
          invalidateQueries: invalidateForTools,
        });

        setLiveActions(batch.actions);
        setIsExecutingTools(false);

        // 6. Build follow-up messages with tool results
        const toolSummary = batch.actions
          .map((a) => `${a.verb} ${a.title}`)
          .join('. ');

        const systemContent = firstPass.pipelineResult.systemPrompt + buildToolInstructions();
        const baseHistory = [
          { role: 'system' as const, content: systemContent },
          ...history,
          { role: 'user' as const, content: text },
        ];

        const followUpMessages = [
          ...baseHistory,
          {
            role: 'assistant' as const,
            content: firstPass.responseText || `[Calling tools: ${firstPass.toolCalls.map((t) => t.name).join(', ')}]`,
            tool_calls: firstPass.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          },
          ...batch.toolMessages.map((tm) => ({
            role: 'tool' as const,
            content: tm.content,
            tool_call_id: tm.tool_call_id,
            name: tm.name,
          })),
          {
            role: 'user' as const,
            content:
              `The actions have been performed successfully: ${toolSummary}. ` +
              'Now write a warm, personal reply confirming what was done. ' +
              'Reference the specific details. End with 2-3 natural follow-up suggestions prefixed with "→".',
          },
        ];

        // 7. Stream the final reply (no tools)
        let finalText = '';
        let finalMeta: Partial<StreamEvent> = {};

        await streamChat(
          followUpMessages,
          (delta) => {
            finalText += delta;
            setStreamingText(finalText);
          },
          (meta) => {
            finalMeta = { ...finalMeta, ...meta };
            setLastMeta(finalMeta);
          },
        );

        // 8. Build and save the complete assistant message
        const cleanFinalText = stripMetaBlock(finalText);
        const assistantMsg: ChatMessageType = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: cleanFinalText,
          createdAt: Date.now(),
          actions: batch.actions,
          reasoning: finalMeta.reasoning,
          confidence: firstPass.pipelineResult.confidence.overall ?? finalMeta.confidence,
          suggestionChips: finalMeta.suggestionChips ?? [],
          referencedMemoryIds: finalMeta.referencedMemoryIds,
        };

        await addMessage(user.uid, {
          role: 'assistant',
          content: cleanFinalText,
          actions: batch.actions,
          reasoning: assistantMsg.reasoning,
          confidence: assistantMsg.confidence,
          suggestionChips: assistantMsg.suggestionChips,
        });

        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText('');
        setLiveActions([]);
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
        setLiveActions([]);
      } finally {
        setIsSending(false);
        setIsExecutingTools(false);
        setIsAnalyzing(false);
      }
    },
    [user, messages, isSending, aiPersona, invalidateForTools],
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
        subtitle="Your private AI Memory Operating System — answers come from your life, and acts on it."
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

              {/* Live action cards (shown while tools execute + before final reply streams) */}
              {liveActions.length > 0 && (
                <div className="max-w-[80%] md:max-w-[70%]">
                  <ActionCardRow actions={liveActions} />
                </div>
              )}

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

              {/* Tool execution indicator */}
              {isExecutingTools && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass flex items-center gap-2 rounded-xl border border-white/10 p-3"
                >
                  <div className="flex h-5 w-5 animate-spin items-center justify-center rounded-md bg-accent-gradient/50 text-[9px] font-bold text-ink-950">
                    <IconSparkle width={10} height={10} />
                  </div>
                  <span className="text-xs text-white/60">Performing actions…</span>
                </motion.div>
              )}

              {/* Thinking indicator before first token */}
              {isSending && !streamingText && !isExecutingTools && (
                <div className="flex items-center gap-3 px-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-gradient/50 text-[10px] font-bold text-ink-950">
                    <IconSparkle width={12} height={12} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-white/50">
                      {isAnalyzing ? 'Analyzing your memories…' : 'Thinking…'}
                    </span>
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-white/30" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-white/30" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-white/30" style={{ animationDelay: '300ms' }} />
                    </div>
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
            EchoOS can act on your memories — try "I watched [movie]" or "I visited [place]".
          </p>
        </div>
      </div>
    </>
  );
}
