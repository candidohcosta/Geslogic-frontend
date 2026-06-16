// frontend/src/features/correspondence/email-ingestion/hooks/useEmailInbox.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api';

export function useEmailInbox(companyId?: string) {
  return useQuery({
    queryKey: ['email-inbox', companyId],
    queryFn: () =>
      apiFetch(
        `/correspondence/email/inbox?companyId=${companyId}`
      ),
    enabled: !!companyId,
  });
}