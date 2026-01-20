// src/pages/OperatorRouteHandler.tsx (VERSÃO FINAL E CORRIGIDA)

import React from 'react';
import { useOperatorSession } from '../context/OperatorSessionContext';

// Importamos os componentes das páginas que queremos renderizar
import OperatorDashboard from './OperatorDashboard';
import OperatorSetupPage from './OperatorSetupPage';

const OperatorRouteHandler: React.FC = () => {
  const { sessionId, isLoadingSession } = useOperatorSession();

  // Enquanto a sessão está a ser verificada, mostramos um loader
  if (isLoadingSession) {
    return <div className="p-6 text-center">A verificar sessão de operador...</div>;
  }

  // Se já houver uma sessão, renderizamos o Dashboard do Operador
  if (sessionId) {
    return <OperatorDashboard />;
  } 
  
  // Se não houver sessão, renderizamos a página de Setup
  return <OperatorSetupPage />;
};

export default OperatorRouteHandler;