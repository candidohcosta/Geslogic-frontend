// frontend/src/pages/OperatorIndexRedirect.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useOperatorSession } from '../context/OperatorSessionContext';

const OperatorIndexRedirect: React.FC = () => {
  const { sessionId, isLoadingSession } = useOperatorSession();

  if (isLoadingSession) {
    return <div className="p-6 text-center">A verificar sessão de operador…</div>;
  }

  // Se há sessão → vai para o posto (dashboard de funcionamento)
  // Senão → vai para a configuração para iniciar sessão
  return (
    <Navigate
      to={sessionId ? '/operator/dashboard' : '/operator/setup'}
      replace
    />
  );
};

export default OperatorIndexRedirect;