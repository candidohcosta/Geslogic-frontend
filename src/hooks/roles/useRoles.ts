// frontend/src/hooks/roles/useRoles.ts

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useRoles(roleType?: string, companyId?: string) {
  return useQuery({
    queryKey: ["roles", roleType, companyId],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (roleType) params.append("roleType", roleType);
      if (companyId) params.append("companyId", companyId);

      const url = `/roles${params.toString() ? `?${params.toString()}` : ""}`;

      console.log("URL FINAL (SAFE):", url);

      return apiFetch(url);
    },
  });
}