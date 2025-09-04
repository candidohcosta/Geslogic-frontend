// frontend/src/components/Sidebar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom'; // 1. Importar Link e useLocation
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import { HeartPulse } from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const { user } = useAuth(); // <-- ADICIONA ESTA LINHA
  const location = useLocation();
  const currentPath = location.pathname; // 4. Obter o caminho atual
  const [showCompanySubmenu, setShowCompanySubmenu] = useState(false);
  const [showEventSubmenu, setShowEventSubmenu] = useState(false); // NOVO: Estado para o submenu de Eventos

  if (!user) {
    return null; // Não mostra nada se não houver utilizador
  }

  return (
    <nav
      className={`
        bg-gray-800 text-white flex flex-col h-full
        overflow-y-auto shadow-lg transition-transform duration-300 ease-in-out
        
        /* Para mobile, continua a ser 'fixed' e a deslizar */
        fixed z-40 top-16 left-0
        md:relative md:top-0 /* <-- A MUDANÇA PARA DESKTOP */

        w-64 p-4
        
        md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Container para o botão de alternância */}
      {/* CORREÇÃO: Alinhar à esquerda quando aberta, centrar quando fechada */}
      <div className={`flex justify-end md:hidden`}>
        <button
          onClick={toggleSidebar}
          className={`p-2 text-gray-400 hover:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          aria-label={isSidebarOpen ? "Fechar Menu" : "Abrir Menu"}
        >
          {isSidebarOpen ? (
            // Ícone de fechar (X) ou seta para a esquerda
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          ) : (
            // Ícone de menu (hambúrguer)
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          )}
        </button>
      </div>

      {/* Conteúdo do menu, visível apenas quando a sidebar está aberta */}

        <ul className="space-y-2"> {/* Removido mt-12, pois o container do botão já providencia o espaçamento */}
          <li>
            <Link
              to="/dashboard"
              className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                currentPath === '/dashboard' ? 'bg-gray-700 font-bold' : ''
              }`}
            >
              Dashboard
            </Link>
          </li>

          {/* Menu para Platform Admin */}
          {user?.role === UserRole.PLATFORM_ADMIN && (
            <>
              <li>
                <button
                  onClick={() => setShowCompanySubmenu(!showCompanySubmenu)}
                  className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                    showCompanySubmenu || currentPath.startsWith('/company') ? 'bg-gray-700 font-bold' : ''
                  }`}
                >
                  Gestão de Empresas
                  <svg
                    className={`w-4 h-4 transform transition-transform duration-200 ${
                      showCompanySubmenu ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
                {showCompanySubmenu && (
                  <ul className="ml-4 mt-2 space-y-1">
                    <li>
                      <Link
                        to="/companies/create"
                        className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/companies/create' ? 'bg-gray-700 font-bold' : ''
                        }`}
                      >
                        Criar Empresa
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/companies/list"
                        className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/companies/list' ? 'bg-gray-700 font-bold' : ''
                        }`}
                      >
                        Listar Empresas
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/company-admins/create"
                        className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/company-admins/create' ? 'bg-gray-700 font-bold' : ''
                        }`}
                      >
                        Criar Company Admin
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/company-admins/list"
                        className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath.startsWith('/company-admins/list') ? 'bg-gray-700 font-bold' : ''
                        }`}
                      >
                        Listar Company Admins
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            </>
          )}

          {/* Menu para Company Admin */}
          {user?.role === UserRole.COMPANY_ADMIN && (
            <li>
              <Link
                to="/company-details"
                className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                  currentPath === '/company-details' ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                Dados da Empresa
              </Link>
            </li>
          )}
          {user?.role === UserRole.COMPANY_ADMIN && (
            <li>
              <Link
                to={`/companies/homepage/edit/${user.companyId}`}
                className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 ${
                  location.pathname.startsWith('/companies/homepage/edit') ? 'bg-gray-700' : ''
                }`}
              >
                Personalizar Página
              </Link>
            </li>
          )}
          {/* Adicionar item "Listar Company Admins" para Company Admins */}
          {(user?.role === UserRole.COMPANY_ADMIN) && (
            <li>
              <Link
                to="/company-admins/list"
                className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                  currentPath === '/company-admins/list' ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                Listar Company Admins
              </Link>
            </li>
          )}






          {/* NOVO: Menu para Eventos (para Platform Admin e Company Admin) */}
          {user && (user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
            <li>
              <button
                onClick={() => setShowEventSubmenu(!showEventSubmenu)}
                className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                  showEventSubmenu || currentPath.startsWith('/event') ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                Gestão de Eventos
                <svg
                  className={`w-4 h-4 transform transition-transform duration-200 ${
                    showEventSubmenu ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
              {showEventSubmenu && (
                <ul className="ml-4 mt-2 space-y-1">
                  {/* Apenas Company Admins e Platform Admins podem criar eventos */}
                  {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link
                        to="/events/create"
                        className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/events/create' ? 'bg-gray-700 font-bold' : ''
                        }`}
                      >
                        Criar Evento
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link 
                      to="/events/list"
                      className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === '/events/list' ? 'bg-gray-700 font-bold' : ''
                      }`}
                    >
                      Listar Eventos
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          )}

          {user && (user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
            <li>
              <Link to="/email-templates" className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/email-templates' ? 'bg-gray-700 font-bold' : ''}`}>
                Templates de Email
              </Link>
            </li>
          )}
          {user?.role === UserRole.PLATFORM_ADMIN && (
            <>
              <li>
                <Link to="/sent-emails-log" className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/sent-emails-log' ? 'bg-gray-700 font-bold' : ''}`}>
                  Logs de Emails Enviados
                </Link>
              </li>
              <li>
                <Link to="/logs" className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/logs' ? 'bg-gray-700 font-bold' : ''}`}>
                  Logs do Sistema
                </Link>
              </li>
              <li>
                <Link to="/app/system-health" className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/app/system-health' ? 'bg-gray-700 font-bold' : ''}`}>
                  {/* <HeartPulse className="mr-2 h-4 w-4" /> */}
                  <span>Saúde do Sistema</span>
                </Link>
              </li>
            </>
          )}

          {/* Item de menu para Participantes (apenas para o papel de Participante) */}
          {user?.role === UserRole.PARTICIPANT && (
            <li>
              <Link
                to="/events/list"
                className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                  currentPath === '/events/list' ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                Meus Eventos
              </Link>
            </li>
          )}
          {/* Adicione mais itens de menu aqui, se necessário */}
        </ul>

    </nav>
  );
};

export default Sidebar;
