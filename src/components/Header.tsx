// frontend/src/components/Header.tsx
import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import {
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  Settings,
  User as UserIcon,
} from 'lucide-react'
import { Button } from './ui/Button'
import NotificationBell from '../context/NotificationBell'
import SupportBell from './support/SupportBell'
import BrandLogo from './brand/BrandLogo'

// >>> MODAIS
import EditProfileDrawer from './dialogs/EditProfileDrawer'
import ChangePasswordDialog from './dialogs/ChangePasswordDialog'

interface HeaderProps {
  onMenuClick: () => void
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Estado para modais
  const [openProfile, setOpenProfile] = useState(false)
  const [openChangePwd, setOpenChangePwd] = useState(false)

  // Fecha o dropdown quando a rota muda
  useEffect(() => {
    setIsUserMenuOpen(false)
  }, [location])

  // Fecha modais caso o utilizador saia (robustez)
  useEffect(() => {
    if (!isAuthenticated) {
      setOpenProfile(false)
      setOpenChangePwd(false)
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    setIsUserMenuOpen(false)
    logout()
    navigate('/login')
  }


// Header.tsx (logo após const { user, isAuthenticated, isLoading } = useAuth())
if (typeof window !== 'undefined') {
  // identifica versão do ficheiro a compilar
  (window as any).__HEADER_DEBUG__ = {
    ts: new Date().toISOString(),
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    userPreview: user ? { firstName: user.firstName, email: user.email } : null,
  };
  console.log('[HeaderDebug]', (window as any).__HEADER_DEBUG__);
}


  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/60 dark:border-slate-800">
      {/* Full width, sem container fixo; apenas padding lateral coerente com Landing v2 */}
      <div className="w-full h-full px-6 md:px-12 lg:px-20 flex items-center justify-between">
        {/* ESQUERDA: Hamburguer (mobile) + Logo */}
        <div className="flex items-center gap-3 md:gap-4">
          {isAuthenticated && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-md hover:bg-gray-100 text-gray-600 dark:text-slate-200 dark:hover:bg-slate-800"
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
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse" />
              <div className="hidden md:block h-4 w-24 rounded bg-gray-200 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : isAuthenticated ? (
            <>
              {/* Notificações (ordem: gerais, suporte) */}
              <NotificationBell />
              <SupportBell />

              <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 hidden md:block mx-1" />

              {/* Menu de Utilizador */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsUserMenuOpen((v) => !v)
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="bg-gray-100 dark:bg-slate-800 p-1.5 rounded-full">
                    <UserIcon className="h-5 w-5 text-gray-700 dark:text-slate-200" />
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-slate-100 max-w-[160px] truncate">
                    {user?.firstName ?? 'Utilizador'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <>
                    {/* Overlay para fechar ao clicar fora */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                    {/* Dropdown */}
                    <div
                      role="menu"
                      aria-label="Menu do utilizador"
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-md shadow-xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden py-1"
                    >
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {(user?.firstName ?? 'Utilizador') + (user?.lastName ? ` ${user.lastName}` : '')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                          {user?.email ?? '—'}
                        </p>
                      </div>

                      <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          setOpenProfile(true)
                        }}
                      >
                        <Settings className="h-4 w-4" /> Editar Perfil
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          setOpenChangePwd(true)
                        }}
                      >
                        <KeyRound className="h-4 w-4" /> Mudar Senha
                      </button>

                      <div className="border-t border-gray-100 dark:border-slate-800 my-1" />

                      <button
                        onClick={handleLogout}
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-left"
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
  )
}

export default Header;