// frontend/src/hooks/roles/useDeleteRole.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useDeleteRole(roleId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch(`/roles/${roleId}`, {
        method: "DELETE",
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}