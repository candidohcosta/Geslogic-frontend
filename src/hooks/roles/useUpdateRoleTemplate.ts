// frontend/src/hooks/roles/useUpdateRoleTemplate.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useUpdateRoleTemplate(roleId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/roles/${roleId}/template`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roleTemplate", roleId] });
    },
  });
}