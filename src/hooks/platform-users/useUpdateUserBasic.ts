// src/hooks/platform-users/useUpdateUserBasic.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import { toast } from "react-hot-toast";

export function useUpdateUserBasic(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platformUsers"] });
      qc.invalidateQueries({ queryKey: ["user", userId] });
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