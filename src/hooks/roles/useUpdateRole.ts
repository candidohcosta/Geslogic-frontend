// frontend/src/hooks/roles/useUpdateRole.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useUpdateRole(roleId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/roles/${roleId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}