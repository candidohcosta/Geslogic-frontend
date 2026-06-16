// frontend/src/features/correspondence/hooks/useDeleteInboxEntry.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import toast from "react-hot-toast";

async function deleteInboxEntry(registryId: string) {
  return apiFetch(`/correspondence/inbound/${registryId}`, {
    method: 'DELETE',
  });
}

export function useDeleteInboxEntry(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInboxEntry,
    onSuccess: () => {

      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'correspondence' &&
          query.queryKey[1] === 'inbox',
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