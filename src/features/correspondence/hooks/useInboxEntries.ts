// backend/src/modules/correspondence/hooks/useInboxEntries.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { InboxEntry } from '../types/inbox.types';

export function useInboxEntries(
  companyId: string | null,
  statusFilter: string
) {
  return useQuery({
    queryKey: ['inboxEntries', companyId, statusFilter],

    queryFn: async () => {
      return apiFetch(
        `/correspondence/inbox?companyId=${companyId}&status=${statusFilter}`
      );
    },

    enabled: !!companyId,
  });
}

/* export function useInboxEntries(companyId: string | null, includeRejected: boolean) {
  return useQuery<InboxEntry[]>({
    queryKey: ['correspondence', 'inbox', companyId, includeRejected],
    queryFn: () =>
      apiFetch(`/correspondence/inbox?companyId=${companyId}&includeRejected=${includeRejected}`),
    enabled: !!companyId, // 🔑 não chamar API sem empresa
  });
} */