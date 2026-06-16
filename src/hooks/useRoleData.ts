// src/hooks/useRoleData.ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/api';

export function useRoleData(userId: string, roleId: string) {
  return useQuery({
    queryKey: ['roleData', userId, roleId],
    queryFn: () =>
      apiFetch(`/role-data/${userId}/${roleId}`).then((r: any) => r.data),
    enabled: !!userId && !!roleId,
    staleTime: 1000 * 60,
  });
}