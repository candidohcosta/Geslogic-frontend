// src/hooks/platform-users/useToggleUserActive.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import toast from "react-hot-toast";

export function useToggleUserActive(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (isActive: boolean) =>
      apiFetch(`/users/scoped/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platformUsers"] });
      qc.invalidateQueries({ queryKey: ["user", userId] });
      toast.success("Estado do utilizador atualizado com sucesso.",);
    },

    onError: (error: any) => {
      const message =
        error?.message ??
        "Não foi possível atualizar o estado do utilizador.";
      toast.error(message);
      console.error("Erro ao atualizar o estado do utilizador", userId, error);
    }
  });
}