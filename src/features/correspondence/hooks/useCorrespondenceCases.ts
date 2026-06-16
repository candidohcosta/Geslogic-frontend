// frontend/src/features/correspondence/hooks/useCorrespondenceCases.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export function useCorrespondenceCases(filters: any) {
  const query = new URLSearchParams();

  if (filters.search) query.append('search', filters.search);
  if (filters.status) query.append('status', filters.status);
  if (filters.documentType)
    query.append('documentType', filters.documentType);
  if (filters.companyId)
    query.append('companyId', filters.companyId);

  return useQuery({
    queryKey: ['correspondenceCases', filters],
    queryFn: () =>
      apiFetch(`/correspondence/cases?${query.toString()}`),
  });
}