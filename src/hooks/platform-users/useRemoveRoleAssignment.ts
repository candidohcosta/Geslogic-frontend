// src/hooks/platform-users/useRemoveRoleAssignment.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import toast from "react-hot-toast";

export function useRemoveRoleAssignment(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiFetch(`/role-assignments/${assignmentId}`, {
        method: "DELETE",
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roleAssignments", userId] });
      toast.success("Função removida com sucesso.",);
    },

    onError: (error: any) => {
      const message =
        error?.message ??
        "Não foi possível remover a função atribuida ao utilizador.";
      toast.error(message);
      console.error("Erro ao remover a função atribuida ao utilizador", userId, error);
    }
  });
}