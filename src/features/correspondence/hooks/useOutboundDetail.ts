// frontend/src/features/correspondence/hooks/useOutboundDetail.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { CorrespondenceRegistry } from '../types/registry.types';

export function useOutboundDetail(outboundId: string | null) {
  return useQuery<CorrespondenceRegistry>({
    queryKey: ['correspondence', 'outbound', outboundId],
    queryFn: () =>
      apiFetch(`/correspondence/outbound/${outboundId}`),
    enabled: !!outboundId,
  });
}