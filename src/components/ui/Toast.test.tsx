import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer } from './Toast';
import { useToastStore } from '@/services/toastStore';

describe('ToastContainer', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    useToastStore.setState({ toasts: [] });
  });

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a single toast from the store', () => {
    useToastStore.getState().success('Operation completed!');
    render(<ToastContainer />);

    expect(screen.getByText('Operation completed!')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    useToastStore.getState().success('First toast');
    useToastStore.getState().info('Second toast');
    render(<ToastContainer />);

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('renders an action button when provided', () => {
    const onAction = vi.fn();
    useToastStore.getState().success('Deleted!', { label: 'Undo', onClick: onAction });
    render(<ToastContainer />);

    const undoButton = screen.getByText('Undo');
    expect(undoButton).toBeInTheDocument();

    fireEvent.click(undoButton);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('dismiss button removes the toast', () => {
    useToastStore.getState().info('Dismiss me');
    render(<ToastContainer />);

    expect(screen.getByText('Dismiss me')).toBeInTheDocument();
    expect(useToastStore.getState().toasts).toHaveLength(1);

    const dismissButton = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissButton);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('clicking action button also dismisses the toast', () => {
    const onAction = vi.fn();
    useToastStore.getState().success('With action', { label: 'Go', onClick: onAction });
    render(<ToastContainer />);

    fireEvent.click(screen.getByText('Go'));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('auto-dismisses after the toast duration', () => {
    useToastStore.getState().info('Auto dismiss');
    render(<ToastContainer />);

    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    // Advance timers past the default 4000ms duration
    vi.advanceTimersByTime(4000);

    // Store should be empty after auto-dismiss
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  describe('variant styles', () => {
    it('renders success toasts', () => {
      useToastStore.getState().success('Great!');
      render(<ToastContainer />);
      expect(screen.getByText('Great!')).toBeInTheDocument();
    });

    it('renders error toasts', () => {
      useToastStore.getState().error('Oh no!');
      render(<ToastContainer />);
      expect(screen.getByText('Oh no!')).toBeInTheDocument();
    });

    it('renders info toasts', () => {
      useToastStore.getState().info('Just so you know');
      render(<ToastContainer />);
      expect(screen.getByText('Just so you know')).toBeInTheDocument();
    });

    it('renders warning toasts', () => {
      useToastStore.getState().warning('Careful!');
      render(<ToastContainer />);
      expect(screen.getByText('Careful!')).toBeInTheDocument();
    });
  });
});
