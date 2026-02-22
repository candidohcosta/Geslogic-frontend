// src/context/OperatorSessionContext.tsx

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchMyActiveSession } from '../services/api';

interface SessionStartData {
  id: string;
  // Podes adicionar mais campos aqui se necessário
}

// 1. ATUALIZAR A INTERFACE
interface OperatorSessionContextType {
  sessionId: string | null;
  currentTicket: any | null;
  sessionDetails: any | null;
  isLoadingSession: boolean;
  startSession: (sessionData: SessionStartData) => void;
  endSession: () => void;
  setCurrentTicket: (ticket: any | null) => void;
  refetchSession: () => void; // <--- ADICIONADO: Essencial para limpar sessões zombie
}

interface ActiveSessionData {
  session: any;
  currentTicket: any | null;
}

const OperatorSessionContext = createContext<OperatorSessionContextType | undefined>(undefined);

export const OperatorSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  // Estados Locais
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTicket, setCurrentTicket] = useState<any | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any | null>(null);

  // 2. QUERY AUTOMÁTICA
  // Corre automaticamente quando o user está autenticado
  const { 
    data, 
    isLoading: isLoadingSession, 
    refetch: refetchSession // <--- Capturamos a função refetch e damos-lhe o nome refetchSession
  } = useQuery<ActiveSessionData | null, Error>({
    queryKey: ['myActiveSession'],
    queryFn: fetchMyActiveSession,
    enabled: isAuthenticated, // Só corre se estiver logado
    refetchOnWindowFocus: true, // Garante dados frescos se mudares de aba
    retry: false,
  });

  // 3. SINCRONIZAÇÃO (Backend -> Estado Local)
  useEffect(() => {
    // Se a query terminou de carregar...
    if (!isLoadingSession) {
        if (data && data.session) {
            // Se o backend diz que há sessão, atualizamos o estado
            setSessionId(data.session.id);
            setSessionDetails(data.session);
            setCurrentTicket(data.currentTicket);
        } else {
            // Se o backend diz que NÃO há sessão (null), limpamos o estado
            setSessionId(null);
            setSessionDetails(null);
            setCurrentTicket(null);
        }
    }
  }, [data, isLoadingSession]);

  // A) Responder ao "force close" em tempo real
  useEffect(() => {
    const onForceClosed = () => {
      setSessionId(null);
      setSessionDetails(null);
      setCurrentTicket(null);
      try { sessionStorage.removeItem('operatorSessionId'); } catch {}
      try { refetchSession(); } catch {}
    };
    window.addEventListener('operator:forceClosed', onForceClosed);
    return () => window.removeEventListener('operator:forceClosed', onForceClosed);
  }, [refetchSession]);

  // B) Fallback: revalidar periodicamente e ao focar a janela
  useEffect(() => {
    const t = setInterval(() => { try { refetchSession(); } catch {} }, 15000);
    const onFocus = () => { try { refetchSession(); } catch {} };
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [refetchSession]);


  // Ações Manuais (para otimismo na UI)
  const startSession = (sessionData: SessionStartData) => {
    setSessionId(sessionData.id);
    setSessionDetails(sessionData);
  };

  const endSession = () => {
    setSessionId(null);
    setSessionDetails(null);
    setCurrentTicket(null);
  };

  const value = {
    sessionId,
    currentTicket,
    sessionDetails,
    isLoadingSession,
    startSession,
    endSession,
    setCurrentTicket,
    refetchSession, // <--- EXPOSTO AQUI
  };

  return (
    <OperatorSessionContext.Provider value={value}>
      {children}
    </OperatorSessionContext.Provider>
  );
};

// Hook personalizado
export const useOperatorSession = () => {
  const context = useContext(OperatorSessionContext);
  if (!context) throw new Error('useOperatorSession must be used within an OperatorSessionProvider');
  return context;
};