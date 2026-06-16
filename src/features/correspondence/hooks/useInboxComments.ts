// frontend/src/features/correspondence/hooks/useInboxComments.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { InboxComment } from '../types/inbox.types';

export function useInboxComments(registryId: string | null) {
  return useQuery<InboxComment[]>({
    queryKey: ['correspondence', 'inbox', registryId, 'comments'],
    queryFn: () =>
      apiFetch(`/correspondence/inbox/${registryId}/comments`),
    enabled: !!registryId,
  });
}