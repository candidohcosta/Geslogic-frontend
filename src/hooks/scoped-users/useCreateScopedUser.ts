import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import { toast } from "react-hot-toast";

type CreateScopedUserPayload = {
  firstName: string;
  lastName: string;
  email: string;

  password: string | null;
  invite: boolean;

  companyId?: string;
  initialRoleId: string;
  metadata?: Record<string, any>;
};

export function useCreateScopedUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateScopedUserPayload) =>
      apiFetch("/users/scoped", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    onSuccess: () => {
      // ✅ refrescar listagem de scoped users
      queryClient.invalidateQueries({ queryKey: ["scoped-users"] });
      toast.success("Utilizador criado com sucesso.",);

      // (opcional) se tiveres listagens agregadas
      // queryClient.invalidateQueries({ queryKey: ["platformUsers"] });
    },

    onError: (error: any) => {
      const message =
        error?.message ??
        "Não foi possível criar o utilizador.";
      toast.error(message);
    },      
  });
}
