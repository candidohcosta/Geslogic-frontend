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

    // join imediato se já estiver ligado
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
      title="Apoio ao Cliente"
      aria-label="Apoio ao Cliente"
      className={[
        'relative p-2 rounded-md transition-colors',
        // Hover var-based (usa as variáveis do Header) + fallback claro
        'hover:bg-gray-100 hover:bg-[var(--hdr-btn-hover-bg)] hover:text-[var(--hdr-btn-hover-text)]',
        // Acessibilidade
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
      ].join(' ')}
    >
      {/* Ícone sem cor base -> herda currentColor do header;
          quando há atenção, força vermelho e animação (sobrepõe a herança) */}
      <LifeBuoy className={['h-6 w-6', hasAttention ? 'text-red-500 animate-pulse' : ''].join(' ')} />

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