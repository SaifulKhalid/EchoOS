import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useReminderChecker } from '@/hooks/useReminders';

/**
 * Authenticated app shell: fixed sidebar (desktop), top bar, scrollable
 * content area, and a mobile bottom nav. Child routes render into <Outlet/>.
 */
export function AppLayout() {
  useReminderChecker();
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 md:px-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <Suspense fallback={<LoadingScreen label="Loading view" />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
