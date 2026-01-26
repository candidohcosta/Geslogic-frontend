// src/context/AuthContext.tsx (VERSÃO FINAL E CONSOLIDADA)

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { UserData } from '../types/user';
import { logoutUser, addUnauthorizedListener, fetchUserProfile } from '../services/api';

interface AuthContextType {
  user: UserData | null;
  login: (userData: UserData) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  // ADICIONADO: Necessário para o componente TwoFactorSetup atualizar o estado
  refreshProfile: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. HIDRATAÇÃO: Lê o localStorage imediatamente ao nascer
  const [user, setUser] = useState<UserData | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 2. LOADING INTELIGENTE: Se já temos user no disco, não precisamos de travar a UI
  const [isLoading, setIsLoading] = useState(!localStorage.getItem('user'));

  // 1. LOGOUT (A TUA LÓGICA ORIGINAL)
  const logout = useCallback(async () => {
    const userIsLoggedIn = !!localStorage.getItem('user');
    if (userIsLoggedIn) {
      try { await logoutUser(); } catch (error) { console.error("Logout failed:", error); }
    }
    // Limpeza manual de cookies (Belt and Suspenders approach)
    document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=auth/refresh;";

    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // 2. LOGIN (A TUA LÓGICA ORIGINAL)
  const login = (userData: UserData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // 3. REFRESH PROFILE (NOVA FUNCIONALIDADE)
  // Permite recarregar os dados do utilizador (ex: flags 2FA) sem fazer F5
  const refreshProfile = useCallback(async () => {
    try {
      const userData = await fetchUserProfile();
      // Atualizamos o estado e o localStorage para manter coerência
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      // Opcional: Se falhar a atualização do perfil (token inválido), 
      // podemos não fazer nada ou fazer logout. 
      // Por segurança, deixamos quieto para não interromper a UX se for só uma falha de rede.
    }
  }, []);

  // 3. VALIDAÇÃO DE BACKGROUND (Meticulosa)
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const userData = await fetchUserProfile();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        // *** CRÍTICO: Se a API falhar (ex: timing do cookie no VPS), 
        // NÃO limpamos o utilizador se ele existir no localStorage.
        // Damos o benefício da dúvida para evitar o loop de redirecionamento.
        if (!localStorage.getItem('user')) {
          setUser(null);
        }
        console.warn("Aviso: Validação em background falhou.");
      } finally {
        setIsLoading(false);
      }
    };

    checkUserSession();

    const handleUnauthorized = () => logout();
    addUnauthorizedListener(handleUnauthorized);

  }, [logout]);

  const value = { 
    user, 
    login, 
    logout, 
    isAuthenticated: !!user, 
    isLoading,
    refreshProfile // Exportamos a nova função
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};