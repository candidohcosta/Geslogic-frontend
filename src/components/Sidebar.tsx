// frontend/src/components/Sidebar.tsx
import React, { useState } from 'react';
import { UserData } from '../types/user';

interface SidebarProps {
  user: UserData | null;
  currentView: string; // Para destacar o item de menu ativo
  onNavigateToDashboard: () => void;
  onNavigateToCreateCompany: () => void;
  onNavigateToCreateCompanyAdmin: () => void;
  onNavigateToListCompanies: () => void;
  onNavigateToListCompanyAdmins: () => void;
  isSidebarOpen: boolean; // Para controlar a visibilidade da sidebar (agora sempre true para PLATFORM_ADMIN)
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentView,
  onNavigateToDashboard,
  onNavigateToCreateCompany,
  onNavigateToCreateCompanyAdmin,
  onNavigateToListCompanies,
  onNavigateToListCompanyAdmins,
  isSidebarOpen, // Mantido por compatibilidade, mas a lógica de renderização é no App.tsx
}) => {
  const [showCompanySubmenu, setShowCompanySubmenu] = useState(false);

  // A sidebar é visível apenas para Platform Admins e se isSidebarOpen (que será sempre true para eles)
  if (!user || user.role !== 'PLATFORM_ADMIN' || !isSidebarOpen) {
    return null;
  }

  return (
    // REMOVIDO: fixed, h-full, top-16, left-0, z-10
    // A sidebar agora é um item flex no layout principal do App.tsx
    <nav className="w-64 bg-gray-800 text-white p-4 flex-shrink-0 overflow-y-auto shadow-lg">
      <ul className="space-y-2">
        <li>
          <button
            onClick={() => {
              onNavigateToDashboard();
              setShowCompanySubmenu(false); // Fechar submenu ao ir para o dashboard
            }}
            className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
              currentView === 'dashboard' ? 'bg-gray-700 font-bold' : ''
            }`}
          >
            Dashboard
          </button>
        </li>
        <li>
          <button
            onClick={() => setShowCompanySubmenu(!showCompanySubmenu)}
            className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 flex justify-between items-center ${
              showCompanySubmenu ? 'bg-gray-700 font-bold' : ''
            }`}
          >
            Empresa
            <span className="ml-2">{showCompanySubmenu ? '▲' : '▼'}</span>
          </button>
          {showCompanySubmenu && (
            <ul className="ml-4 mt-1 space-y-1">
              <li>
                <button
                  onClick={onNavigateToCreateCompany}
                  className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                    currentView === 'createCompany' ? 'bg-gray-700 font-bold' : ''
                  }`}
                >
                  Criar Empresa
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToCreateCompanyAdmin}
                  className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                    currentView === 'createCompanyAdmin' ? 'bg-gray-700 font-bold' : ''
                  }`}
                >
                  Criar Company Admin
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToListCompanies}
                  className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                    currentView === 'listCompanies' ? 'bg-gray-700 font-bold' : ''
                  }`}
                >
                  Listar Empresas
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToListCompanyAdmins}
                  className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                    currentView === 'listCompanyAdmins' ? 'bg-gray-700 font-bold' : ''
                  }`}
                >
                  Listar Company Admins
                </button>
              </li>
            </ul>
          )}
        </li>
        {/* Adicione mais itens de menu aqui, se necessário */}
      </ul>
    </nav>
  );
};

export default Sidebar;
