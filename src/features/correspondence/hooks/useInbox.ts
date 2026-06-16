// frontend/src/features/correspondence/hooks/useInbox.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { InboxEntry } from '../types/inbox.types';

export function useInbox() {
  return useQuery<InboxEntry[]>({
    queryKey: ['correspondence', 'inbox'],
    queryFn: () => apiFetch('/correspondence/inbox'),
  });
}