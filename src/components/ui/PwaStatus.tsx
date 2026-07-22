import { useEffect, useState } from 'react';
import { IconSparkle } from '@/components/ui/icons';

/**
 * PWA install/status indicator. Shows an "Install" button when the
 * `beforeinstallprompt` event fires, and a "Running as app" badge
 * when the site is displayed in standalone mode.
 */
export function PwaStatus() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);
  const [standalone] = useState(
    // Lazy initializer — avoids setState in effect
    () => window.matchMedia('(display-mode: standalone)').matches,
  );

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
    }

    function handleInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    (deferredPrompt as Event & { prompt: () => Promise<void> }).prompt();
    const result = await (deferredPrompt as Event & { userChoice: Promise<{ outcome: string }> }).userChoice;
    if (result.outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }

  if (standalone) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-mood-calm/20 bg-mood-calm/10 px-3 py-1 text-xs text-mood-calm">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        Running as app
      </span>
    );
  }

  if (deferredPrompt && !installed) {
    return (
      <button onClick={handleInstall} className="btn-primary text-xs px-3 py-1.5">
        <IconSparkle width={14} height={14} />
        Install App
      </button>
    );
  }

  if (installed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-mood-joy/20 bg-mood-joy/10 px-3 py-1 text-xs text-mood-joy">
        ✓ Installed
      </span>
    );
  }

  return null;
}
