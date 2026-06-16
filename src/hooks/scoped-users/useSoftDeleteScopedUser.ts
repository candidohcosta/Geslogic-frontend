// frontend/src/hooks/scoped-users/useSoftDeleteScopedUser.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import { toast } from "react-hot-toast";

export function useSoftDeleteScopedUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      apiFetch(`/users/${userId}/delete`, {
        method: "PATCH",
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scoped-users"],
        exact: false,
      });
      toast.success("Utilizador eliminado com sucesso.",);
    },
    onError: (error: any) => {
      const message =
        error?.message ??
        "Não foi possível eliminar o utilizador.";
      toast.error(message);
      console.error("Erro ao eliminar o utilizador", userId, error);
    },
  });
}