// frontend/src/components/Sidebar.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Componentes existentes
import SidebarLink from './sidebar/SidebarLink';
import SidebarGroup from './sidebar/SidebarGroup';

// API menus dinâmicos
import { useQuery } from '@tanstack/react-query';
import {
  getPlatformMenus,
  getPlatformSidebarConfig,
  getPlatformSidebarTheme, // <-- NOVO
} from '../services/api';

// Builder + transformador
import { buildSidebar } from '../lib/buildSidebar';
import { transformMenuForClassicSidebar } from '../lib/transformMenuForClassicSidebar';

// Conversor de string->icone lucide
import { mapIcon } from '../lib/mapIcon';

// Tipos
import type { PlatformSettings } from '../types/platformSettings';
import type { Role } from '../types/platformSettings';
import { Circle } from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
}

function filterMenuForUser(menu: any[], user: any): any[] {
  const grants: string[] = user?.grants ?? [];
  const role: string = user?.role ?? "";
  const roles: string = Array.isArray(user?.roles)
    ? user.roles[0]
    : user.roles ?? "";
  const subscribed = new Set(user?.company?.subscribedServices ?? []);

console.log("Filtering menu for user with role:", role, "With roles:", roles, "grants:", grants, "subscribed services:", subscribed);
console.log("Original menu before filtering:", menu);

/*   const isPlatformAdmin =
    role === "PLATFORM_ADMIN" ||
    roles === "PLATFORM_ADMIN_SUPER_ADMIN"; */
  const isPlatformAdmin = user?.effectiveRole === "PLATFORM_ADMIN" || user?.isSuperAdmin;
  const effectiveRole: string = user?.effectiveRole ?? "";

  function hasAllGrants(required?: string[]): boolean {
    if (!required || required.length === 0) return true;
    return required.every((g) => grants.includes(g));
  }

  function canSeeByRole(visibleForRoles?: string[]): boolean {
    if (isPlatformAdmin) return true;
    if (!visibleForRoles || visibleForRoles.length === 0) 
      return true;
    return visibleForRoles.includes(effectiveRole);
  }

  function filterItem(item: any): any | null {
    console.log("Checking original menu itens:", item);
    // 1) Filtrar por role
    if (!canSeeByRole(item.visibleForRoles)) return null;

    // 2) Filtrar por serviço subscrito — APENAS se houver anotação
    if (item.requiredService) {
      // Platform Admins ignoram subscrições
      if (!isPlatformAdmin) {
        if (!subscribed.has(item.requiredService)) {
          return null;
        }
      }
    }

console.log("Checking 1:", item);

    // 3) Filtrar por grants — APENAS se houver anotação
    if (!hasAllGrants(item.requiredGrants)) return null;

console.log("Checking 2:", item);

    // 4) Filtrar recursivamente os filhos
    let originalChildren: any[] = Array.isArray(item.items) ? item.items : [];
    let filteredChildren: any[] = [];

console.log("Checking 3:", item);

    if (originalChildren.length) {
      filteredChildren = originalChildren
        .map(filterItem)
        .filter((c: any) => c !== null);
    }

console.log("Checking 4:", item);

    // 5) Regra profissional para grupos:
    // Só remover pais que NUNCA tiveram filhos (desde o JSON original)
    const hadChildrenOriginally = originalChildren.length > 0;

    if (!item.to && !hadChildrenOriginally) {
      // Menu "órfão" sem path real e que nunca foi grupo → remover
 //     return null;
    }

console.log("Checking filter menu itens:", item);

    // Se chegou até aqui, devolve o item com os filhos filtrados
    return { ...item, items: filteredChildren };
  }

console.log("Original menu after filtering:", menu);

  return menu
    .map(filterItem)
    .filter((item): item is any => item !== null);
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

  const toggleSubmenu = (id: string) =>
    setOpenSubmenu((prev) => (prev === id ? null : id));

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

  // ❗❗ Não podemos fazer "if (!user) return null" — causa hooks conditionais
  const userLoaded = !!user;

  const effectiveCollapsed = isDesktop ? collapsed : false;
  const forceShowLabel = !isDesktop;

  // Mantém o teu comportamento atual de largura por classes utilitárias
  const widthClass = effectiveCollapsed ? 'w-64 md:w-16' : 'w-64 md:w-64';

  const handleNavigateMobile = () => {
    if (!isDesktop && isSidebarOpen) toggleSidebar();
  };

  // ==============================
  // MENUS DINÂMICOS
  // ==============================
  const { data: menusData } = useQuery({
    queryKey: ['platform-settings', 'menus'],
    queryFn: getPlatformMenus,
    staleTime: 30000,
    enabled: userLoaded, // evita correr hook sem user
  });

console.log("MENU RECEBIDO:", menusData?.sidebar);

const built = useMemo(() => {
  if (!menusData?.sidebar || !userLoaded) return [];

  const raw = buildSidebar(
    {
      menus: menusData,
      featureFlags: {},
    },
    {
      role: user?.role as Role,
      twoFAEnabled: user?.isTwoFactorEnabled ?? false,
      grants: user?.grants ?? [],
      isElectron: false,
      isAuthenticated: !!user,
    }
  );

console.log("BUILD SIDEBAR RESULT:", raw);

  return filterMenuForUser(raw, user);
}, [menusData, user, userLoaded]);

  const classicMenu = useMemo(() => {
    if (!userLoaded) return [];
    return transformMenuForClassicSidebar(built);
  }, [built, userLoaded]);

  // adapter icons (string -> componente)
  const iconAdapter = (iconName?: string | null) => {
    const Fallback = Circle;

    return ((props: React.SVGProps<SVGSVGElement>) => {
      const Resolved = mapIcon(iconName || '');
      if (!Resolved) return <Fallback {...props} className={props.className} />;
      return React.cloneElement(Resolved, { ...props, className: props.className });
    }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };

  // ==============================
  // SIDEBAR CONFIG (estilo/width) + THEME CUSTOM (cores)
  // ==============================
  const { data: sidebarCfgData } = useQuery({
    queryKey: ['platform-settings', 'sidebar-config'],
    queryFn: getPlatformSidebarConfig,
    staleTime: 30000,
    enabled: userLoaded,
  });

  const { data: sidebarTheme } = useQuery({
    queryKey: ['platform-settings', 'sidebar-theme'],
    queryFn: getPlatformSidebarTheme,
    staleTime: 30000,
    enabled: userLoaded,
  });

  type SidebarStyle = 'classic' | 'modern' | 'glass' | 'compact' | 'custom'; // <-- inclui custom
  const sidebarStyle: SidebarStyle = (sidebarCfgData?.style ?? 'classic') as SidebarStyle;
  const sidebarWidth: number = typeof sidebarCfgData?.width === 'number' ? sidebarCfgData.width : 256;

  // ===== classes temáticas para o <nav> =====
  // colapsada: mantém EXACTAMENTE o look atual
  const collapsedNavTheme = 'bg-gray-900 text-gray-200 border-r border-gray-800';

  // expandida: varia por estilo (para custom usamos inline style e apenas border)
  const expandedNavTheme = useMemo(() => {
    switch (sidebarStyle) {
      case 'modern':
        return 'bg-white text-gray-800 border-r border-gray-200 shadow-none';
      case 'glass':
        // fallback escuro legível; se suportar backdrop-filter, aplica translucidez clara
        return [
          'bg-gray-900/80 text-gray-100 border-r border-gray-800',
          'supports-[backdrop-filter]:bg-white/10 supports-[backdrop-filter]:backdrop-blur-md',
          'supports-[backdrop-filter]:text-gray-900/90 supports-[backdrop-filter]:border-white/10',
        ].join(' ');
      case 'compact':
        return 'bg-gray-900 text-gray-200 border-r border-gray-800';
      case 'custom':
        // No custom, o fundo/borda/cores vêm via inline style (CSS vars); aqui apenas mantemos a border
        return 'border-r';
      case 'classic':
      default:
        return 'bg-gray-900 text-gray-200 border-r border-gray-800';
    }
  }, [sidebarStyle]);

  const navThemeClass =
    isDesktop && !effectiveCollapsed ? expandedNavTheme : collapsedNavTheme;

  // Largura inline apenas quando expandida (desktop); colapsada mantém md:w-16
  const navInlineStyle: React.CSSProperties | undefined =
    isDesktop && !effectiveCollapsed ? { width: `${sidebarWidth}px` } : undefined;

  // Blur class para custom (apenas quando expandido em desktop)
  const blurClass = useMemo(() => {
    if (!(isDesktop && !effectiveCollapsed)) return '';
    if (sidebarStyle !== 'custom') return '';
    const b = sidebarTheme?.backdropBlur ?? 'none';
    return b === 'sm' ? 'backdrop-blur-sm'
      : b === 'md' ? 'backdrop-blur-md'
      : b === 'lg' ? 'backdrop-blur-lg'
      : '';
  }, [isDesktop, effectiveCollapsed, sidebarStyle, sidebarTheme]);

  // CSS variables + inline background/border para custom (apenas expandido em desktop)
  const customVars: React.CSSProperties | undefined =
    (isDesktop && !effectiveCollapsed && sidebarStyle === 'custom' && sidebarTheme)
      ? ({
          // CSS variables para os itens
          ['--sb-bg' as any]: sidebarTheme.background,
          ['--sb-text' as any]: sidebarTheme.itemText,
          ['--sb-hover-bg' as any]: sidebarTheme.hoverBg,
          ['--sb-hover-text' as any]: sidebarTheme.hoverText,
          ['--sb-active-bg' as any]: sidebarTheme.activeBg,
          ['--sb-active-text' as any]: sidebarTheme.activeText,
          ['--sb-border' as any]: sidebarTheme.borderColor ?? 'transparent',
          // Aplica também no próprio nav
          backgroundColor: sidebarTheme.background,
          borderColor: sidebarTheme.borderColor ?? 'transparent',
        } as React.CSSProperties)
      : undefined;

  // Se não há user - renderiza skeleton do container para não quebrar hooks
  if (!userLoaded)
    return <nav className="w-64 bg-gray-900 text-gray-200" />;

  return (
    <nav
      className={[
        // ===== tema dinâmico (bg/text/border) aplicado no contentor real =====
        navThemeClass,
        blurClass, // (só tem efeito em custom expandido)

        // ===== estrutura base que já tinhas =====
        'flex flex-col h-[calc(100vh-4rem)]',
        'overflow-y-auto overflow-x-hidden overscroll-contain',
        'shadow-xl',
        'transition-transform duration-300 ease-in-out',

        'fixed z-50 top-16 left-0',
        'md:relative md:top-0 md:h-full md:z-auto',

        // larguras (classe) — inline width sobrepõe quando expandida
        widthClass,

        // paddings
        'p-3 md:p-4',

        // slide em mobile
        'md:translate-x-0',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
      aria-label="Navegação lateral"
      onClick={stopBubble}
      onTouchStart={stopBubble}
      style={{ ...navInlineStyle, ...customVars }}
    >
      {/* BOTÕES SUPERIORES */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          {collapsed ? (
            <svg className="w-5 h-5" stroke="currentColor" fill="none" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="w-5 h-5" stroke="currentColor" fill="none" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <button
          onClick={toggleSidebar}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ml-auto"
        >
          {isSidebarOpen ? (
            <svg className="w-6 h-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="w-6 h-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* MENU  */}
      <ul className="space-y-1 mt-2 min-w-0">
        {classicMenu.map((group: any) => {
          const visibleItems = group.items ?? [];
          if (visibleItems.length === 0) return null;

          const groupIconCmp = iconAdapter(group.icon as any);

          // direct
          if (group.direct && visibleItems.length === 1) {
            const item = visibleItems[0];
            const ItemIconCmp = item.icon ? iconAdapter(item.icon as any) : undefined;

            return (
              <li key={`direct-${group.id}`} className="min-w-0">
                <SidebarLink
                  to={item.to}
                  active={currentPath === item.to}
                  collapsed={effectiveCollapsed}
                  forceShowLabel={forceShowLabel}
                  onNavigate={handleNavigateMobile}
                  icon={ItemIconCmp ?? groupIconCmp}
                  // === NOVO: variante visual segura (adicional) ===
                  styleVariant={sidebarStyle}
                >
                  {item.label}
                </SidebarLink>
              </li>
            );
          }

          const groupActive = visibleItems.some((it: any) =>
            currentPath.startsWith(it.to)
          );

          return (
            <SidebarGroup
              key={group.id}
              id={group.id}
              title={group.title}
              icon={groupIconCmp}
              isOpen={openSubmenu === group.id}
              onToggle={toggleSubmenu}
              active={groupActive}
              collapsed={effectiveCollapsed}
              forceShowLabel={forceShowLabel}
              hasChildren={visibleItems.length > 1}
              onNavigateChild={handleNavigateMobile}
              // === NOVO: variante visual segura (adicional) ===
              styleVariant={sidebarStyle}
            >
              {visibleItems.map((item: any) => {
                const IconCmp = item.icon ? iconAdapter(item.icon as any) : undefined;

                return (
                  <li key={item.to} className="min-w-0">
                    <SidebarLink
                      to={item.to}
                      active={currentPath === item.to}
                      collapsed={effectiveCollapsed}
                      forceShowLabel={forceShowLabel}
                      onNavigate={handleNavigateMobile}
                      icon={IconCmp}
                      // === NOVO: variante visual segura (adicional) ===
                      styleVariant={sidebarStyle}
                    >
                      {item.label}
                    </SidebarLink>
                  </li>
                );
              })}
            </SidebarGroup>
          );
        })}
      </ul>
    </nav>
  );
};

export default Sidebar;