import { forwardRef, type HTMLAttributes } from 'react';

/** Frosted glass surface primitive. Composes the `.glass-card` utility. */
export const GlassCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function GlassCard({ className = '', children, ...rest }, ref) {
    return (
      <div ref={ref} className={`glass-card p-5 ${className}`} {...rest}>
        <div className="relative z-10">{children}</div>
      </div>
    );
  },
);
