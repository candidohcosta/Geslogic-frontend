// src/components/Sidebar.tsx

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';

// Ícones (não alterados)
import {
  HeartPulse, Activity, List, Users, Settings, Ticket, ClipboardList, BriefcaseBusiness,
  SquarePlus, Contact, OctagonMinus, Blocks, Computer, Tablet, Tv,
  MonitorCheck, ChartBarStacked, Star, CreditCard, UserCog, Mails, ShieldUser, Send,
  FileSliders, Database, DatabaseBackup, Files, ChevronLeft, ChevronRight
} from 'lucide-react';
import { CalendarDays, CalendarRange } from 'lucide-react';

import SidebarLink from './sidebar/SidebarLink';
import SidebarGroup from './sidebar/SidebarGroup';

// NOVO — menu declarativo + can()
import { menuSchema } from './sidebar/menuSchema';
import { can } from '../lib/authz';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  toggleSidebar,
  collapsed,
  onCollapsedChange,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const toggleSubmenu = (id: string) => {
    setOpenSubmenu(prev => (prev === id ? null : id));
  };

  // Impede cliques dentro da sidebar de fechar no mobile
  const stopBubble = (e: React.SyntheticEvent) => e.stopPropagation();

  // Breakpoint desktop/mobile
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = () => setIsDesktop(mql.matches);

    try {
      mql.addEventListener('change', handler);
    } catch {
      mql.addListener(handler);
    }

    handler();

    return () => {
      try {
        mql.removeEventListener('change', handler);
      } catch {
        mql.removeListener(handler);
      }
    };
  }, []);

  if (!user) return null;
  const u = user;

  // Mobile: labels sempre visíveis
  const effectiveCollapsed = isDesktop ? collapsed : false;
  const forceShowLabel = !isDesktop;

  const widthClass = effectiveCollapsed ? 'w-64 md:w-16' : 'w-64 md:w-64';

  const handleNavigateMobile = () => {
    if (!isDesktop && isSidebarOpen) toggleSidebar();
  };

  return (
    <nav
      className={`
        bg-gray-900 text-gray-200 flex flex-col h-[calc(100vh-4rem)]
        overflow-y-auto overflow-x-hidden overscroll-contain shadow-xl border-r border-gray-800
        transition-transform duration-300 ease-in-out

        fixed z-50 top-16 left-0
        md:relative md:top-0 md:h-full md:z-auto

        ${widthClass} p-3 md:p-4

        md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      aria-label="Navegação lateral"
      onClick={stopBubble}
      onTouchStart={stopBubble}
    >

      {/* TOP BAR: Collapse (desktop) + Fechar (mobile) */}
      <div className="flex items-center justify-between gap-2">

        {/* Collapse desktop */}
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label={collapsed ? 'Expandir sidebar' : 'Compactar sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* Fechar menu mobile */}
        <button
          onClick={toggleSidebar}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ml-auto"
          aria-label={isSidebarOpen ? "Fechar Menu" : "Abrir Menu"}
        >
          {isSidebarOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          )}
        </button>

      </div>

      {/* MENU (agora totalmente declarativo) */}
      <ul className="space-y-1 mt-2 min-w-0">

        {menuSchema.map(group => {
          // Filtrar itens do grupo usando can()
          const visibleItems = group.items.filter(item =>
            !item.features || item.features.every(f => can(u, f as any))
          );
          if (visibleItems.length === 0) return null;

          // 🔹 Se for 'direct' e só tiver 1 item visível → renderiza atalho direto (sem SidebarGroup)
          const isDirect = group.direct && visibleItems.length === 1;

          if (isDirect) {
            const item = visibleItems[0];
            return (
              <li key={`direct-${group.id}`} className="min-w-0">
                <SidebarLink
                  to={item.to}
                  active={currentPath === item.to}
                  collapsed={effectiveCollapsed}
                  forceShowLabel={forceShowLabel}
                  onNavigate={handleNavigateMobile}
                  icon={item.icon ?? group.icon}
                >
                  {item.label}
                </SidebarLink>
              </li>
            );
          }

          // 🔹 Caso normal → renderiza grupo com submenu
          return (
            <SidebarGroup
              key={group.id}
              id={group.id}
              title={group.title}
              icon={group.icon}
              isOpen={openSubmenu === group.id}
              onToggle={toggleSubmenu}
              active={currentPath.startsWith(`/${group.id}`)}
              collapsed={effectiveCollapsed}
              forceShowLabel={forceShowLabel}
              hasChildren={visibleItems.length > 1}
              onNavigateChild={handleNavigateMobile}
            >
              {visibleItems.map(item => (
                <li key={item.to} className="min-w-0">
                  <SidebarLink
                    to={item.to}
                    active={currentPath === item.to}
                    collapsed={effectiveCollapsed}
                    forceShowLabel={forceShowLabel}
                    onNavigate={handleNavigateMobile}
                    icon={item.icon}
                  >
                    {item.label}
                  </SidebarLink>
                </li>
              ))}
            </SidebarGroup>
          );
        })}

      </ul>
    </nav>
  );
};

export default Sidebar;