// frontend/src/features/correspondence/hooks/useCases.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api';

export function useCases(filters: any) {
  const queryString = new URLSearchParams();

  if (filters.search) {
    queryString.append('search', filters.search);
  }

  if (filters.status?.length) {
    filters.status.forEach((s: string) =>
      queryString.append('status', s)
    );
  }

  if (filters.direction?.length) {
    filters.direction.forEach((d: string) =>
      queryString.append('direction', d)
    );
  }

  if (filters.documentType?.length) {
    filters.documentType.forEach((t: string) =>
      queryString.append('documentType', t)
    );
  }

  return useQuery({
    queryKey: ['cases', filters],
    queryFn: () =>
      apiFetch(`/correspondence/cases?${queryString.toString()}`),
  });
}