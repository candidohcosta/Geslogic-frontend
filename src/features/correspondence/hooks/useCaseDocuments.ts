// frontend/src/features/correspondence/hooks/useCaseDocuments.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { CaseDocument } from '../types/document.types';

export function useCaseDocuments(caseId: string) {
  return useQuery<CaseDocument[]>({
    queryKey: ['correspondence', caseId, 'documents'],
    queryFn: () => apiFetch(`/correspondence/${caseId}/documents`),
    enabled: !!caseId,
  });
}