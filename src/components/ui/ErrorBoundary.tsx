import { Component, type ErrorInfo, type ReactNode } from 'react';
import { IconSparkle } from './icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches unhandled React render errors and displays a styled fallback
 * instead of a blank white page. Wraps the entire app in App.tsx.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink-950 p-6 text-center"
          role="alert"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mood-love/20">
            <IconSparkle width={28} height={28} className="text-mood-love" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-white/90">
              Something went wrong
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/50">
              EchoOS hit an unexpected error. This is usually temporary — try
              reloading, or clear your local cache in Settings.
            </p>
            {this.state.error && (
              <details className="mx-auto mt-4 max-w-md text-left">
                <summary className="cursor-pointer text-xs text-white/55 hover:text-white/50 transition-colors">
                  Error details
                </summary>
                <pre className="mt-2 overflow-auto rounded-xl bg-white/5 p-3 text-[11px] text-mood-love/80">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={this.handleRetry} className="btn-primary">
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-ghost"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
