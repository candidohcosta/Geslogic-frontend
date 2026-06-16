// frontend/src/features/correspondence/hooks/useRevertInboxRejection.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { toast } from 'react-hot-toast';

export function useRevertInboxRejection(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      registryId,
      comment,
    }: {
      registryId: string;
      comment: string;
    }) => {
      return apiFetch(
        `/correspondence/inbox/${registryId}/revert-rejection`,
        {
          method: 'POST',
          body: JSON.stringify({ comment }),
        },
      );
    },

    onSuccess: () => {
      // 🔄 refrescar inbox
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'correspondence' &&
          query.queryKey[1] === 'inbox',
      });
      toast.success("Estado da entrada revertido com sucesso. A entrada voltará a aparecer na inbox.");
    },
    onError: (error: any) => {
      toast.error(
        error?.message ?? "Não foi possível reverter o estado da entrada."
      );
    },    
  });
}