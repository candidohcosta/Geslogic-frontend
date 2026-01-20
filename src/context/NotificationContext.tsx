// frontend/src/context/NotificationContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';
import io from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';

// Interfaces
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Configuração do Socket com reconexão automática
const socket = io('http://localhost:3000', {
    reconnection: true,
    reconnectionAttempts: Infinity,
}); 

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = () => {
      fetchNotifications().then(setNotifications).catch(console.error);
  };

  // 1. Carregar histórico e Ligar Socket
  useEffect(() => {
    if (user) {
      // A. Carregar histórico da API (BD)
      loadNotifications();
      
      // B. Função para entrar na sala (canal) do utilizador
      const joinChannel = () => {
          console.log(`[Socket] A entrar no canal do utilizador: ${user.id}`);
          socket.emit('join_user_channel', user.id);
      };

      // 1. Se o socket não estiver conectado, conecta.
      if (!socket.connected) socket.connect();

      // 2. Entra na sala imediatamente
      joinChannel();

      // 3. CRÍTICO: Se a ligação cair e voltar, entra na sala outra vez!
      socket.on('connect', joinChannel);

      // C. Ouvir novas notificações em tempo real
      const handleNewNotification = (newNotif: Notification) => {
        console.log("[Socket] Notificação recebida:", newNotif); // <--- DEBUG
        
        setNotifications(prev => [newNotif, ...prev]);
        
        // DISPARAR O POPUP VISUAL (TOAST)
        const toastOpts = { id: newNotif.id }; // Evita duplicados
        switch (newNotif.type) {
            case 'ERROR': toast.error(`${newNotif.title}: ${newNotif.message}`, toastOpts); break;
            case 'SUCCESS': toast.success(`${newNotif.title}: ${newNotif.message}`, toastOpts); break;
            case 'WARNING': toast.error(`${newNotif.title}: ${newNotif.message}`, { ...toastOpts, icon: '⚠️' }); break;
            default: toast(`${newNotif.title}: ${newNotif.message}`, { ...toastOpts, icon: '🔔' });
        }
      };

      const handleUpdateSignal = () => {
          console.log("[Socket] Sinal de atualização recebido. Recarregando notificações...");
          loadNotifications(); // <--- Vai ao backend buscar o estado fresco (onde já estão lidas)
      };

      socket.on('NEW_SYSTEM_NOTIFICATION', handleNewNotification);
      socket.on('NOTIFICATIONS_UPDATED', handleUpdateSignal);      

      // Limpeza ao desmontar ou mudar de user
      return () => { 
        socket.off('connect', joinChannel);
        socket.off('NEW_SYSTEM_NOTIFICATION', handleNewNotification);
        socket.off('NOTIFICATIONS_UPDATED', handleUpdateSignal);
      };
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await markNotificationAsRead(id);
  };
  
  const markAllAsRead = async () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await markAllNotificationsAsRead();
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
      {/* O componente que desenha os popups */}
      <Toaster position="bottom-right" toastOptions={{ duration: 5000 }} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotifications must be used within NotificationProvider");
    return context;
};