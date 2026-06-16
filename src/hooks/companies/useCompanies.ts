// frontend/src/hooks/companies/useCompanies.ts

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";

export type CompanyOption = {
  id: string;
  name: string;
};

export function useCompanies() {
  return useQuery<CompanyOption[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await apiFetch("/companies");

      // ✅ normalização EXATA para o payload real da API
      if (Array.isArray(res)) return res;

      if (Array.isArray(res?.companies)) {
        return res.companies.map((c: any) => ({
          id: c.id,
          name: c.name,
        }));
      }

      return [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30,
  });
}