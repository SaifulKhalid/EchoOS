import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToastStore } from './toastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addToast', () => {
    it('adds a toast with an auto-generated id', () => {
      const id = useToastStore.getState().addToast({
        message: 'Hello',
        variant: 'info',
      });

      expect(id).toMatch(/^toast-[a-f0-9]+$/);
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0]).toMatchObject({
        id,
        message: 'Hello',
        variant: 'info',
      });
    });

    it('uses default duration of 4000ms', () => {
      useToastStore.getState().addToast({
        message: 'Auto-dismiss',
        variant: 'success',
      });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      // Before 4000ms, toast should still exist
      vi.advanceTimersByTime(3999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      // At 4000ms, toast should be removed
      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('respects custom duration', () => {
      useToastStore.getState().addToast({
        message: 'Custom duration',
        variant: 'warning',
        duration: 2000,
      });

      vi.advanceTimersByTime(1999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('does not auto-dismiss when duration is 0', () => {
      useToastStore.getState().addToast({
        message: 'Persistent',
        variant: 'info',
        duration: 0,
      });

      vi.advanceTimersByTime(100000);
      expect(useToastStore.getState().toasts).toHaveLength(1);
    });

    it('supports an action button', () => {
      const onAction = vi.fn();
      useToastStore.getState().addToast({
        message: 'With action',
        variant: 'success',
        action: { label: 'Undo', onClick: onAction },
      });

      const toast = useToastStore.getState().toasts[0];
      expect(toast.action).toEqual({ label: 'Undo', onClick: onAction });
    });

    it('generates unique ids for multiple toasts', () => {
      const id1 = useToastStore.getState().addToast({ message: 'One', variant: 'info' });
      const id2 = useToastStore.getState().addToast({ message: 'Two', variant: 'info' });

      expect(id1).not.toBe(id2);
      expect(useToastStore.getState().toasts).toHaveLength(2);
    });
  });

  describe('removeToast', () => {
    it('removes a toast by id', () => {
      const id = useToastStore.getState().addToast({ message: 'Remove me', variant: 'info' });
      expect(useToastStore.getState().toasts).toHaveLength(1);

      useToastStore.getState().removeToast(id);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('does nothing when id does not exist', () => {
      useToastStore.getState().addToast({ message: 'Keep me', variant: 'info' });
      useToastStore.getState().removeToast('nonexistent');

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });

    it('only removes the targeted toast', () => {
      const id1 = useToastStore.getState().addToast({ message: 'First', variant: 'info' });
      useToastStore.getState().addToast({ message: 'Second', variant: 'info' });

      useToastStore.getState().removeToast(id1);
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0].message).toBe('Second');
    });
  });

  describe('convenience methods', () => {
    it('success() adds a success toast', () => {
      const id = useToastStore.getState().success('Operation completed!');

      const toast = useToastStore.getState().toasts[0];
      expect(toast.id).toBe(id);
      expect(toast.message).toBe('Operation completed!');
      expect(toast.variant).toBe('success');
    });

    it('success() accepts an optional action', () => {
      const onAction = vi.fn();
      useToastStore.getState().success('Deleted!', { label: 'Undo', onClick: onAction });

      const toast = useToastStore.getState().toasts[0];
      expect(toast.action).toEqual({ label: 'Undo', onClick: onAction });
    });

    it('error() adds an error toast with 6000ms duration', () => {
      const id = useToastStore.getState().error('Something went wrong');

      const toast = useToastStore.getState().toasts[0];
      expect(toast.id).toBe(id);
      expect(toast.message).toBe('Something went wrong');
      expect(toast.variant).toBe('error');
      expect(toast.duration).toBe(6000);

      vi.advanceTimersByTime(5999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('info() adds an info toast that auto-dismisses with default duration', () => {
      useToastStore.getState().info('Heads up!');

      const toast = useToastStore.getState().toasts[0];
      expect(toast.variant).toBe('info');
      // duration is not stored in the toast object but used internally for setTimeout
      // Verify auto-dismiss works
      vi.advanceTimersByTime(4000);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('warning() adds a warning toast with 5000ms duration', () => {
      useToastStore.getState().warning('Careful now');

      const toast = useToastStore.getState().toasts[0];
      expect(toast.variant).toBe('warning');
      expect(toast.duration).toBe(5000);

      vi.advanceTimersByTime(4999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('store state', () => {
    it('starts with an empty toasts array', () => {
      expect(useToastStore.getState().toasts).toEqual([]);
    });

    it('can hold multiple toasts simultaneously', () => {
      useToastStore.getState().success('First');
      useToastStore.getState().info('Second');
      useToastStore.getState().warning('Third');

      expect(useToastStore.getState().toasts).toHaveLength(3);
    });
  });
});
