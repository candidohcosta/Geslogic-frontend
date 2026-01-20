import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const SecurityGuard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Se não está logado, deixa o Router normal lidar com isso (ou redireciona para login)
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. PRISÃO DE SEGURANÇA
  // Se precisa de setup E não está na página de setup -> Força Setup
  if (user.is2FASetupRequired && location.pathname !== '/setup-required') {
    return <Navigate to="/setup-required" replace />;
  }

  // 3. SEGURANÇA INVERSA
  // Se JÁ TEM tudo configurado mas tenta ir à página de setup -> Manda para Dashboard
  if (!user.is2FASetupRequired && location.pathname === '/setup-required') {
     return <Navigate to="/dashboard" replace />;
  }

  // 4. Tudo ok, renderiza a rota filha
  return <Outlet />;
};