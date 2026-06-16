// frontend/src/features/correspondence/outbox/hooks/useOutboundRegistryFiles.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api';

export interface OutboundRegistryFile {
  id: string;
  url: string;
  originalName?: string;
  displayName?: string;
}

export function useOutboundRegistryFiles(registryId: string) {
  return useQuery({
    queryKey: [
      'correspondence',
      'outbound',
      registryId,
      'files',
    ],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/uploads/list?ownerType=OutboundRegistry&ownerId=${registryId}&purpose=CORRESPONDENCE_OUTBOX`
      );

      return res.files;
    },
    enabled: !!registryId,
  });
}