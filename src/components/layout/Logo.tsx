/** EchoOS wordmark — a minimalist, refined product mark. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="relative flex h-7 w-7 items-center justify-center">
        <span className="absolute h-7 w-7 rounded-lg border border-white/10 bg-white/[0.04]" />
        <span className="h-2 w-2 rounded-full bg-indigo-500" />
      </span>
      {!compact && (
        <span className="font-display text-base font-semibold tracking-tight text-white">
          Echo<span className="text-indigo-400 font-medium">OS</span>
        </span>
      )}
    </div>
  );
}
