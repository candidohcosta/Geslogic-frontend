// frontend/src/hooks/scoped-users/useRestoreScopedUser.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import { toast } from "react-hot-toast";

export function useRestoreScopedUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      apiFetch(`/users/${userId}/restore`, {
        method: "PATCH",
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scoped-users"],
        exact: false,
      });
      toast.success("Utilizador restaurado com sucesso.",);
    },
    onError: (error: any) => {
      const message =
        error?.message ??
        "Não foi possível restaurar o utilizador.";
      toast.error(message);
      console.error("Erro ao restaurar o utilizador", userId, error);
    },    
  });
}
