// src/hooks/platform-users/useCreateUser.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import toast from "react-hot-toast";

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;

  password?: string | null;
  invite?: boolean;

  initialRoleId: string;
  metadata?: Record<string, any>;

//  scope: string; // "platform"
}

export function useCreateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserPayload) =>
      apiFetch("/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platformUsers"] });
      toast.success("Utilizador criado com sucesso.",);
    },

    onError: (error: any) => {
      const message =
        error?.message ??
        "Não foi possível criar o utilizador.";
      toast.error(message);
    },    
  });
}