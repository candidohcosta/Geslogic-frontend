// frontend/src/features/correspondence/hooks/useCreateInboundEntry.ts

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export interface CreateInboundEntryInput {
  companyId?: string;
  originId?: string;
  channel: string;
  department?: string;
  subject?: string;
  description?: string;
  receivedAt?: string;
}

export function useCreateInboundEntry() {
  return useMutation({
    mutationFn: (input: CreateInboundEntryInput) =>
      apiFetch('/correspondence/inbound/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
  });
}