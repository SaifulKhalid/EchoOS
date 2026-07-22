import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/config/constants';
import {
  IconDashboard,
  IconChat,
  IconTimeline,
  IconMovie,
  IconAnalytics,
} from '@/components/ui/icons';

const ITEMS = [
  { to: ROUTES.dashboard, label: 'Home', Icon: IconDashboard },
  { to: ROUTES.timeline, label: 'Timeline', Icon: IconTimeline },
  { to: ROUTES.chat, label: 'Chat', Icon: IconChat },
  { to: ROUTES.movies, label: 'Library', Icon: IconMovie },
  { to: ROUTES.analytics, label: 'Insights', Icon: IconAnalytics },
];

/** Mobile-only bottom navigation bar. */
export function MobileNav() {
  return (
    <nav className="glass-strong fixed inset-x-0 bottom-0 z-30 flex items-center justify-around rounded-none border-x-0 border-b-0 px-2 py-2 md:hidden">
      {ITEMS.map(({ to, label, Icon }) => (
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
    </nav>
  );
}
