// frontend/src/features/corresopondence/hooks/useCreateOutboundRegistry.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { CorrespondenceRegistry } from '../types/registry.types';

interface CreateOutboundInput {
  companyId?: string; 
  channel: string;
  department?: string;
  subject?: string;
  description?: string;
  destinationId?: string;
}

export function useCreateOutboundRegistry() {
  const queryClient = useQueryClient();

  return useMutation<
    CorrespondenceRegistry,
    Error,
    CreateOutboundInput
  >({
    mutationFn: async (input) => {
      return apiFetch('/correspondence/outbound', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['correspondence', 'outbox'],
      });
    },
  });
}