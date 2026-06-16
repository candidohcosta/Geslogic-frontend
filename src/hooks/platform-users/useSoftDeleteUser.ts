// src/hooks/platform-users/useSoftDeleteUser.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import toast from "react-hot-toast";

export function useSoftDeleteUser(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch(`/users/${userId}/delete`, { method: "PATCH" }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platformUsers"] });
      toast.success("Utilizador eliminado com sucesso.");
    },

    onError: (error: any) => {
      toast.error(
        error?.message ?? "Não foi possível eliminar o utilizador."
      );
    },
  });
}