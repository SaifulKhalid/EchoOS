import type { ReactNode } from 'react';
import { GlassCard } from './GlassCard';

/** Placeholder shown on routes whose full features arrive in later phases. */
export function EmptyState({
  icon,
  title,
  description,
  phase,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <GlassCard className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-accent-soft">
          {icon}
        </div>
      )}
      <div className="max-w-sm space-y-1.5">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="text-sm text-white/50">{description}</p>
      </div>
      {phase && (
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/40">
          {phase}
        </span>
      )}
    </GlassCard>
  );
}
