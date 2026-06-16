// frontend/src/hooks/scoped-users/useScopedUsers.ts

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function useScopedUsers() {
  return useQuery({
    queryKey: ["scoped-users"],
    queryFn: () => apiFetch("/users/scoped"),
    staleTime: 1000 * 30,
  });
}