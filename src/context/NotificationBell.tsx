// frontend/src/context/NotificationBell.tsx
import React, { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Botão do Sino: hover por variáveis (com fallback) */}
      <button
        className="relative p-2 rounded-full transition-colors hover:bg-gray-100 hover:bg-[var(--hdr-btn-hover-bg)] hover:text-[var(--hdr-btn-hover-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Abrir notificações"
      >
        {/* Ícone sem cor explícita → herda currentColor (definido no Header via --hdr e hover) */}
        <Bell className="w-6 h-6" />

        {/* Badge SEMPRE branca (classe nb-badge é blindada no Header) */}
        {unreadCount > 0 && (
          <span className="nb-badge absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full transform translate-x-1/4 -translate-y-1/4">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown (Lista) */}
      {isOpen && (
        <>
          {/* Overlay invisível para fechar ao clicar fora */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />

          {/* Painel: nb-panel + variáveis de fundo/texto; !-classes para vencer a regra global do header */}
          <div className="nb-panel absolute right-0 mt-2 w-80 !bg-white !text-gray-700 bg-[var(--hdr-panel-bg)] text-[var(--hdr-panel-text)] rounded-lg shadow-xl overflow-hidden z-50 border border-gray-200">
            <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-semibold text-sm !text-gray-700">Notificações</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  type="button"
                >
                  <Check className="w-3 h-3" /> Marcar lidas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Sem notificações.</div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!notif.isRead ? 'bg-blue-50/50' : ''}`}
                    onClick={() => markAsRead(notif.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') markAsRead(notif.id);
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`text-sm ${!notif.isRead ? '!text-gray-900 font-bold' : '!text-gray-600 font-medium'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] !text-gray-400 whitespace-nowrap">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 line-clamp-2 ${!notif.isRead ? '!text-gray-800' : '!text-gray-500'}`}>
                      {notif.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;