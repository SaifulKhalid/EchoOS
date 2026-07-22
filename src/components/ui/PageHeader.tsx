import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Consistent page title block used across all routes. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-6 flex items-end justify-between gap-4"
    >
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  );
}
