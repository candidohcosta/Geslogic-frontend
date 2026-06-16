// frontend/src/features/correspondence/outbox/hooks/useUpdateOutboundRegistry.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api';
import { OutboundRegistry } from '../../types/registry.types';

interface UpdateOutboundInput {
  id: string;
  subject?: string;
  description?: string;
  department?: string;
}

export function useUpdateOutboundRegistry() {
  const queryClient = useQueryClient();

  return useMutation<OutboundRegistry, Error, UpdateOutboundInput>({
    mutationFn: (input) =>
      apiFetch(`/correspondence/outbound/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['correspondence', 'outbox'],
      });
      queryClient.invalidateQueries({
        queryKey: ['correspondence', 'outbound', vars.id],
      });
    },
  });
}