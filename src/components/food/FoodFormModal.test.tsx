import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FoodFormModal } from './FoodFormModal';

// ── Mocks ───────────────────────────────────────────────────

const mockMutateAsync = vi.fn();

vi.mock('@/hooks/useFood', () => ({
  useAddFood: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateFood: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeleteFood: () => ({ isPending: false, mutateAsync: (...args: unknown[]) => mockMutateAsync(...args) }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' } }),
}));

vi.mock('@/services/toastStore', () => ({
  useToastStore: {
    getState: () => ({
      success: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock framer-motion to render children directly
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => {
      // Filter out framer-motion specific props to avoid React warnings
      const { initial, animate, exit, transition, layout, ...validProps } = props as Record<string, unknown>;
      return <div {...validProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock window.confirm
const originalConfirm = window.confirm;

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn();
});

afterEach(() => {
  window.confirm = originalConfirm;
});

// ── Sample entry ────────────────────────────────────────────

const sampleEntry = {
  id: 'food-1',
  restaurant: 'Pizza Place',
  cuisine: 'Italian',
  rating: 8,
  date: Date.now(),
  favoriteDishes: ['Margherita', 'Tiramisu'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// ── Tests ───────────────────────────────────────────────────

describe('FoodFormModal delete confirmation', () => {
  it('calls window.confirm before deleting an existing entry', () => {
    render(<FoodFormModal entry={sampleEntry} onClose={vi.fn()} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Pizza Place'),
    );
  });

  it('does not call mutateAsync when confirm is cancelled', () => {
    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    render(<FoodFormModal entry={sampleEntry} onClose={vi.fn()} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('calls mutateAsync when confirm is accepted', () => {
    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockMutateAsync.mockResolvedValueOnce(undefined);

    render(<FoodFormModal entry={sampleEntry} onClose={vi.fn()} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith('food-1');
  });

  it('calls onClose after successful deletion', async () => {
    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const onClose = vi.fn();

    render(<FoodFormModal entry={sampleEntry} onClose={onClose} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Wait for the async mutation to settle
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('does not show delete button when adding a new entry (no entry prop)', () => {
    render(<FoodFormModal entry={null} onClose={vi.fn()} />);

    // In add mode, there should be no delete button
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows a delete button in edit mode', () => {
    render(<FoodFormModal entry={sampleEntry} onClose={vi.fn()} />);

    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});

describe('FoodFormModal save behavior', () => {
  it('renders "Log Meal" text in add mode', () => {
    render(<FoodFormModal entry={null} onClose={vi.fn()} />);

    expect(screen.getByText('Log Meal')).toBeInTheDocument();
  });

  it('renders "Save" text in edit mode', () => {
    render(<FoodFormModal entry={sampleEntry} onClose={vi.fn()} />);

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders the entry restaurant name in edit mode', () => {
    render(<FoodFormModal entry={sampleEntry} onClose={vi.fn()} />);

    expect(screen.getByDisplayValue('Pizza Place')).toBeInTheDocument();
  });

  it('has required label for restaurant field', () => {
    render(<FoodFormModal entry={null} onClose={vi.fn()} />);

    expect(screen.getByText('Restaurant *')).toBeInTheDocument();
  });
});
