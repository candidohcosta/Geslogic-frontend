// frontend/src/components/Sidebar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom'; // 1. Importar Link e useLocation
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import { HeartPulse, Activity, List, Users, Settings, Ticket, ClipboardList, BriefcaseBusiness, SquarePlus, UserPlus, Contact, OctagonMinus, ListOrdered, Blocks, Computer, Tablet, Tv, MonitorCheck, ChartBarStacked, Star, CreditCard, UserCog, Mails, ShieldUser, Send, FileSliders, Database  } from 'lucide-react';
import { CalendarDays, CalendarRange } from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const { user } = useAuth(); // <-- ADICIONA ESTA LINHA
  const location = useLocation();
  const currentPath = location.pathname; // 4. Obter o caminho atual
  const [showCompanySubmenu, setShowCompanySubmenu] = useState(false);
  const [showEventSubmenu, setShowEventSubmenu] = useState(false); // Estado para o submenu de Eventos
  const [showTicketSubmenu, setShowTicketSubmenu] = useState(false); // Estado para o submenu de Bilhetes
  const [showSchedulingSubmenu, setShowSchedulingSubmenu] = useState(false); // Estado para o submenu de Agendamento
  const [showPlatformManagementSubmenu, setShowPlatformManagementSubmenu] = useState(false); // Estado para o submenu de Gestão da Plataforma

  // Guarda o ID do menu aberto ('platform', 'events', 'tickets', 'scheduling') ou null se tudo fechado.
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  // Função auxiliar para alternar (Se já está aberto, fecha. Se outro está aberto, troca.)
  const toggleSubmenu = (menuName: string) => {
    setOpenSubmenu(prev => prev === menuName ? null : menuName);
  };

  if (!user) {
    return null; // Não mostra nada se não houver utilizador
  }

  return (
    <nav
      className={`
        bg-gray-800 text-white flex flex-col h-[calc(100vh-4rem)] 
        overflow-y-auto shadow-lg transition-transform duration-300 ease-in-out
        
        /* Para mobile, continua a ser 'fixed' e a deslizar */
        fixed z-30 top-16 left-0
        md:relative md:top-0 md:h-full /* <-- A MUDANÇA PARA DESKTOP */

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

{/* MENU CONSOLIDADO: Gestão da Plataforma (Apenas Platform Admin) */}
{user?.role === UserRole.PLATFORM_ADMIN && (
  <li>
    <button
      onClick={() => toggleSubmenu('platform')}
      className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
        openSubmenu === 'platform' || currentPath.startsWith('/platform-admins') ? 'bg-gray-700 font-bold' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5" />
        <span>Gestão da Plataforma</span>
      </div>
      <svg
        className={`w-4 h-4 transform transition-transform duration-200 ${
          openSubmenu === 'platform' ? 'rotate-90' : ''
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
      </svg>
    </button>
    
    {openSubmenu === 'platform' && (
      <ul className="ml-4 mt-2 space-y-1 border-l-2 border-gray-600 pl-2">
        {/* 1. Administradores da Plataforma */}
        <li>
          <Link to="/platform-admins" className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/platform-admins' ? 'text-white font-bold' : 'text-gray-300'}`}>
            <ShieldUser className="w-4 h-4" /> Administradores
          </Link>
        </li>
        
        {/* 2. Empresas (Portal de Entrada para tudo o que é empresa) */}
        <li>
          <Link to="/companies/list" className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/companies/list' ? 'text-white font-bold' : 'text-gray-300'}`}>
            <BriefcaseBusiness className="w-4 h-4" /> Empresas
          </Link>
        </li>

        {/* 3. Logs de Emails */}
        <li>
          <Link to="/sent-emails-log" className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/sent-emails-log' ? 'text-white font-bold' : 'text-gray-300'}`}>
            <Send className="w-4 h-4" /> Logs de Emails
          </Link>
        </li>

        {/* 4. Logs do Sistema */}
        <li>
          <Link to="/logs" className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/logs' ? 'text-white font-bold' : 'text-gray-300'}`}>
            <FileSliders className="w-4 h-4" /> Logs do Sistema
          </Link>
        </li>

        {/* 5. Saúde do Sistema */}
        <li>
          <Link to="/system-health" className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/system-health' ? 'text-white font-bold' : 'text-gray-300'}`}>
            <HeartPulse className="w-4 h-4" /> Saúde do Sistema
          </Link>
        </li>

        {/* 3. Backups do Sistema */}
        <li>
          <Link 
            to="/backups" 
            className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
              currentPath === '/backups' ? 'text-white font-bold' : 'text-gray-300'
            }`}
          >
            <Database className="w-4 h-4" />Backups
          </Link>
        </li>

      </ul>
    )}
  </li>
)}

          {/* Menu para Platform Admin */}
{/*           {user?.role === UserRole.PLATFORM_ADMIN && (
            <>
              <li>
                <button
                  onClick={() => setShowCompanySubmenu(!showCompanySubmenu)}
                  className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                    showCompanySubmenu || currentPath.startsWith('/company') ? 'bg-gray-700 font-bold' : ''
                  }`}
                >
                <div className="flex items-center gap-2">
                    <BriefcaseBusiness className="w-5 h-5" />
                    <span>Gestão de Empresas</span>
                </div>                   
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
                  <ul className="ml-4 mt-2 space-y-1 border-l-2 border-gray-600 pl-2">
                    <li>
                      <Link
                        to="/companies/create"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/companies/create' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                        }`}
                      >
                        <SquarePlus className="w-4 h-4" />
                        Criar Empresa
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/companies/list"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/companies/list' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                        }`}
                      >
                        <List className="w-4 h-4" />
                        Listar Empresas
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/company-admins/create"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/company-admins/create' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                        }`}
                      >
                        <UserPlus className="w-4 h-4" />
                        Criar Admin
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/company-admins/list"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath.startsWith('/company-admins/list') ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        Listar Admins
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            </>
          )} */}

          {/* Menu para Company Admin */}
          {user?.role === UserRole.COMPANY_ADMIN && (
            <li>
              <Link
                to="/company-details"
                className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                  currentPath === '/company-details' ? 'bg-gray-700 text-white font-bold' : ''
                }`}
              >
                <BriefcaseBusiness className="w-4 h-4" />
                Dados da Empresa
              </Link>
            </li>            
          )}
          {user?.role === UserRole.COMPANY_ADMIN && (
            <li>
              <Link
                to="/company-payments"
                className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                  currentPath === '/company-payments' ? 'bg-gray-700 text-white font-bold' : ''
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Dados da Financeiros
              </Link>
            </li>            
          )}          
          {user?.role === UserRole.COMPANY_ADMIN && (
            <li>
              <Link
                to={`/companies/homepage/edit/${user.company?.id}`}
                className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 ${
                  location.pathname.startsWith('/companies/homepage/edit') ? 'bg-gray-700 text-white font-bold' : ''
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
          {user && (
            // 1. Platform Admin tem acesso total
            user.role === UserRole.PLATFORM_ADMIN || 
            
            // 2. Utilizadores de Empresa (Só se tiverem subscrição ativa)
            (
                user.company?.subscribedServices?.includes('EVENTS') && 
                (
                    // Pode ser o Dono da Empresa
                    user.role === UserRole.COMPANY_ADMIN ||
                    // Ou o Staff com permissão de Gestão
                    (user.role === UserRole.EVENT_STAFF && user.eventStaffDetails?.staffRole === 'MANAGEMENT')
                )
            )
          ) && (
            <li>
              <button
                onClick={() => toggleSubmenu('events')}
                className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                  openSubmenu === 'events' || currentPath.startsWith('/event') ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    <span>Gestão de Eventos</span>
                </div>                  
                <svg
                  className={`w-4 h-4 transform transition-transform duration-200 ${
                    openSubmenu === 'events' ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
              {openSubmenu === 'events' && (
                <ul className="ml-4 mt-2 space-y-1 border-l-2 border-gray-600 pl-2">
                  {/* Apenas Company Admins e Platform Admins podem criar eventos */}
                  {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link
                        to="/event-staff"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/event-staff' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                          }`}
                      >
                        <Users className="w-4 h-4" />
                        Operadores / Staff
                      </Link>
                    </li>
                  )}                  
                  {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link
                        to="/events/create"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/events/create' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                        }`}
                      >
                        <SquarePlus className="w-4 h-4" />
                        Criar Evento
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link 
                      to="/events/list"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === '/events/list' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      Listar Eventos
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/events/feedback"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === '/events/feedback' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <Star className="w-4 h-4" />
                      Auditoria de Satisfação
                    </Link>
                  </li>                  
                </ul>
              )}
            </li>
          )}



          {/* NOVO: Menu para FILAS (para Platform Admin e Company Admin) */}
          {user && (user.role === UserRole.PLATFORM_ADMIN || (user.role === UserRole.COMPANY_ADMIN && user.company?.subscribedServices?.includes('QUEUES'))) && (
            <li>
              <button
                onClick={() => toggleSubmenu('tickets')}
                className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                  openSubmenu === 'tickets' || currentPath.startsWith('/ticket') ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5" />
                    <span>Gestão de senhas</span>
                </div>                
                <svg
                  className={`w-4 h-4 transform transition-transform duration-200 ${
                    openSubmenu === 'tickets' ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
              {openSubmenu === 'tickets' && (
                <ul className="ml-4 mt-2 space-y-1 border-l-2 border-gray-600 pl-2">
                  {/* Apenas Company Admins e Platform Admins podem criar eventos */}
                  {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link
                        to="/operators"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/operators' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                          }`}
                      >
                        <Users className="w-4 h-4" />
                        Operadores
                      </Link>
                    </li>
                  )}
                  {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link
                        to="/user-types"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/user-types' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                          }`}
                      >
                        <Contact className="w-4 h-4" />
                        Tipos de Utente
                      </Link>
                    </li>
                  )}                  
                  {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link
                        to="/schedules"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/schedules' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                          }`}
                      >
                        <OctagonMinus className="w-4 h-4" />
                        Regras de Prioridade
                      </Link>
                    </li>
                  )}
                  {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link
                        to="/services"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/services' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                        }`}
                      >
                        <Blocks className="w-4 h-4" />
                        Serviços de Atendimento
                      </Link>
                    </li>
                  )}
{/*                   {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link
                        to="/user-groups"
                        className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/user-groups' ? 'bg-gray-700 font-bold' : ''
                          }`}
                      >
                        Grupos de Utentes
                      </Link>
                    </li>
                  )}   */}                 
                  {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link 
                        to="/counters"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/counters' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                        }`}
                      >
                        <Computer className="w-4 h-4" />
                        Balcões de Atendimento
                      </Link>
                    </li>
                  )}
                  {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link 
                        to="/kiosks"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/kiosks' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                        }`}
                      >
                        <Tablet className="w-4 h-4" />
                        Quiosques
                      </Link>
                    </li>
                  )}
                  {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <li>
                      <Link 
                        to="/displays"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                          currentPath === '/displays' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                        }`}
                      >
                        <Tv className="w-4 h-4" />
                        Displays
                      </Link>
                    </li>
                  )}
                  
                  <li>
                    <Link 
                      to="/operator/setup"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === '/operator/setup' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <UserCog className="w-4 h-4" />
                      Configuração de Operador
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="operator-sessions"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === 'operator-sessions' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <MonitorCheck className="w-4 h-4" />
                      Sessões Ativas de Atendimento
                    </Link>
                  </li>
                  
                  <li>
                    <Link 
                      to="devices-monitor"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === 'devices-monitor' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      Monitorização de dispositivos
                    </Link>
                  </li>

                  <li>
                    <Link to="/dashboard/queues"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === '/dashboard/queues' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <ChartBarStacked className="w-4 h-4" />
                      Estatísticas
                    </Link>
                  </li>                                     

                  <li>
                    <Link to="/feedback-auditory"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === '/feedback-auditory' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <Star className="w-4 h-4" />
                      Auditoria de Satisfação
                    </Link>
                  </li> 

                </ul>
              )}
            </li>
          )}

{/* NOVO: Menu para AGENDAMENTOS */}
          {user && (user.role === UserRole.PLATFORM_ADMIN || (user.role === UserRole.COMPANY_ADMIN && user.company?.subscribedServices?.includes('SCHEDULING'))) && (
            <li>
              <button
                onClick={() => toggleSubmenu('scheduling')} 
                className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                  openSubmenu === 'scheduling' || currentPath.startsWith('/scheduling') ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    <span>Agendamentos</span>
                </div>
                <svg
                  className={`w-4 h-4 transform transition-transform duration-200 ${
                    openSubmenu === 'scheduling' ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
              
              {openSubmenu === 'scheduling' && (
                <ul className="ml-4 mt-2 space-y-1 border-l-2 border-gray-600 pl-2">
                  
                  {/* 1. VISÃO PRINCIPAL: CALENDÁRIO */}
                  <li>
                    <Link
                      to="/scheduling/calendar"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === '/scheduling/calendar' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <CalendarRange className="w-4 h-4" />
                      Calendário Visual
                    </Link>
                  </li>

                  {/* 2. LISTA DIÁRIA */}
                  <li>
                    <Link
                      to="/scheduling/appointments"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === '/scheduling/appointments' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      Lista Diária
                    </Link>
                  </li>

                  {/* 3. CONFIGURAÇÕES (RECURSOS) */}
                  <li>
                    <Link
                      to="/scheduling/resources"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === '/scheduling/resources' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Recursos
                    </Link>
                  </li>

                  {/* 4. CONFIGURAÇÕES (PERFIS) */}
                  <li>
                    <Link
                      to="/scheduling/profiles"
                      className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                        currentPath === '/scheduling/profiles' ? 'bg-gray-700 text-white font-bold' : 'text-gray-300'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Perfis de Serviço
                    </Link>
                  </li>
                  
                  {/* 5. TESTE (Só para Platform Admin) */}
                  {user.role === UserRole.PLATFORM_ADMIN && (
                    <li>
                        <Link
                        to="/scheduling/book-test"
                        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${
                            currentPath === '/scheduling/book-test' ? 'bg-gray-700 text-white font-bold' : 'text-gray-400 italic'
                        }`}
                        >
                        Link Público (Teste)
                        </Link>
                    </li>
                  )}

                </ul>
              )}
            </li>
          )}

          {user && (user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
            <>
            <li>
              <Link 
                to="/email-templates" 
                className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 
                ${currentPath === '/email-templates' ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                    <Mails className="w-5 h-5" />
                    <span>Templates de Email</span>
                </div>                
              </Link>
            </li>
            <li>
              <Link 
                to="/policy-documents" 
                className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 
                ${currentPath === '/policy-documents' ? 'bg-gray-700 font-bold' : ''

                }`}
              >
                <div className="flex items-center gap-2">
                    <ShieldUser className="w-5 h-5" />
                    <span>Política de Privacidade</span>
                </div>                     
              </Link>
            </li>
          </>
          )}
{/*           {user?.role === UserRole.PLATFORM_ADMIN && (
            <>
              <li>
                <Link to="/sent-emails-log" className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/sent-emails-log' ? 'bg-gray-700 font-bold' : ''}`}>
                <div className="flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    <span>Logs de Mails Enviados</span>
                </div>
                </Link>
              </li>
              <li>
                <Link to="/logs" className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/logs' ? 'bg-gray-700 font-bold' : ''}`}>
                <div className="flex items-center gap-2">
                    <FileSliders className="w-5 h-5" />
                    <span>Logs do Sistema</span>
                </div>
                </Link>
              </li>
              <li>
                <Link to="/system-health" className={`flex items-center justify-between w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 ${currentPath === '/system-health' ? 'bg-gray-700 font-bold' : ''}`}>
                <div className="flex items-center gap-2">
                    <HeartPulse className="w-5 h-5" />
                    <span>Saúde do Sistema</span>
                </div>                  
                </Link>
              </li>
            </>
          )} */}

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


{user && user.role === UserRole.OPERATOR && (
  <>
    <li>
      <Link
        to="/operator/setup"
        className={`block w-full text-left py-2 px-3 rounded-md hover:bg-gray-700 ${
          currentPath.startsWith('/operator') ? 'bg-gray-700 font-bold' : ''
        }`}
      >
        Iniciar Sessão de Atendimento
      </Link>
    </li>
    {/* No futuro, podemos adicionar aqui outros links, como "Ver as Minhas Estatísticas" */}
  </>
)}



        </ul>

    </nav>
  );
};

export default Sidebar;
