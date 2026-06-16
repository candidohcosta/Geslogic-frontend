// frontend/src/context/NotificationContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socketClient';

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

  const socketRef = useRef<Socket | null>(null);
  const didInitRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const scheduleRefresh = (delayMs = 750) => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    refreshTimerRef.current = window.setTimeout(async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        const data = await fetchNotifications();
        setNotifications(() => {
          const next = Array.isArray(data) ? data : [];
          knownIdsRef.current = new Set(next.map(n => n.id));
          return next;
        });
      } catch {
        // silenciar
      } finally {
        isRefreshingRef.current = false;
      }
    }, delayMs) as unknown as number;
  };

  const initialLoad = async () => {
    isRefreshingRef.current = true;
    try {
      const data = await fetchNotifications();
      setNotifications(() => {
        const next = Array.isArray(data) ? data : [];
        knownIdsRef.current = new Set(next.map(n => n.id));
        return next;
      });
    } catch {
      // silenciar
    } finally {
      isRefreshingRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        try { socketRef.current.disconnect(); } catch {}
        socketRef.current = null;
      }
      setNotifications([]);
      knownIdsRef.current.clear();
      didInitRef.current = false;
      return;
    }

    if (didInitRef.current) return;
    didInitRef.current = true;

    initialLoad();

    if (socketRef.current) {
      try { socketRef.current.disconnect(); } catch {}
      socketRef.current = null;
    }

    const s = getSocket({ forcePollingOnly: true }); // root namespace
    socketRef.current = s;

    const joinChannel = () => {
      s.emit('join_user_channel', user.id);
    };

    const onConnect = () => {
      joinChannel();
      scheduleRefresh(250);
    };

    const onNewNotification = (newNotif: Notification) => {
      if (newNotif?.id && knownIdsRef.current.has(newNotif.id)) return;

      setNotifications(prev => {
        if (newNotif?.id && prev.some(n => n.id === newNotif.id)) {
          knownIdsRef.current.add(newNotif.id);
          return prev;
        }
        const next = [newNotif, ...prev];
        if (newNotif?.id) knownIdsRef.current.add(newNotif.id);

        const toastOpts = newNotif?.id ? { id: newNotif.id } : undefined;
        switch (newNotif.type) {
          case 'ERROR':   toast.error(`${newNotif.title}: ${newNotif.message}`, toastOpts); break;
          case 'SUCCESS': toast.success(`${newNotif.title}: ${newNotif.message}`, toastOpts); break;
          case 'WARNING': toast(`${newNotif.title}: ${newNotif.message}`, { ...(toastOpts || {}), icon: '⚠️' }); break;
          default:        toast(`${newNotif.title}: ${newNotif.message}`, { ...(toastOpts || {}), icon: '🔔' });
        }
        return next;
      });
    };

    const onUpdateSignal = () => {
      scheduleRefresh(750);
    };

    const onDisconnect = () => {};
    const onConnectError = (_err: unknown) => {};

    s.on('connect', onConnect);
    s.on('NEW_SYSTEM_NOTIFICATION', onNewNotification);
    s.on('NOTIFICATIONS_UPDATED', onUpdateSignal);
    s.on('OPERATOR_SESSION_FORCE_CLOSED', () => {
      window.dispatchEvent(new CustomEvent('operator:forceClosed'));
    });
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);

    return () => {
      try { s.emit('leave_user_channel', user.id); } catch {}
      s.off('connect', onConnect);
      s.off('NEW_SYSTEM_NOTIFICATION', onNewNotification);
      s.off('NOTIFICATIONS_UPDATED', onUpdateSignal);
      s.off('OPERATOR_SESSION_FORCE_CLOSED');
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      // não precisamos desconectar o root aqui — pode ser partilhado
      socketRef.current = null;
      didInitRef.current = false;
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try { await markNotificationAsRead(id); } catch {}
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try { await markAllNotificationsAsRead(); } catch {}
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}

      <Toaster
        position="bottom-right"
        toastOptions={{ duration: 5000 }}
        containerStyle={{ zIndex: 2147483647 }}
      />

    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};