// frontend/src/features/correspondence/email-ingestion/hooks/useEmailAction.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api'; // ajusta path conforme o teu projeto
import toast from 'react-hot-toast';

export function useEmailAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      companyId: string;
      emailId: string;
      action: 'REJECT' | 'IGNORE';
    }) => {
      return apiFetch('/correspondence/email/action', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['email-inbox', variables.companyId],
      });

        // ✅ TOAST SUCESSO
        if (variables.action === 'REJECT') {
        toast.success('Email rejeitado');
        }

        if (variables.action === 'IGNORE') {
        toast.success('Email rejeitado - Remetente ignorado');
        }

    },

    onError: (error: any) => {
        toast.error(error.message || 'Erro ao processar email');
    },

  });
}