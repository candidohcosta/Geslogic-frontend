// frontend/src/components/Header.tsx (VERSÃO FINAL COM useAuth)

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // 1. Importar o nosso hook useAuth
import { UserRole } from '../types/user';

interface HeaderProps {
  onMenuClick: () => void; // A nova prop que recebe do AppLayout
}

// 2. A interface de props agora está VAZIA!
const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // 3. Usar o hook para obter o 'user' e a função 'logout'

  // O resto do teu código (lógica do dropdown) continua perfeito
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    logout(); // 4. Usar a função 'logout' do nosso contexto
    setShowDropdown(false);
    navigate('/'); // Redireciona para a página inicial
  };

  return (
  <header className="bg-white shadow-sm p-4 flex justify-between items-center fixed w-full top-0 z-50">
    {/* -- GRUPO DA ESQUERDA: Botão de Menu + Logo -- */}
    <div className="flex items-center">
      
      {/* 1. O NOVO BOTÃO HAMBÚRGUER */}
      {/* Ele só aparece se o utilizador estiver logado, e desaparece em ecrãs médios e maiores (md:hidden) */}
      {user && (
        <button
          onClick={onMenuClick} // Chama a função do AppLayout para abrir a sidebar
          className="mr-2 p-2 md:hidden"
          aria-label="Abrir menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      )}

      {/* O teu logo (continua igual) */}
      <Link to={user ? "/dashboard" : "/"} className="flex items-center">
        <img src="https://placehold.co/40x40/4f46e5/ffffff?text=Logo" alt="Logotipo GesLogic" className="h-10 w-10 rounded-md mr-2" />
        <span className="text-xl font-bold text-gray-800">GesLogic</span>
      </Link>
    </div>
      <nav>
        {user ? (
          <div className="flex items-center space-x-4 relative" ref={dropdownRef}>
            <button onClick={() => setShowDropdown(!showDropdown)} className="text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Olá, {user.firstName}!
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                <Link to="/edit-profile" onClick={() => setShowDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Editar Perfil</Link>
                {user.role === UserRole.COMPANY_ADMIN && (
                  <Link to="/company-details" onClick={() => setShowDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Dados da Empresa</Link>
                )}
                {user.role === UserRole.PARTICIPANT && (
                  <Link to="/my-registrations" onClick={() => setShowDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    As Minhas Inscrições
                  </Link>
                )}
                <Link to="/change-password" onClick={() => setShowDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Alterar Palavra-passe</Link>
                <button onClick={handleLogoutClick} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Sair</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex space-x-4">
            <Link to="/login" className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Login</Link>
            <Link to="/register" className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Registar</Link>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
