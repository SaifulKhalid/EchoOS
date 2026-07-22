import { Link } from 'react-router-dom';
import { ROUTES } from '@/config/constants';
import { Logo } from '@/components/layout/Logo';

export default function NotFoundPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
      role="alert"
    >
      <Logo />
      <div>
        <p className="font-display text-6xl font-semibold text-gradient">404</p>
        <p className="mt-2 text-white/50">This memory doesn't exist — yet.</p>
      </div>
      <Link to={ROUTES.dashboard} className="btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
