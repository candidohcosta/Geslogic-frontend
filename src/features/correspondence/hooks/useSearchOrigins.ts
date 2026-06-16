// frontend/src/features/correspondence/hooks/useSearchOrigins.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export function useSearchOrigins(query: string) {
  return useQuery({
    queryKey: ['correspondence-origins', query],
    queryFn: () =>
      apiFetch(`/correspondence/origins?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}