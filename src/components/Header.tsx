// frontend/src/components/Header.tsx
import React, { useState } from 'react';
import { UserData } from '../types/user'; // Importar UserData

interface HeaderProps {
  user: UserData | null;
  onLogout: () => void;
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
  onNavigateToLanding: () => void;
  onNavigateToEditProfile: () => void;
  onNavigateToCompanyDetails: () => void;
  // REMOVIDO: onToggleSidebar e isSidebarOpen não são mais passados para o Header
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onSwitchToLogin, onSwitchToRegister, onNavigateToLanding, onNavigateToEditProfile, onNavigateToCompanyDetails }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogoutClick = () => {
    onLogout();
    setShowDropdown(false);
  };

  const handleEditProfileClick = () => {
    onNavigateToEditProfile();
    setShowDropdown(false);
  };

  const handleCompanyDetailsClick = () => {
    onNavigateToCompanyDetails();
    setShowDropdown(false);
  };

  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center fixed w-full top-0 z-10">
      {/* REMOVIDO: Botão de Toggle da Sidebar */}
      
      {/* Logotipo e Nome - CLICÁVEIS para ir para a Landing Page */}
      <div className="flex items-center cursor-pointer" onClick={onNavigateToLanding}>
        <img src="https://placehold.co/40x40/4f46e5/ffffff?text=Logo" alt="Logotipo GesLogic" className="h-10 w-10 rounded-md mr-2" />
        <span className="text-xl font-bold text-gray-800">GesLogic</span>
      </div>

      {/* Botões de Login/Registar ou Informação do Utilizador */}
      <nav>
        {user ? (
          <div className="flex items-center space-x-4 relative">
            {/* Nome do utilizador clicável para abrir o dropdown */}
            <button
              onClick={toggleDropdown}
              className="text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Olá, {user.firstName}!
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                <button
                  onClick={handleEditProfileClick}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Editar Perfil
                </button>
                {user.role === 'COMPANY_ADMIN' && (
                  <button
                    onClick={handleCompanyDetailsClick}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Dados da Empresa
                  </button>
                )}
                <button
                  onClick={handleLogoutClick}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex space-x-4">
            <button
              onClick={onSwitchToLogin}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Login
            </button>
            <button
              onClick={onSwitchToRegister}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Registar
            </button>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
