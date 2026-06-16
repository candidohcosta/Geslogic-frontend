// frontend/src/features/correspondence/hooks/useSendOutboundRegistry.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api';

type CaseMode = 'NONE' | 'CREATE' | 'LINK';

export function useSendOutboundRegistry(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      registryId: string;
      decision: 'SEND' | 'ON_HOLD' | 'CANCEL';
      comment?: string;

      caseMode?: CaseMode;
      caseId?: string;

      documentType?: string;

    }) => {
      return apiFetch(
        `/correspondence/outbound/${params.registryId}/send`,
        {
          method: 'POST',
          body: JSON.stringify({
            decision: params.decision,
            comment: params.comment,
            caseMode: params.caseMode,
            caseId: params.caseId,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['correspondence', 'outbox'],
      });
    },
  });
}