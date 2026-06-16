import { apiFetch } from '../../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useRestoreUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch(`/users/${userId}/restore`, { method: 'PATCH' }),

    onSuccess: () => {
      // ✅ refrescar tudo o que depende do utilizador
      queryClient.invalidateQueries({ queryKey: ['platformUsers'] });
      queryClient.invalidateQueries({ queryKey: ['roleAssignments', userId] });
    },
  });
}