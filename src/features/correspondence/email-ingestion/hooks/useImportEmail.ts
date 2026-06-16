// frontend/src/features/correspondence/email-ingestion/hooks/useImportEmail.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api';
import { toast } from 'react-hot-toast';

export function useImportEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      companyId: string;
      emailId: string;
      attachmentIds?: string[];
    }) =>
      apiFetch('/correspondence/email/import', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['email-inbox'],
      });

      queryClient.invalidateQueries({
        queryKey: ['correspondence-inbox'],
      });

      toast.success('Email importado com sucesso');
    },
    
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao importar email');
    },
  });
}