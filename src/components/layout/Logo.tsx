/** EchoOS wordmark — a stylized echo glyph + gradient text. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="relative flex h-8 w-8 items-center justify-center">
        {/* Concentric "echo" rings. */}
        <span className="absolute h-8 w-8 rounded-full border border-accent/40" />
        <span className="absolute h-5 w-5 rounded-full border border-accent-cyan/60" />
        <span className="h-2 w-2 rounded-full bg-accent-gradient shadow-glow" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-semibold tracking-tight">
          Echo<span className="text-gradient">OS</span>
        </span>
      )}
    </div>
  );
}
