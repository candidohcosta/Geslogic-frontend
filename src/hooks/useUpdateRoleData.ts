// src/hooks/useUpdateRoleData.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api';

export function useUpdateRoleData(userId: string, roleId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (patch: Record<string, any>) =>
      apiFetch(`/role-data/${userId}/${roleId}`, {
        method: 'PUT',
        body: JSON.stringify({ patch }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roleData', userId, roleId] });
    },
  });
}