// frontend/src/features/correspondence/hooks/useCorrespondenceCatalog.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export function useCorrespondenceCatalog() {
  return useQuery({
    queryKey: ['correspondence', 'catalog'],

    queryFn: async () => {
      const res = await apiFetch('/correspondence/catalog');

      // ✅ importante: adaptar se necessário
      return res;
    },
  });
}