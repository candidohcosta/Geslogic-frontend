// frontend/src/hooks/scoped-users/useSendScopedUserPasswordReset.ts

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import { toast } from "react-hot-toast";

export function useSendScopedUserPasswordReset(userId: string) {
  return useMutation({
    mutationFn: async () =>
      apiFetch(`/users/scoped/${userId}/reset-password`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Password resetada com sucesso.",);
      console.log("Password resetada com sucesso para o utilizador", userId);
    },

    onError: (error: any) => {
      const message =
        error?.message ??
        "Não foi possível resetar a password.";
      toast.error(message);
      console.error("Erro ao resetar a password para o utilizador", userId, error);
    },      
  });
}