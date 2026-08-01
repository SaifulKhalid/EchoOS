import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ROUTES } from '@/config/constants';
import {
  IconDashboard,
  IconChat,
  IconTimeline,
  IconMovie,
  IconAnalytics,
  IconFood,
  IconTravel,
  IconNote,
  IconWishlist,
  IconGoal,
  IconSearch,
  IconSettings,
} from '@/components/ui/icons';

const PRIMARY = [
  { to: ROUTES.dashboard, label: 'Home', Icon: IconDashboard },
  { to: ROUTES.timeline, label: 'Timeline', Icon: IconTimeline },
  { to: ROUTES.chat, label: 'Chat', Icon: IconChat },
  { to: ROUTES.movies, label: 'Library', Icon: IconMovie },
  { to: ROUTES.analytics, label: 'Insights', Icon: IconAnalytics },
];

const MORE_ITEMS = [
  { to: ROUTES.food, label: 'Food', Icon: IconFood },
  { to: ROUTES.travel, label: 'Travel', Icon: IconTravel },
  { to: ROUTES.notes, label: 'Notes', Icon: IconNote },
  { to: ROUTES.wishlist, label: 'Wishlist', Icon: IconWishlist },
  { to: ROUTES.goals, label: 'Goals', Icon: IconGoal },
  { to: ROUTES.search, label: 'Search', Icon: IconSearch },
  { to: ROUTES.settings, label: 'Settings', Icon: IconSettings },
];

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [moreOpen]);

  return (
    <>
      <nav className="glass-strong fixed inset-x-0 bottom-0 z-30 flex items-center justify-around rounded-none border-x-0 border-b-0 px-2 py-2 md:hidden" aria-label="Mobile navigation">
        {PRIMARY.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === ROUTES.dashboard}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] transition-colors ${
                isActive ? 'text-accent-soft' : 'text-white/50'
              }`
            }
          >
            <Icon width={20} height={20} />
            {label}
          </NavLink>
        ))}

        <button
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] text-white/50 transition-colors"
          aria-label="More navigation"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
          More
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm md:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              role="dialog"
              aria-modal="true"
              aria-label="More navigation links"
              className="glass-strong fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-x-0 border-b-0 p-5 pb-10 md:hidden"
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/70">More</h3>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {MORE_ITEMS.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1.5 rounded-xl p-3 text-[11px] transition-colors ${
                        isActive
                          ? 'bg-accent/10 text-accent-soft'
                          : 'text-white/55 hover:bg-white/5 hover:text-white/90'
                      }`
                    }
                  >
                    <Icon width={22} height={22} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
