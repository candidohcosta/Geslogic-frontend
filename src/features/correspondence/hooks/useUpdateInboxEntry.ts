// frontend/src/features/correspondence/hooks/useUpdateInboxEntry.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import toast from "react-hot-toast";

interface UpdateInboxEntryPayload {
  id: string;
  subject?: string;
  description?: string;
  department?: string;
  receivedAt?: string;
}

export function useUpdateInboxEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateInboxEntryPayload) => {
      const { id, ...data } = payload;

      return apiFetch(`/correspondence/inbound/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    onSuccess: () => {
/*       queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'correspondence' &&
          query.queryKey[1] === 'inbox',
      }); */
    
    queryClient.invalidateQueries({
      queryKey: ['inboxEntries'],
    });

      toast.success("Entrada atualizada com sucesso.");
    },
    onError: (error: any) => {
      toast.error(
        error?.message ?? "Não foi possível atualizar a entrada."
      );
    },
  });
}