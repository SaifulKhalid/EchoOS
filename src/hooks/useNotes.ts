import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import * as noteService from '@/services/firestore/notes';
import type { NoteEntry } from '@/types';

/** Query all notes for the current user. */
export function useNotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notes', user?.uid],
    queryFn: () => noteService.fetchNotes(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Add a note. */
export function useAddNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
      noteService.addNote(user!.uid, data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['notes', user?.uid] });
      const previous = queryClient.getQueryData(['notes', user?.uid]);
      queryClient.setQueryData(['notes', user?.uid], (old: NoteEntry[] | undefined) => {
        const optimistic = { id: 'optimistic-' + Date.now(), createdAt: Date.now(), updatedAt: Date.now(), ...newData } as NoteEntry;
        return old ? [optimistic, ...old] : [optimistic];
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notes', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', user?.uid] });
    },
  });
}

/** Partial update to an existing note. */
export function useUpdateNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => noteService.updateNote(user!.uid, id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', user?.uid] });
      const previous = queryClient.getQueryData(['notes', user?.uid]);
      queryClient.setQueryData(['notes', user?.uid], (old: NoteEntry[] | undefined) => {
        return old?.map((item) => item.id === id ? { ...item, ...data } : item);
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notes', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', user?.uid] });
    },
  });
}

/** Delete a note by id. */
export function useDeleteNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noteService.deleteNote(user!.uid, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notes', user?.uid] });
      const previous = queryClient.getQueryData(['notes', user?.uid]);
      queryClient.setQueryData(['notes', user?.uid], (old: NoteEntry[] | undefined) => {
        return old?.filter((item) => item.id !== id);
      });
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notes', user?.uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', user?.uid] });
    },
  });
}
