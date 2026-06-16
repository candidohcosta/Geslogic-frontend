// frontend/src/features/correspondence/hooks/useRegisterInboundWithUpload.ts

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export function useRegisterInboundWithUpload(caseId: string) {
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch(`/correspondence/${caseId}/inbound-with-upload`, {
        method: 'POST',
        body: formData,
      }),
  });
}