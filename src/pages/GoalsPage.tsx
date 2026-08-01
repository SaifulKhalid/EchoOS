import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSparkle, IconAlertTriangle } from '@/components/ui/icons';
import { useGoals, useAddGoal, useLogCheckIn, useDeleteGoal } from '@/hooks/useGoals';
import type { GoalEntry } from '@/types';

export default function GoalsPage() {
  const { data: goals, isLoading, error } = useGoals();
  const addGoal = useAddGoal();
  const logCheckIn = useLogCheckIn();
  const deleteGoal = useDeleteGoal();

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const activeGoals = useMemo(() => goals?.filter((g) => g.status === 'active') ?? [], [goals]);
  const completedGoals = useMemo(() => goals?.filter((g) => g.status === 'completed') ?? [], [goals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addGoal.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      frequency,
      streak: 0,
      completionRate: 0,
      status: 'active',
      checkIns: [],
    });
    setTitle('');
    setDescription('');
    setIsAdding(false);
  };

  return (
    <>
      <PageHeader
        title="Goals & Habits"
        subtitle="Track personal goals, daily consistency, and habit streaks."
        action={
          <button onClick={() => setIsAdding(true)} className="btn-primary text-sm">
            <IconSparkle width={16} height={16} />
            Create Goal
          </button>
        }
      />

      {/* Main Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="skeleton mb-3 h-4 w-24 rounded-full" />
              <div className="skeleton mb-2 h-5 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <GlassCard className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mood-love/15 text-mood-love">
            <IconAlertTriangle />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">Failed to load goals</p>
            <p className="mt-1 text-xs text-white/60">{(error as Error).message}</p>
          </div>
        </GlassCard>
      ) : goals?.length === 0 ? (
        <EmptyState
          icon={<span className="text-2xl">🎯</span>}
          title="No goals tracked yet"
          description="Click 'Create Goal' or ask AI in chat ('I want to start running every morning') to set your first habit."
        />
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          <div>
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-white/50">
              Active Goals ({activeGoals.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onCheckIn={() => logCheckIn.mutate({ goalId: goal.id, checkIn: { completed: true } })}
                  onDelete={() => deleteGoal.mutate(goal.id)}
                />
              ))}
            </div>
          </div>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-white/50">
                Completed ({completedGoals.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onCheckIn={() => logCheckIn.mutate({ goalId: goal.id, checkIn: { completed: true } })}
                    onDelete={() => deleteGoal.mutate(goal.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Creation Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-900 p-6 shadow-2xl"
          >
            <h3 className="font-display text-lg font-semibold text-white">New Goal / Habit</h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs text-white/60">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Run every morning"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-white/60">Description (Optional)</label>
                <textarea
                  placeholder="Why this goal matters..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-accent focus:outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs text-white/60">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-surface-800 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="btn-ghost text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-sm">
                  Save Goal
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}

function GoalCard({
  goal,
  onCheckIn,
  onDelete,
}: {
  goal: GoalEntry;
  onCheckIn: () => void;
  onDelete: () => void;
}) {
  return (
    <GlassCard className="flex flex-col justify-between p-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[11px] font-semibold text-accent-soft border border-accent/30">
            🎯 {goal.frequency}
          </span>
          <button
            onClick={onDelete}
            className="text-xs text-white/30 hover:text-mood-love"
            title="Delete Goal"
          >
            ✕
          </button>
        </div>

        <h3 className="mt-2 font-display text-base font-semibold text-white">{goal.title}</h3>
        {goal.description && <p className="mt-1 text-xs text-white/60">{goal.description}</p>}
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60">Active Streak:</span>
          <span className="font-semibold text-accent-soft">🔥 {goal.streak ?? 0} days</span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-white/40 mb-1">
            <span>Consistency</span>
            <span>{goal.completionRate ?? 0}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, goal.completionRate ?? 0)}%` }}
            />
          </div>
        </div>

        <button
          onClick={onCheckIn}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/10 hover:border-accent/40"
        >
          Check In Today ✓
        </button>
      </div>
    </GlassCard>
  );
}
