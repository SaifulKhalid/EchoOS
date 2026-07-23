import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSparkle } from '@/components/ui/icons';
import type { ChatMessage as ChatMessageType } from '@/types';

/**
 * Renders a single chat message. User messages on the right, AI responses
 * on the left with an optional collapsible reasoning panel, confidence
 * meter, and clickable suggestion chips.
 */
export function ChatMessage({
  message,
  isStreaming,
  onSuggestionClick,
}: {
  message: ChatMessageType;
  isStreaming?: boolean;
  onSuggestionClick?: (chip: string) => void;
}) {
  const isUser = message.role === 'user';
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] md:max-w-[70%] ${isUser ? 'order-1' : 'order-1'}`}>
        {isUser ? (
          // ── User bubble ──────────────────────────────────
          <div className="rounded-2xl bg-accent-gradient px-4 py-3 text-sm text-ink-950 shadow-glow">
            {message.content}
          </div>
        ) : (
          // ── AI response ──────────────────────────────────
          <div className="space-y-2">
            <GlassCard className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-gradient text-[10px] font-bold text-ink-950">
                  <IconSparkle width={12} height={12} />
                </div>
                <span className="text-xs font-medium text-accent-soft">EchoOS</span>
                {isStreaming && (
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>

              <div className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
                {message.content}
                {isStreaming && <span className="ml-0.5 animate-pulse text-accent">▊</span>}
              </div>
            </GlassCard>

            {/* Reasoning panel */}
            {message.reasoning && (
              <div className="glass rounded-xl border border-accent/15">
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="flex w-full items-center justify-between px-4 py-2 text-xs text-white/50 transition-colors hover:text-white/70"
                >
                  <span>Reasoning</span>
                  <span className={`transition-transform ${showReasoning ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {showReasoning && (
                  <div className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-white/50">
                    {message.reasoning}
                  </div>
                )}
              </div>
            )}

            {/* AI self-assessment indicator */}
            {message.confidence != null && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-white/55">Self-assessment</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(message.confidence * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full transition-all ${
                      message.confidence > 0.8
                        ? 'bg-mood-joy'
                        : message.confidence > 0.5
                          ? 'bg-accent-soft'
                          : 'bg-white/30'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-white/60">
                  {Math.round(message.confidence * 100)}%
                </span>
              </div>
            )}

            {/* Suggestion chips */}
            {message.suggestionChips && message.suggestionChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {message.suggestionChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => onSuggestionClick?.(chip)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/50 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white/80"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
