import { Component, type ReactNode, type ErrorInfo } from 'react';
import { GlassCard } from './GlassCard';
import { IconAlertTriangle } from './icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled React Error in EchoOS:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6 bg-ink-950">
          <GlassCard className="max-w-md w-full flex flex-col items-center gap-4 p-8 text-center border-red-500/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
              <IconAlertTriangle width={32} height={32} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
              <p className="mt-1 text-xs text-white/60">
                {this.state.error?.message || 'An unexpected application error occurred.'}
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={this.handleReset}
                className="btn-primary text-xs px-4 py-2"
              >
                Reload Application
              </button>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
