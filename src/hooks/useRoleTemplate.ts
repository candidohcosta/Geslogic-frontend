// src/hooks/useRoleTemplate.ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/api';

export function useRoleTemplate(roleId: string) {
  return useQuery({
    queryKey: ['roleTemplate', roleId],
    queryFn: () =>
      apiFetch(`/role-templates/${roleId}`).then((res: any) => res.template),
    enabled: !!roleId,
    staleTime: 1000 * 60 * 5,
  });
}