import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/firebase/auth';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { IconLogout, IconSparkle } from '@/components/ui/icons';

export function Topbar() {
  const { user } = useAuth();
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
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-gradient text-sm font-semibold text-ink-950 shadow-glow transition-transform active:scale-95"
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
            <div role="menu" className="glass-strong absolute right-0 z-20 mt-2 w-56 rounded-2xl p-2 animate-fade-in">
              <div className="border-b border-white/10 px-3 py-2">
                <p className="truncate text-sm font-medium text-white/90">
                  {user?.displayName ?? 'Guest session'}
                </p>
                <p className="truncate text-xs text-white/50">
                  {user?.email ?? (user?.isAnonymous ? 'Anonymous mode' : '')}
                </p>
              </div>
              <button
                role="menuitem"
                onClick={() => {
                  const isAnon = user?.isAnonymous;
                  if (isAnon && !window.confirm('You are signed in as a guest. Signing out will permanently lose all your data unless you link a Google account first. Continue?')) return;
                  signOut();
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                <IconLogout width={17} height={17} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
