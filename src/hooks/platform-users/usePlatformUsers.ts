// src/hooks/platform-users/usePlatformUsers.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export function usePlatformUsers() {
  return useQuery({
    queryKey: ["platformUsers"],
    queryFn: () => apiFetch("/users/by-role-type/PLATFORM_USER"),
    staleTime: 1000 * 30, // 30s
  });
}