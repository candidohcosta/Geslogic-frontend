// frontend/src/features/correspondence/hooks/useEmailAvailability.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export function useEmailAvailability(companyId?: string) {
  return useQuery({
    queryKey: ['email-availability', companyId],
    queryFn: () =>
      apiFetch(
        `/correspondence/settings/email-enabled?companyId=${companyId}`
      ),
    enabled: !!companyId,
  });
}