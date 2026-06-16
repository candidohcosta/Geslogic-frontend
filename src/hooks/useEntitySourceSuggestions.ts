// src/hooks/useEntitySourceSuggestions.ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/api';
import { fetchEntitySources } from '../services/entitySourcesApi';

export interface Suggestion {
  value: string;
  label: string;
  raw: any;
}

export function useEntitySourceSuggestions(
  entityKey: string,
  companyId?: string
) {
  return useQuery<Suggestion[]>({
    queryKey: ['entitySourceSuggestions', entityKey, companyId],
    queryFn: async () => {
      const registry = await fetchEntitySources();
      const src = registry[entityKey];

      if (!src) return [];

      let endpoint = src.endpoint;

      if (src.scope === 'company') {
        if (!companyId) throw new Error(`companyId é obrigatório para "${entityKey}"`);
        endpoint += endpoint.includes('?')
          ? `&companyId=${companyId}`
          : `?companyId=${companyId}`;
      }

      const list = await apiFetch(endpoint);
      if (!Array.isArray(list)) return [];

      return list.map((item: any) => ({
        value: item[src.valueField],
        label: item[src.labelField],
        raw: item,
      }));
    },
    staleTime: 1000 * 60 * 3,
  });
}