// frontend/src/features/correspondence/hooks/useRegisterInboundManual.ts

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export interface RegisterInboundManualInput {
  companyId?: string;          // usado apenas por PlatformAdmin
  originId?: string;
  channel: string;
  department?: string;
  subject?: string;
  description?: string;
  receivedAt?: string;
  attachments?: File[];
}

export function useRegisterInboundManual() {
  return useMutation({
    mutationFn: async (input: RegisterInboundManualInput) => {
      const formData = new FormData();

      if (input.companyId) formData.append('companyId', input.companyId);
      if (input.originId) formData.append('originId', input.originId);

      formData.append('channel', input.channel);
      if (input.department) formData.append('department', input.department);
      if (input.subject) formData.append('subject', input.subject);
      if (input.description) formData.append('description', input.description);
      if (input.receivedAt) formData.append('receivedAt', input.receivedAt);

      if (input.attachments) {
        input.attachments.forEach((file) =>
          formData.append('attachments', file),
        );
      }

      return apiFetch('/correspondence/inbound/manual', {
        method: 'POST',
        body: formData,
      });
    },
  });
}