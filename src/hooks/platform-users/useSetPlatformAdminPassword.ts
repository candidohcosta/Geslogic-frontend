import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import toast from "react-hot-toast";

export function useSetPlatformAdminPassword(userId: string) {
  return useMutation({
    mutationFn: (password: string) =>
      apiFetch(`/users/platform-admins/${userId}/password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => {
      toast.success("Password atualizada com sucesso.",);
      console.log("Password resetada com sucesso para o utilizador", userId);
    },

    onError: (error: any) => {
      const message =
        error?.message ??
        "Não foi possível atualizar a password.";
      toast.error(message);
      console.error("Erro ao resetar a password para o utilizador", userId, error);
    },
  });
}