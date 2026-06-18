// src/features/correspondence/hooks/useDocumentTypesCatalog.ts

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

export function useDocumentTypesCatalog(
  companyId: string,
  direction: 'IN' | 'OUT' | 'INTERNAL' = 'OUT'  // ✅ NOVO: parâmetro com default
) {
  return useQuery<DocumentType[]>({
    queryKey: ['correspondence', 'document-types', companyId, direction],  // ✅ Incluir direction na key
    queryFn: async (): Promise<DocumentType[]> => {
      if (!companyId) {
        return [];
      }
      
      const response = await apiFetch(
        `/correspondence/outbound/catalog/${companyId}/document-types/${direction}`  // ✅ Adicionar direção
      );
      
      return response.documentTypes ?? [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}