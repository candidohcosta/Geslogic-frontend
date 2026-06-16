// frontend/src/features/correspondence/hooks/useOutboundRegistries.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { CorrespondenceRegistry } from '../types/registry.types';

/**
 * Lista os registos de saída (OUTBOX)
 */
export function useOutboundRegistries(
  companyId: string | null,
  includeCancelled: boolean = false,
) {
  return useQuery<CorrespondenceRegistry[]>({
    queryKey: ['correspondence', companyId, 'outbox', includeCancelled],
    enabled: !!companyId,
    queryFn: async () => {
      const query = includeCancelled ? '?includeCancelled=true' : '';
      return apiFetch(`/correspondence/outbox${query}`);
    },
  });
}