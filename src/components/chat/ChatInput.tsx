import { useRef, useState, useEffect } from 'react';
import { IconSparkle } from '@/components/ui/icons';

/**
 * Chat text input with auto-resizing, keyboard submit, and loading state.
 */
export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [text]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    // Reset height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter sends (Shift+Enter for newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="glass-strong flex items-end gap-3 rounded-2xl border border-white/10 px-4 py-3 transition-all focus-within:border-accent/40">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Type a message"
        placeholder="Ask about your memories…"
        rows={1}
        disabled={disabled}
        className="max-h-40 min-h-[1.5rem] flex-1 resize-none bg-transparent text-sm text-white/90 placeholder-white/30 outline-none disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || disabled}
        aria-label="Send message"
        className="btn-primary shrink-0 px-4 py-2"
      >
        {disabled ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/40 border-t-ink-950" />
        ) : (
          <IconSparkle width={16} height={16} />
        )}
      </button>
    </div>
  );
}
