// frontend/src/context/NotificationContext.tsx

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'; // Adicionar useRef
import { useAuth } from './AuthContext';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';
import io, { Socket } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';

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

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Usamos uma ref para guardar o socket, evitando recriações desnecessárias
  const socketRef = useRef<Socket | null>(null);

  const loadNotifications = () => {
      fetchNotifications().then(setNotifications).catch(console.error);
  };

  useEffect(() => {
    // SÓ INICIALIZA O SOCKET SE HOUVER UTILIZADOR LOGADO
    if (user) {
      loadNotifications();

      // 1. Criar Socket (Usando a origem atual para evitar problemas de CORS/Localhost)
      // O path /socket.io é tratado pelo Nginx no VPS e pelo Proxy no PC.
      const socketUrl = window.location.origin;
      const newSocket = io(socketUrl, {
        path: '/socket.io',
        transports: ['websocket'], // Forçar websocket é mais estável
        withCredentials: true,
        reconnection: true,
      });

      socketRef.current = newSocket;

      // 2. Definir eventos
      const joinChannel = () => {
          // console.log(`[NotificationSocket] A entrar no canal: ${user.id}`);
          newSocket.emit('join_user_channel', user.id);
      };

      newSocket.on('connect', joinChannel);
      
      // Se já conectou instantaneamente (ex: reconexão)
      if (newSocket.connected) joinChannel();

      const handleNewNotification = (newNotif: Notification) => {
        setNotifications(prev => [newNotif, ...prev]);
        const toastOpts = { id: newNotif.id };
        switch (newNotif.type) {
            case 'ERROR': toast.error(`${newNotif.title}: ${newNotif.message}`, toastOpts); break;
            case 'SUCCESS': toast.success(`${newNotif.title}: ${newNotif.message}`, toastOpts); break;
            case 'WARNING': toast.error(`${newNotif.title}: ${newNotif.message}`, { ...toastOpts, icon: '⚠️' }); break;
            default: toast(`${newNotif.title}: ${newNotif.message}`, { ...toastOpts, icon: '🔔' });
        }
      };

      const handleUpdateSignal = () => {
          loadNotifications(); 
      };

      newSocket.on('NEW_SYSTEM_NOTIFICATION', handleNewNotification);
      newSocket.on('NOTIFICATIONS_UPDATED', handleUpdateSignal);      

      // 3. Limpeza ao desmontar ou ao fazer logout
      return () => { 
        if (newSocket) {
            newSocket.emit('leave_user_channel', user.id); // Opcional, mas boa prática
            newSocket.disconnect();
        }
      };
    }
  }, [user]); // Recria o socket apenas se o user mudar (login/logout)

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
      <Toaster position="bottom-right" toastOptions={{ duration: 5000 }} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotifications must be used within NotificationProvider");
    return context;
};