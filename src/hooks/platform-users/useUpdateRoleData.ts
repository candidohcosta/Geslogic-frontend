// frontend/src/hooks/platform-users/useUpdateRoleData.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useUpdateRoleData(userId: string, roleId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiFetch(`/role-data?userId=${userId}&roleId=${roleId}`, {
        method: "PUT",
        body: JSON.stringify({ dataJson: data }),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roleData", userId, roleId] });
      qc.invalidateQueries({ queryKey: ["roleAssignments", userId] });
    },
  });
}