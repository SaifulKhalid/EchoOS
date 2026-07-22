import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '@/config/constants';
import { Logo } from './Logo';
import {
  IconDashboard,
  IconChat,
  IconTimeline,
  IconSearch,
  IconMovie,
  IconFood,
  IconTravel,
  IconNote,
  IconWishlist,
  IconAnalytics,
  IconSettings,
} from '@/components/ui/icons';

interface NavItem {
  to: string;
  label: string;
  Icon: (p: { width?: number; height?: number }) => JSX.Element;
}

const PRIMARY: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Dashboard', Icon: IconDashboard },
  { to: ROUTES.chat, label: 'AI Chat', Icon: IconChat },
  { to: ROUTES.timeline, label: 'Timeline', Icon: IconTimeline },
];

const LIBRARY: NavItem[] = [
  { to: ROUTES.movies, label: 'Movies', Icon: IconMovie },
  { to: ROUTES.food, label: 'Food', Icon: IconFood },
  { to: ROUTES.travel, label: 'Travel', Icon: IconTravel },
  { to: ROUTES.notes, label: 'Notes', Icon: IconNote },
  { to: ROUTES.wishlist, label: 'Wishlist', Icon: IconWishlist },
];

const INSIGHTS: NavItem[] = [
  { to: ROUTES.search, label: 'Search', Icon: IconSearch },
  { to: ROUTES.analytics, label: 'Analytics', Icon: IconAnalytics },
  { to: ROUTES.settings, label: 'Settings', Icon: IconSettings },
];

function NavGroup({ title, items }: { title?: string; items: NavItem[] }) {
  return (
    <div className="space-y-1">
      {title && (
        <p className="px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wider text-white/35">
          {title}
        </p>
      )}
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === ROUTES.dashboard}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? 'text-white'
                : 'text-white/55 hover:bg-white/5 hover:text-white/90'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl border border-white/10 bg-white/10"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <Icon width={19} height={19} />
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="glass-strong hidden w-64 shrink-0 flex-col rounded-none border-y-0 border-l-0 p-4 md:flex">
      <div className="px-2 py-3">
        <Logo />
      </div>
      <nav className="mt-2 flex-1 overflow-y-auto">
        <NavGroup items={PRIMARY} />
        <NavGroup title="Library" items={LIBRARY} />
        <NavGroup title="Insights" items={INSIGHTS} />
      </nav>
    </aside>
  );
}
