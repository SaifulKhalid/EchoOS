import { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle, signInAsGuest, handleRedirectResult } from '@/firebase/auth';
import { Logo } from '@/components/layout/Logo';
import { IconGoogle, IconSparkle } from '@/components/ui/icons';
import { APP_TAGLINE, ROUTES } from '@/config/constants';

const HIGHLIGHTS = [
  'Remembers every film, meal, trip & thought',
  'Learns your taste — not the internet’s',
  'Answers from your life, with its reasoning shown',
];

export function LoginPage() {
  const { user, loading, configured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<null | 'google' | 'guest'>(null);
  const [error, setError] = useState<string | null>(null);

  // Process the redirect result after Google sign-in redirects back
  useEffect(() => {
    handleRedirectResult().catch((err) => {
      console.warn('Redirect sign-in result error:', err);
    });
  }, []);

  const rawFrom = (location.state as { from?: Location })?.from?.pathname;
  const targetPath = rawFrom && rawFrom !== ROUTES.login ? rawFrom : ROUTES.dashboard;

  if (!loading && user) return <Navigate to={targetPath} replace />;

  async function run(kind: 'google' | 'guest') {
    setError(null);
    setBusy(kind);
    try {
      if (kind === 'google') {
        await signInWithGoogle();
      } else {
        const u = await signInAsGuest();
        if (u) {
          navigate(targetPath, { replace: true });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Floating ambient orbs for depth. */}
      <motion.div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
        animate={{ y: [0, 30, 0] }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-accent-cyan/15 blur-3xl"
        animate={{ y: [0, -24, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-strong relative z-10 w-full max-w-md rounded-3xl p-8"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">
            Your memories.
            <br />
            Your taste. <span className="text-gradient">Your AI.</span>
          </h1>
          <p className="mt-3 text-sm text-white/50">{APP_TAGLINE}</p>
        </div>

        <ul className="mb-8 space-y-2.5">
          {HIGHLIGHTS.map((h) => (
            <li key={h} className="flex items-start gap-2.5 text-sm text-white/70">
              <span className="mt-0.5 text-accent-soft">
                <IconSparkle width={16} height={16} />
              </span>
              {h}
            </li>
          ))}
        </ul>

        {!configured && (
          <div
            className="mb-4 rounded-xl border border-mood-joy/30 bg-mood-joy/10 px-4 py-3 text-xs text-mood-joy"
            role="alert"
          >
            Firebase isn't configured yet. Copy <code>.env.example</code> to{' '}
            <code>.env.local</code> and add your project keys to enable sign-in.
          </div>
        )}

        {error && (
          <div
            className="mb-4 rounded-xl border border-mood-love/30 bg-mood-love/10 px-4 py-3 text-xs text-mood-love"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => run('google')}
            disabled={!!busy || !configured}
            className="btn-primary w-full"
          >
            <IconGoogle />
            {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
          </button>
          <button
            onClick={() => run('guest')}
            disabled={!!busy || !configured}
            className="btn-ghost w-full"
          >
            {busy === 'guest' ? 'Starting…' : 'Try in Guest mode'}
          </button>
          <button
            onClick={async () => {
              await run('guest');
            }}
            disabled={!!busy || !configured}
            className="w-full rounded-xl border border-accent/30 bg-accent/10 py-2.5 text-xs font-semibold text-accent-soft transition-colors hover:bg-accent/20"
          >
            🚀 Explore Competition Demo Mode
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-white/55">
          Demo Mode preloads realistic sample memories for instant AI evaluation.
        </p>
      </motion.div>
    </div>
  );
}
