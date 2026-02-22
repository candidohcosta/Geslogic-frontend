// frontend/src/hooks/useDeviceHeartbeat.ts
import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socketClient';

export const useDeviceHeartbeat = (type: 'KIOSK' | 'DISPLAY', id?: string) => {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!id) return;

    const s = getSocket({ forcePollingOnly: true }); // root namespace

    const register = () => {
      try { s.emit('register_device', { type, id }); } catch {}
    };

    if (s.connected && !registeredRef.current) {
      register();
      registeredRef.current = true;
    }

    const onConnect = () => {
      register();
      registeredRef.current = true;
    };
    s.on('connect', onConnect);

    const onForceReload = () => {
      try { window.location.reload(); } catch {}
    };
    s.on('FORCE_RELOAD', onForceReload);

    const interval = window.setInterval(() => {
      if (s.connected) {
        try { s.emit('heartbeat', { type, id }); } catch {}
      }
    }, 30000);

    return () => {
      window.clearInterval(interval);
      s.off('connect', onConnect);
      s.off('FORCE_RELOAD', onForceReload);
      registeredRef.current = false;
    };
  }, [type, id]);
};