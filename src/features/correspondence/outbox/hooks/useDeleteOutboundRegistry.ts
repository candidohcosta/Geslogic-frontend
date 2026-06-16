// frontend/src/features/correspondence/outbox/hooks/useDeleteOutboundRegistry.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api';
import { toast } from 'react-hot-toast';

export function useDeleteOutboundRegistry(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/correspondence/outbound/${id}`, {
        method: 'DELETE',
      });
    },

    onSuccess: () => {
      // ✅ invalida lista da outbox
      queryClient.invalidateQueries({
        queryKey: ['correspondence', 'outbox', companyId],
      });
      toast.success("Entrada eliminada com sucesso.");
    },
    onError: (error: any) => {
      toast.error(
        error?.message ?? "Não foi possível eliminar a entrada."
      );
    },    
  });
}