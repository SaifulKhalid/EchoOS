import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastContainer } from './Toast';
import { useToastStore } from '@/services/toastStore';

// Mock framer-motion to render children directly (avoids async animation state updates)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => {
      const { initial, animate, exit, transition, layout, ...validProps } = props as Record<string, unknown>;
      return <div {...validProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ToastContainer', () => {
  beforeEach(() => {
    act(() => {
      useToastStore.setState({ toasts: [] });
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => {
      useToastStore.setState({ toasts: [] });
    });
  });

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a single toast from the store', () => {
    act(() => {
      useToastStore.getState().success('Operation completed!');
    });
    render(<ToastContainer />);

    expect(screen.getByText('Operation completed!')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    act(() => {
      useToastStore.getState().success('First toast');
      useToastStore.getState().info('Second toast');
    });
    render(<ToastContainer />);

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('renders an action button when provided', () => {
    const onAction = vi.fn();
    act(() => {
      useToastStore.getState().success('Deleted!', { label: 'Undo', onClick: onAction });
    });
    render(<ToastContainer />);

    const undoButton = screen.getByText('Undo');
    expect(undoButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(undoButton);
    });
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('dismiss button removes the toast', () => {
    act(() => {
      useToastStore.getState().info('Dismiss me');
    });
    render(<ToastContainer />);

    expect(screen.getByText('Dismiss me')).toBeInTheDocument();
    expect(useToastStore.getState().toasts).toHaveLength(1);

    const dismissButton = screen.getByLabelText('Dismiss');
    act(() => {
      fireEvent.click(dismissButton);
    });

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('clicking action button also dismisses the toast', () => {
    const onAction = vi.fn();
    act(() => {
      useToastStore.getState().success('With action', { label: 'Go', onClick: onAction });
    });
    render(<ToastContainer />);

    act(() => {
      fireEvent.click(screen.getByText('Go'));
    });
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('auto-dismisses after the toast duration', () => {
    act(() => {
      useToastStore.getState().info('Auto dismiss');
    });
    render(<ToastContainer />);

    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    // Advance timers past the default 4000ms duration
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Store should be empty after auto-dismiss
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  describe('variant styles', () => {
    it('renders success toasts', () => {
      act(() => {
        useToastStore.getState().success('Great!');
      });
      render(<ToastContainer />);
      expect(screen.getByText('Great!')).toBeInTheDocument();
    });

    it('renders error toasts', () => {
      act(() => {
        useToastStore.getState().error('Oh no!');
      });
      render(<ToastContainer />);
      expect(screen.getByText('Oh no!')).toBeInTheDocument();
    });

    it('renders info toasts', () => {
      act(() => {
        useToastStore.getState().info('Just so you know');
      });
      render(<ToastContainer />);
      expect(screen.getByText('Just so you know')).toBeInTheDocument();
    });

    it('renders warning toasts', () => {
      act(() => {
        useToastStore.getState().warning('Careful!');
      });
      render(<ToastContainer />);
      expect(screen.getByText('Careful!')).toBeInTheDocument();
    });
  });
});
