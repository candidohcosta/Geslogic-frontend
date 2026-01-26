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
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // 4. EFFECTS (A TUA LÓGICA ORIGINAL)
  useEffect(() => {
    const checkUserSession = async () => {
      // REGRA DE OURO: Se o estado já tem um utilizador (acabou de fazer login),
      // não precisamos de validar o perfil imediatamente.
      if (user) {
        setIsLoading(false);
        return;
      }

      // Se não há user no estado, mas há no localStorage, tentamos validar
      try {
        const userData = await fetchUserProfile();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        // Só limpamos se o erro for realmente de falta de autenticação
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };
    checkUserSession();

    // O listener apanha os 401s que acontecem depois do arranque (Interceptor)
    const handleUnauthorized = () => logout();
    addUnauthorizedListener(handleUnauthorized);

  }, [logout]); // Removido o 'user' das dependências para evitar loops

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