import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import { toast } from "react-hot-toast";

export function useSendPlatformAdminPasswordReset(userId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch(`/users/platform-admins/${userId}/password-reset`, {
        method: 'POST',
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