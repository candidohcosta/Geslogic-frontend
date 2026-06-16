// frontend/src/features/correspondence/hooks/useCreateOutbound.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { CreateOutboundInput, OutboundRegistry } from '../types/outbound.types';

export function useCreateOutbound(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation<OutboundRegistry, Error, CreateOutboundInput>({
    mutationFn: (input) =>
      apiFetch(`/correspondence/${caseId}/outbound`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    onSuccess: () => {
      // ✅ invalida apenas dados do expediente
      
      queryClient.invalidateQueries({
        queryKey: ['correspondence', 'case', caseId],
      });

      queryClient.invalidateQueries({
        queryKey: ['correspondence', caseId, 'outbound'],
      });
    },
  });
}