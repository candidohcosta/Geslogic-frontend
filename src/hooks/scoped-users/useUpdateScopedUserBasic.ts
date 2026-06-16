// frontend/src/hooks/scoped-users/useUpdateScopedUserBasic.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import { toast } from "react-hot-toast";

export function useUpdateScopedUserBasic(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { firstName: string; lastName: string }) =>
      apiFetch(`/users/scoped/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scoped-users"],
        exact: false,
      });
      toast.success("Utilizador Atualizado com sucesso.",);
    },

    onError: (error: any) => {
      const message =
        error?.message ??
        "Não foi possível atualizar o utilizador.";
      toast.error(message);
    },     
  });
}