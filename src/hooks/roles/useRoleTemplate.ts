// frontend/src/hooks/roles/useRoleTemplate.ts

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useRoleTemplate(roleId: string) {
  return useQuery({
    queryKey: ["roleTemplate", roleId],
    queryFn: () => apiFetch(`/roles/${roleId}/template`),
    enabled: !!roleId,
  });
}