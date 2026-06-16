// frontend/src/features/correspondence/hooks/useRegistryStatusHistory.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export function useRegistryStatusHistory(registryId?: string) {
  return useQuery({
    queryKey: ['registryStatusHistory', registryId],
    queryFn: () =>
      apiFetch(`/correspondence/registry/${registryId}/history`),
    enabled: !!registryId,
  });
}
