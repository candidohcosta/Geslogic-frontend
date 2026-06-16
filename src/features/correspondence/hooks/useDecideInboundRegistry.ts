// frontend/src/features/correspondence/hooks/useDecideInboundRegistry.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import toast from "react-hot-toast";


type DecisionType = 'CREATE_CASE' | 'ON_HOLD' | 'REJECT';

interface DecideInboundInput {
  registryId: string;
  decision: DecisionType;
  attachmentIds?: string[];
  comment?: string;
}

interface DecideInboundResult {
  status: 'ASSOCIATED' | 'REJECTED' | 'ON_HOLD';
  caseId?: string;
}

export function useDecideInboundRegistry(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation<DecideInboundResult, Error, DecideInboundInput>({
    mutationFn: ({ registryId, ...body }) =>
      apiFetch(`/correspondence/inbox/${registryId}/decide`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    onSuccess: (result) => {

      // 🔔 Toast conforme o estado final
      switch (result.status) {
        case 'ASSOCIATED':
          toast.success('A entrada deu inicio a um processo com sucesso.');
          break;

        case 'ON_HOLD':
          toast.success('A entrada foi colocada em espera. Foi possível adicionar um comentário para justificar a decisão.');
          break;

        case 'REJECTED':
          toast.error('A entrada foi rejeitada. Foi adicionado um comentário para justificar a decisão.');
          break;
      }

      // 🔄 invalidar inbox
/*       queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'correspondence' &&
          query.queryKey[1] === 'inbox',
      }); */

      queryClient.invalidateQueries({
        queryKey: ['inboxEntries', companyId],
      });

      // 🔄 se criou expediente, invalidar também o case
      if (result.caseId) {
        queryClient.invalidateQueries({
          queryKey: ['correspondence', 'case', result.caseId],
        });
      }
    },

    onError: () => {
      toast.error('Não foi possível concluir a ação.');
    },

  });
}
