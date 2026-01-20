// src/context/CompanyContext.tsx

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { getCompanySlugFromHostname } from '../lib/routing';

interface SubdomainContextType {
  companySlug: string | null;
}

const SubdomainContext = createContext<SubdomainContextType | undefined>(undefined);

export const SubdomainProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Analisamos o hostname APENAS UMA VEZ, quando o provider é criado.
  const [companySlug] = useState(() => getCompanySlugFromHostname(window.location.hostname));

  // useMemo garante que o objeto de valor só é recriado se o slug mudar (o que não irá acontecer).
  const value = useMemo(() => ({ companySlug }), [companySlug]);

  return (
    <SubdomainContext.Provider value={value}>
      {children}
    </SubdomainContext.Provider>
  );
};

// Hook personalizado para usar o contexto
export const useSubdomain = () => {
  const context = useContext(SubdomainContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};