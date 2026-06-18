// src/features/correspondence/hooks/useDocumentTypesCatalog.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api';

interface DocumentType {
  id: string;
  label: string;
  description?: string | null;
}

interface DocumentTypesResponse {
  documentTypes: DocumentType[];
}

export function useDocumentTypesCatalog(companyId: string) {
  return useQuery<DocumentType[]>({
    queryKey: ['correspondence', 'document-types', companyId],
    queryFn: async (): Promise<DocumentType[]> => {
      if (!companyId) {
        return [];
      }
      
      const response = await apiFetch(
        `/correspondence/outbound/${companyId}/document-types`
      );
      
      return response.documentTypes ?? [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}