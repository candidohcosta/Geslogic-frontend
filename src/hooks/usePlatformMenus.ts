// src/hooks/usePlatformMenus.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlatformMenus, updatePlatformMenus } from '../services/api';

export function usePlatformMenus() {
  const qc = useQueryClient();
  const menus = useQuery({ queryKey: ['platform-settings','menus'], queryFn: getPlatformMenus, staleTime: 30000 });
  const save = useMutation({
    mutationFn: (payload: { sidebar: any[] }) => updatePlatformMenus(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings','menus'] }),
  });
  return { menus, save };
}