// frontend/src/hooks/platform-users/useRoleData.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useRoleData(userId?: string, roleId?: string) {
  return useQuery({
    queryKey: ["roleData", userId, roleId],
    queryFn: () =>
      apiFetch(
        `/role-data?userId=${userId}&roleId=${roleId}`
      ),
    enabled: !!userId && !!roleId,
  });
}