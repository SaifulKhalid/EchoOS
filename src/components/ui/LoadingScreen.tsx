import { motion } from 'framer-motion';

/** Full-screen branded loading state used during auth/route resolution. */
export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="flex h-full min-h-screen w-full flex-col items-center justify-center gap-6"
      role="status"
      aria-live="polite"
    >
      <motion.div
        className="relative h-16 w-16"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 rounded-full border-t-2 border-accent" />
      </motion.div>
      <p className="animate-pulse text-sm tracking-wide text-white/50">{label}…</p>
    </div>
  );
}
