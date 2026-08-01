import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ToastContainer } from '@/components/ui/Toast';
import { useReminderChecker } from '@/hooks/useReminders';
import { useSessionTracking } from '@/hooks/useSessionTracking';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Authenticated app shell: fixed sidebar (desktop), top bar, scrollable
 * content area, and a mobile bottom nav. Child routes render into <Outlet/>.
 */
export function AppLayout() {
  useReminderChecker();
  useSessionTracking();
  const isOnline = useNetworkStatus();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-1 text-center text-xs font-semibold text-amber-200"
        >
          ⚡ You are currently offline. Local changes will sync when connection is restored.
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
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
        <ToastContainer />
      </div>
    </div>
  );
}
