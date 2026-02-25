// frontend/src/components/support/SupportBell.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { getSupportUnreadSummary, markSupportSeen } from '../../services/api';
import { createSupportChannel } from '../../lib/sockets/support';

type IncomingMessage = {
  id: string;
  message: string;
  createdAt: string;
  sender?: { id: string; firstName?: string; lastName?: string; email?: string };
};

const SupportBell: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [hasAttention, setHasAttention] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

  // 1) Ler do servidor se há por ler (offline-safe / multi-dispositivo)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      try {
        const summary = await getSupportUnreadSummary(); // { totalUnread, ... }
        if (!cancelled) {
          setHasAttention((summary?.totalUnread ?? 0) > 0);
        }
      } catch {
        // silenciar
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  // 2) Socket: acender em tempo real (mensagens de outros) + refreshList
  useEffect(() => {
    if (!user) return;

    const { socket: s, joinList, leaveList, on } = createSupportChannel();
    socketRef.current = s;

    // ⬅️ CORREÇÃO CRÍTICA: se já está ligado, fazer joinList já
    const doJoin = async () => {
      try { joinList(); } catch {}
      try {
        const summary = await getSupportUnreadSummary();
        setHasAttention((summary?.totalUnread ?? 0) > 0);
      } catch {}
    };
    if (s.connected) {
      doJoin();
    }

    const offConnect = on('connect', doJoin);

    const offNewMsg = on('newMessage', (msg: IncomingMessage) => {
      const isFromMe = msg?.sender?.id && user?.id && msg.sender.id === user.id;
      if (!isFromMe) setHasAttention(true);
    });

    const offRefresh = on('refreshList', async () => {
      try {
        const summary = await getSupportUnreadSummary();
        setHasAttention((summary?.totalUnread ?? 0) > 0);
      } catch {
        // fallback possível: setHasAttention(true);
      }
    });

    return () => {
      try { leaveList(); } catch {}
      offConnect();
      offNewMsg();
      offRefresh();
      socketRef.current = null;
    };
  }, [user]);

  // 3) Ao entrar em /support, marca visto no servidor e apaga
  useEffect(() => {
    const run = async () => {
      if (location.pathname.startsWith('/support')) {
        try { await markSupportSeen(); } catch {}
        setHasAttention(false);
      }
    };
    run();
  }, [location.pathname]);

  const handleClick = async () => {
    try { await markSupportSeen(); } catch {}
    setHasAttention(false);
  };

  return (
    <Link
      to="/support"
      onClick={handleClick}
      className="relative p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
      title="Apoio ao Cliente"
    >
      <LifeBuoy className={`h-6 w-6 ${hasAttention ? 'text-red-500 animate-pulse' : 'text-gray-600'}`} />
      {hasAttention && (
        <span className="absolute top-1 right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      )}
    </Link>
  );
};

export default SupportBell;