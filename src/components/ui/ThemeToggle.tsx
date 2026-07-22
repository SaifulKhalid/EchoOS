import { motion } from 'framer-motion';
import type { ThemeMode } from '@/hooks/usePreferences';

/**
 * Theme toggle button — switches between dark and light mode with a
 * smooth icon rotation animation.
 */
export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: ThemeMode;
  onChange: (t: ThemeMode) => void;
}) {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => onChange(isDark ? 'light' : 'dark')}
      className="relative flex h-9 w-16 items-center rounded-full border border-white/10 bg-white/5 p-1 transition-colors hover:border-white/20"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Track labels */}
      <span className={`absolute left-2 text-xs transition-opacity ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        🌙
      </span>
      <span className={`absolute right-2 text-xs transition-opacity ${isDark ? 'opacity-0' : 'opacity-100'}`}>
        ☀️
      </span>

      {/* Sliding knob */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-accent-gradient text-xs shadow-glow ${
          isDark ? 'ml-0' : 'ml-7'
        }`}
      />
    </button>
  );
}
