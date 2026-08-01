import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { signOut } from '@/firebase/auth';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { IconLogout, IconSparkle } from '@/components/ui/icons';

export function Topbar() {
  const { user } = useAuth();
  const { triggerDemoMode, isSeeding } = useDemoMode();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onEscape(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open]);

  const name = user?.displayName?.split(' ')[0] ?? (user?.isAnonymous ? 'Guest' : 'there');
  const initial = (user?.displayName ?? 'G').charAt(0).toUpperCase();

  return (
    <header className="glass sticky top-0 z-20 flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-3 md:px-6">
      <div className="flex items-center gap-2 text-sm text-white/60">
        <IconSparkle width={16} height={16} />
        <span className="hidden sm:inline">
          Welcome back, <span className="text-white/90">{name}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-indigo-600 text-xs font-semibold text-white shadow-sm transition-transform active:scale-95"
          aria-label="Account menu"
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initial
          )}
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-white/10 bg-[#161924] p-1.5 shadow-glass-lg animate-fade-in">
              <div className="border-b border-white/10 px-3 py-2">
                <p className="truncate text-xs font-medium text-gray-200">
                  {user?.displayName ?? 'Guest session'}
                </p>
                <p className="truncate text-[11px] text-gray-400">
                  {user?.email ?? (user?.isAnonymous ? 'Anonymous mode' : '')}
                </p>
              </div>

              <button
                role="menuitem"
                onClick={async () => {
                  setOpen(false);
                  await triggerDemoMode();
                }}
                disabled={isSeeding}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-indigo-400 transition-colors hover:bg-white/[0.05]"
              >
                <IconSparkle width={15} height={15} />
                {isSeeding ? 'Seeding Demo...' : 'Load Demo Sample Data'}
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  const isAnon = user?.isAnonymous;
                  if (isAnon && !window.confirm('You are signed in as a guest. Signing out will permanently lose all your data unless you link a Google account first. Continue?')) return;
                  signOut();
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <IconLogout width={16} height={16} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
