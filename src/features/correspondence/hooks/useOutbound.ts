// frontend/src/features/correspondence/hooks/useOutbound.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { OutboundRegistryDetail } from '../types/outbound-detail.types';

export function useOutbound(caseId: string, outboundId: string) {
  return useQuery<OutboundRegistryDetail | undefined>({
    queryKey: ['correspondence', caseId, 'outbound', outboundId],
    queryFn: async () => {
      const list = await apiFetch(
        `/correspondence/${caseId}/outbound`
      );

      return list.find(
        (o: OutboundRegistryDetail) => o.id === outboundId
      );
    },
    enabled: !!caseId && !!outboundId,
  });
}