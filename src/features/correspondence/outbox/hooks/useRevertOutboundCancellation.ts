// frontend/src/features/correspondence/outbox/hooks/useRevertOutboundCancellation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api';

export function useRevertOutboundCancellation(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ registryId, comment }: any) =>
      apiFetch(`/correspondence/outbound/${registryId}/revert-cancel`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['correspondence', 'outbox'],
      });
    },
  });
}