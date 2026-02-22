// src/lib/socketClient.ts
import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';

export const getApiBase = () => {
  let base = process.env.REACT_APP_API_BASE_URL ?? window.location.origin;
  if (base.endsWith('/api')) base = base.slice(0, -4);
  return base.replace(/\/+$/, '');
};

type NsKey = 'root' | string;

type GetSocketOpts = {
  namespace?: string;           // ex.: '/support' | undefined para root
  forcePollingOnly?: boolean;   // true ⇒ nunca tenta websocket
};

const BASE_OPTS: Partial<ManagerOptions & SocketOptions> = {
  path: '/socket.io',
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 800,
};

// cache de sockets por namespace
let cache: Record<NsKey, Socket> = {};

/**
 * Singleton lazy por namespace.
 * - Root ('') ⇒ key 'root'
 * - '/support' ⇒ key 'support'
 * Permite forçar apenas 'polling' (sem upgrade) — útil para o namespace root (Firefox).
 */
export function getSocket({ namespace, forcePollingOnly = false }: GetSocketOpts = {}): Socket {
  const ns = namespace ?? '';
  const key: NsKey = ns ? ns.replace(/^\//, '') : 'root';
  const url = `${getApiBase()}${ns}`;

  // Decide transports: root (ou forçado) fica só 'polling'; namespaces podem fazer upgrade
  const transports: string[] =
    forcePollingOnly || !ns
      ? ['polling']                   // ROOT: sem upgrade → elimina erro no Firefox
      : ['polling', 'websocket'];     // /support: polling → upgrade

  // Cria ou reutiliza
  if (!cache[key]) {
    cache[key] = io(url, {
      ...BASE_OPTS,
      transports,
    });
  } else {
    // Garante que as opções de transports estão coerentes em reuso (caso o socket venha de antes)
    const shouldBePollingOnly = transports.length === 1 && transports[0] === 'polling';
    const hasOnlyPolling = (cache[key].io as any).opts?.transports?.length === 1 &&
                           (cache[key].io as any).opts?.transports?.[0] === 'polling';
    if (shouldBePollingOnly && !hasOnlyPolling) {
      try { cache[key].disconnect(); } catch {}
      cache[key] = io(url, {
        ...BASE_OPTS,
        transports,
      });
    } else if (cache[key].disconnected) {
      cache[key].connect();
    }
  }

  return cache[key];
}

export function disconnectAllSockets() {
  Object.values(cache).forEach((s) => {
    try { s.disconnect(); } catch {}
  });
  cache = {};
}