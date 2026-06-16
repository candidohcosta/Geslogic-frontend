// frontend/src/features/correspondence/hooks/useInboundRegistries.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { CorrespondenceRegistry } from '../types/registry.types';

export function useInboundRegistries(caseId: string) {
  return useQuery<CorrespondenceRegistry[]>({
    queryKey: ['correspondence', caseId, 'inbound'],
    queryFn: () => apiFetch(`/correspondence/${caseId}/inbound`),
    enabled: !!caseId,
  });
}