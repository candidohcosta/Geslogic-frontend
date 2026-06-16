// frontend/src/components/Header.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { Button } from './ui/Button';
import NotificationBell from '../context/NotificationBell';
import SupportBell from './support/SupportBell';
import BrandLogo from './brand/BrandLogo';

// >>> MODAIS
import EditProfileDrawer from './dialogs/EditProfileDrawer';
import ChangePasswordDialog from './dialogs/ChangePasswordDialog';

// >>> UI Theme (Aparência Global)
import { useQuery } from '@tanstack/react-query';
import { getPlatformUiTheme } from '../services/api';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Estado para modais
  const [openProfile, setOpenProfile] = useState(false);
  const [openChangePwd, setOpenChangePwd] = useState(false);

  // Fecha o dropdown quando a rota muda
  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [location]);

  // Fecha modais caso o utilizador saia (robustez)
  useEffect(() => {
    if (!isAuthenticated) {
      setOpenProfile(false);
      setOpenChangePwd(false);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  // Debug leve
  if (typeof window !== 'undefined') {
    (window as any).__HEADER_DEBUG__ = {
      ts: new Date().toISOString(),
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      userPreview: user ? { firstName: user.firstName, email: user.email } : null,
    };
    // eslint-disable-next-line no-console
    console.log('[HeaderDebug]', (window as any).__HEADER_DEBUG__);
  }

  // ===== Ler Aparência Global (UI Theme) =====
  const { data: uiTheme } = useQuery({
    queryKey: ['platform-settings', 'ui-theme'],
    queryFn: getPlatformUiTheme,
    staleTime: 30000,
  });

  return (
    <header
      className={[
        // Base original
        'fixed inset-x-0 top-0 z-40 h-16 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/60 dark:border-slate-800',
        'w-full',

        // 🔹 Força cor uniforme em todos os descendentes do header
        '[&_*]:text-[var(--hdr)]',

        // 🔹 EXCEÇÕES/BLINDAGENS:
        // Painel de Notificações (dropdown) → mantém bg e texto legíveis
        '[&_.nb-panel]:!bg-white [&_.nb-panel]:!text-gray-700 [&_.nb-panel_*]:!text-gray-700',
        // Painel do Menu do Utilizador → idem
        '[&_.user-menu-panel]:!bg-white [&_.user-menu-panel]:!text-gray-700 [&_.user-menu-panel_*]:!text-gray-700',
        // Badge do sino (número) → SEMPRE branco
        '[&_.nb-badge]:!text-white',
      ].join(' ')}
      style={{
        backgroundColor: uiTheme?.headerBg ?? undefined,
        borderColor: uiTheme?.headerBorder ?? undefined,

        // Define a variável de cor usada pelos descendentes
        ['--hdr' as any]: uiTheme?.headerText ?? undefined,
        color: uiTheme?.headerText ?? undefined,

        // === NOVO: variáveis de hover/painel ===
        ['--hdr-btn-hover-bg' as any]: uiTheme?.headerBtnHoverBg ?? undefined,
        ['--hdr-btn-hover-text' as any]: uiTheme?.headerBtnHoverText ?? undefined,
        ['--hdr-panel-bg' as any]: uiTheme?.headerPanelBg ?? undefined,
        ['--hdr-panel-text' as any]: uiTheme?.headerPanelText ?? undefined,
      }}
    >
      {/* Full width, sem container fixo; apenas padding lateral coerente com Landing v2 */}
      <div className="w-full h-full px-6 md:px-12 lg:px-20 flex items-center justify-between">
        {/* ESQUERDA: Hamburguer (mobile) + Logo */}
        <div className="flex items-center gap-3 md:gap-4">
          {isAuthenticated && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-md hover:bg-gray-100 hover:bg-[var(--hdr-btn-hover-bg)] hover:text-[var(--hdr-btn-hover-text)] transition-colors"
              aria-label="Abrir menu lateral"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}

          <Link to="/dashboard" className="flex items-center gap-2" aria-label="Ir para início">
            <span className="hidden sm:inline-flex">
              <BrandLogo withLink={false} variant="horizontal" />
            </span>
            <span className="sm:hidden inline-flex">
              <BrandLogo withLink={false} variant="mark" />
            </span>
          </Link>
        </div>

        {/* DIREITA: Ações / Utilizador */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* --- ANTI-FLICKER: enquanto o Auth está a carregar, não mostramos “Entrar/Registar” --- */}
          {isLoading ? (
            <div className="flex items-center gap-3">
              {/* Skeleton simples: avatar + barra curta */}
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
              <div className="hidden md:block h-4 w-24 rounded bg-gray-200 animate-pulse" />
            </div>
          ) : isAuthenticated ? (
            <>
              {/* Notificações e Suporte (os componentes aplicam hover/painel por var) */}
              <NotificationBell />
              <SupportBell />

              <div className="h-6 w-px bg-gray-200 hidden md:block mx-1" />

              {/* Menu de Utilizador */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen((v) => !v);
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 hover:bg-[var(--hdr-btn-hover-bg)] hover:text-[var(--hdr-btn-hover-text)] transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="bg-gray-100 p-1.5 rounded-full">
                    <UserIcon className="h-5 w-5" color="#374151" />
                  </div>
                  <span className="hidden md:block text-sm font-medium max-w-[160px] truncate">
                    {user?.firstName ?? 'Utilizador'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {isUserMenuOpen && (
                  <>
                    {/* Overlay para fechar ao clicar fora */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                    {/* Dropdown (painel protegido por classe user-menu-panel) */}
                    <div
                      role="menu"
                      aria-label="Menu do utilizador"
                      className="user-menu-panel absolute right-0 mt-2 w-56 !bg-white !text-gray-700 bg-[var(--hdr-panel-bg)] text-[var(--hdr-panel-text)] rounded-md shadow-xl border border-gray-200 z-50 overflow-hidden py-1"
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium !text-gray-900">
                          {(user?.firstName ?? 'Utilizador') + (user?.lastName ? ` ${user.lastName}` : '')}
                        </p>
                        <p className="text-xs !text-gray-500 truncate">
                          {user?.email ?? '—'}
                        </p>
                      </div>

                      <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-left"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setOpenProfile(true);
                        }}
                      >
                        <Settings className="h-4 w-4" /> Editar Perfil
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-left"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setOpenChangePwd(true);
                        }}
                      >
                        <KeyRound className="h-4 w-4" /> Mudar Senha
                      </button>

                      <div className="border-t border-gray-100 my-1" />

                      <button
                        onClick={handleLogout}
                        role="menuitem"
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
            // Visitante (não autenticado)
            <div className="flex gap-2">
              <Link to="/login">
                <Button variant="ghost">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button>Registar</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* >>> MONTAGEM DOS MODAIS VIA PORTAL (fora do stacking do header) */}
      {openProfile &&
        typeof document !== 'undefined' &&
        createPortal(
          <EditProfileDrawer
            isOpen={openProfile}
            onClose={() => setOpenProfile(false)}
          />,
          document.body
        )}

      {openChangePwd &&
        typeof document !== 'undefined' &&
        createPortal(
          <ChangePasswordDialog
            isOpen={openChangePwd}
            onClose={() => setOpenChangePwd(false)}
          />,
          document.body
        )}
    </header>
  );
};

export default Header;