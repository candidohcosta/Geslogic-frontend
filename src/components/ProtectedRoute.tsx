// frontend/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Verificação Básica: Está Logado?
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. NOVA VERIFICAÇÃO: Precisa de Setup de 2FA?
  // Se precisa de setup E tenta ir a qualquer lado que não seja a página de setup...
  if (user.is2FASetupRequired && location.pathname !== '/setup-required') {
    // ...Manda para a prisão!
    return <Navigate to="/setup-required" replace />;
  }

  // 3. Verificação Inversa (UX)
  // Se JÁ TEM tudo configurado mas tenta ir à página de setup sem querer...
  if (!user.is2FASetupRequired && location.pathname === '/setup-required') {
     return <Navigate to="/dashboard" replace />;
  }

  // 4. Caminho Livre
  return <Outlet />;
};

export default ProtectedRoute;