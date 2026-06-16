// frontend/src/features/correspondence/hooks/useCaseHistory.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { HistoryEntry } from '../types/history.types';

export function useCaseHistory(caseId: string) {
  return useQuery<HistoryEntry[]>({
    queryKey: ['correspondence', caseId, 'history'],
    queryFn: () => apiFetch(`/correspondence/${caseId}/history`),
    enabled: !!caseId,
  });
}