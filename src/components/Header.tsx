//frontend/src/components/Header.tsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation  } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  User as UserIcon, 
  Menu, 
  Settings, 
  KeyRound, 
  ChevronDown 
} from 'lucide-react';
import { Button } from './ui/Button';
import NotificationBell from '../context/NotificationBell';
import SupportBell from './support/SupportBell'; 

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estado para o Menu de Utilizador
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm fixed w-full z-40 h-16">
      {/* <div className="container mx-auto px-4 h-full flex items-center justify-between"> */}
      <div className="w-full px-4 h-full flex items-center justify-between">
        
        {/* --- LADO ESQUERDO: LOGO E MENU HAMBURGUER --- */}
        <div className="flex items-center gap-4">
          {user && (
            <button 
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-md hover:bg-gray-100 text-gray-600"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
          
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <span className="text-xl font-bold text-primary">GesLogic</span>
            </div>
          </Link>
        </div>

        {/* --- LADO DIREITO: UTILIZADOR E AÇÕES --- */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {user ? (
            <>
              {/* 1. NOTIFICAÇÕES Gerais  */}
              <NotificationBell />

              {/* NOVO: Notificações de Suporte */}
              <SupportBell />              
              
              <div className="h-6 w-px bg-gray-200 hidden md:block mx-2"></div>

              {/* 2. MENU DE UTILIZADOR (RECUPERADO) */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Impede eventos fantasma
                    setIsUserMenuOpen(!isUserMenuOpen);
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                    <div className="bg-gray-100 p-1.5 rounded-full">
                        <UserIcon className="h-5 w-5 text-gray-700" />
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[150px] truncate">
                        {user.firstName}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {/* O DROPDOWN */}
                {isUserMenuOpen && (
                  <>
                    {/* Overlay invisível para fechar ao clicar fora */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                    
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-xl border border-gray-200 z-50 overflow-hidden py-1">
                        
                        <div className="px-4 py-2 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>

                        <Link 
                            to="/edit-profile" 
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                        >
                            <Settings className="h-4 w-4" /> Editar Perfil
                        </Link>

                        <Link 
                            to="/change-password" 
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                        >
                            <KeyRound className="h-4 w-4" /> Mudar Senha
                        </Link>

                        <div className="border-t border-gray-100 my-1"></div>

                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                        >
                            <LogOut className="h-4 w-4" /> Sair
                        </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            // Visitante
            <div className="flex gap-2">
              <Link to="/login"><Button variant="ghost">Entrar</Button></Link>
              <Link to="/register"><Button>Registar</Button></Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;