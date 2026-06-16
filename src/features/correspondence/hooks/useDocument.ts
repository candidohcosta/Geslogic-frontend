// frontend/src/features/correspondence/hooks/useDocument.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';
import { DocumentDetail } from '../types/document-detail.types';

export function useDocument(caseId: string, documentId: string) {
  return useQuery<DocumentDetail | undefined>({
    queryKey: ['correspondence', caseId, 'document', documentId],
    queryFn: async () => {
      const docs = await apiFetch(
        `/correspondence/${caseId}/documents`
      );
      return docs.find(
        (d: DocumentDetail) => d.document.id === documentId
      );
    },
    enabled: !!caseId && !!documentId,
  });
}