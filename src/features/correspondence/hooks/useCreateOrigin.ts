// frontend/src/features/correspondence/hooks/useCreateOrigin.ts

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export interface CreateOriginInput {
  companyId: string;
  name: string;
  type?: string;
}

export function useCreateOrigin() {
  return useMutation({
    mutationFn: (input: CreateOriginInput) =>
      apiFetch('/correspondence/origins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
  });
}