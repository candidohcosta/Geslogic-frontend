// src/lib/sockets/support.ts
import type { Socket } from 'socket.io-client';
import { getSocket } from '../socketClient';

export type SupportEvents = {
  newMessage: (payload: any) => void;
  refreshList: () => void;
  statusChange: (status: string) => void;
  connect: () => void;
  connect_error: (err: unknown) => void;
  readReceipt?: (payload: any) => void; // opcional
};

export function getSupportSocket(): Socket {
  return getSocket({ namespace: '/support' });
}

export function createSupportChannel() {
  const s = getSupportSocket();

  // ⚠ Backend não usa companyId → tornamos este argumento opcional
  const joinList = () => {
    try { s.emit('joinList'); } catch {}
  };

  const leaveList = () => {
    try { s.emit('leaveList'); } catch {}
  };

  const joinTicket = (ticketId: string) => {
    try { s.emit('joinTicket', ticketId); } catch {}
  };

  const leaveTicket = (ticketId: string) => {
    try { s.emit('leaveTicket', ticketId); } catch {}
  };

  const on = <K extends keyof SupportEvents>(event: K, handler: SupportEvents[K]) => {
    s.on(event as string, handler as any);
    return () => s.off(event as string, handler as any);
  };

  return { socket: s, joinList, leaveList, joinTicket, leaveTicket, on };
}