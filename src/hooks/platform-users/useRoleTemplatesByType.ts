// frontend/src/hooks/plaform-users/useRoleTemplatesByType.ts

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useRoleTemplatesByType(roleType: string) {
  return useQuery({
    queryKey: ["roles", roleType],
    queryFn: async () => {
      const res = await apiFetch(`/roles?roleType=${roleType}`);
      return res;
    },
  });
}