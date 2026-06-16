// src/hooks/platform-users/useAddRoleAssignment.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import { toast } from "react-hot-toast";

export function useAddRoleAssignment(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { roleName: string; scope: string }) =>
      apiFetch("/role-assignments", {
        method: "POST",
        body: JSON.stringify({
          userId,
          roleName: data.roleName,
          scope: data.scope,
        }),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roleAssignments", userId] });
      toast.success("Atribuição de função criada com sucesso.",);
    },

    onError: (error: any) => {
      const message =
        error?.message ??
        "Não foi possível criar a atribuição de função.";
      toast.error(message);
      console.error("Erro ao criar a atribuição de função para o utilizador", userId, error);
    }
  });
}