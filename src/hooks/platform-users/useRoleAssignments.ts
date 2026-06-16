// src/hooks/platform-users/useRoleAssignments.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useRoleAssignments(userId?: string) {
  return useQuery({
    queryKey: ["roleAssignments", userId],
    queryFn: () =>
      apiFetch(`/role-assignments?userId=${userId}`),
    enabled: !!userId,

  refetchOnMount: true,
  refetchOnWindowFocus: false,

  });
}