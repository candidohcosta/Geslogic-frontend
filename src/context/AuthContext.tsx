// src/context/AuthContext.tsx (VERSÃO FINAL E OTIMIZADA)

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { UserData } from '../types/user';
import { logoutUser, addUnauthorizedListener, fetchUserProfile } from '../services/api';

interface AuthContextType {
  user: UserData | null;
  login: (userData: UserData) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // A função de logout continua perfeita
  const logout = useCallback(async () => {
    // A lógica interna continua a mesma
    const userIsLoggedIn = !!localStorage.getItem('user');
    if (userIsLoggedIn) {
      try { await logoutUser(); } catch (error) { console.error("Logout failed:", error); }
    }
    document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=api/auth/refresh;";

    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {

/*
    // A verificação da sessão no arranque é a "fonte da verdade"
    const postLoginUser = localStorage.getItem('post_login_user');
     if (postLoginUser) {
      // Se encontrámos estes dados, significa que acabámos de ser redirecionados.
      // Usamos estes dados para o estado inicial e limpamos o item.
      setUser(JSON.parse(postLoginUser));
      localStorage.setItem('user', postLoginUser); // Move para o item 'user' normal
      localStorage.removeItem('post_login_user');
      setIsLoading(false);
      return; // Pára a execução aqui
    } */



    const checkUserSession = async () => {
      try {
        const userData = await fetchUserProfile();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };
    checkUserSession();

    // O listener apanha os 401s que acontecem depois do arranque
    const handleUnauthorized = () => logout();
    addUnauthorizedListener(handleUnauthorized);

  }, [logout]);

  // A função de login apenas atualiza o estado. O redirecionamento é responsabilidade da UI.
  const login = (userData: UserData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = { user, login, logout, isAuthenticated: !!user, isLoading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};