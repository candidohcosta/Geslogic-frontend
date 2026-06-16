// frontend/src/roles/useCreateRole.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useCreateRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/roles`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}