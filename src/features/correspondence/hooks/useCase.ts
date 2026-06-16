// frontend/src/features/correspondence/hooks/useCase.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { CorrespondenceCase } from '../types/case.types';

export function useCase(caseId: string) {
  return useQuery<CorrespondenceCase>({
    queryKey: ['correspondence', 'case', caseId],
    queryFn: () => apiFetch(`/correspondence/${caseId}`),
    enabled: !!caseId,
  });
}