import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { seedDemoData } from '@/services/demo/seedData';
import { useToastStore } from '@/services/toastStore';

export function useDemoMode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSeeding, setIsSeeding] = useState(false);

  const triggerDemoMode = async (): Promise<boolean> => {
    if (!user) {
      useToastStore.getState().error('Please sign in or start a guest session first.');
      return false;
    }

    setIsSeeding(true);
    try {
      await seedDemoData(user.uid);
      await queryClient.invalidateQueries();
      useToastStore.getState().success('Demo Mode active! Sample movies, dining, travel, goals, and insights preloaded. 🚀');
      return true;
    } catch (err) {
      console.error('Failed to seed demo data:', err);
      useToastStore.getState().error(`Failed to enable Demo Mode: ${(err as Error).message}`);
      return false;
    } finally {
      setIsSeeding(false);
    }
  };

  return { triggerDemoMode, isSeeding };
}
