// src/context/CompanyContext.tsx

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { getCompanySlugFromHostname } from '../lib/routing';

interface CompanyContextType {
  companySlug: string | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Analisamos o hostname APENAS UMA VEZ, quando o provider é criado.
  const [companySlug] = useState(() => getCompanySlugFromHostname(window.location.hostname));

  // useMemo garante que o objeto de valor só é recriado se o slug mudar (o que não irá acontecer).
  const value = useMemo(() => ({ companySlug }), [companySlug]);

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

// Hook personalizado para usar o contexto
export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};