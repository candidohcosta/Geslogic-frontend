// frontend/src/hooks/useDeviceHeartbeat.ts

import { useEffect } from 'react';
import io from 'socket.io-client';

// Nota: Em produção, este URL deve vir de variáveis de ambiente
const socket = io(process.env.REACT_APP_API_BASE_URL, {
  reconnection: true,        // Tenta reconectar sempre
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
}); 

export const useDeviceHeartbeat = (type: 'KIOSK' | 'DISPLAY', id?: string) => {
  useEffect(() => {
    // Só arranca se tivermos um ID válido
    if (!id) return;

    console.log(`[Heartbeat] A iniciar monitorização para ${type} ${id}`);

    // Função de Registo (encapsulada para ser reutilizada)
    const register = () => {
        if (socket.connected) {
            console.log(`[Heartbeat] A registar dispositivo na rede...`);
            socket.emit('register_device', { type, id });
        }
    };

    // 1. Tentar registar imediatamente (se já estiver conectado)
    register();

    // 2. Ouvir evento de CONEXÃO/RECONEXÃO (A Correção Crítica)
    // Se o servidor for abaixo e voltar, este evento dispara e nós registamos de novo.
    socket.on('connect', register);

    // 3. Ouvir comando de "Recarregar Página"
    socket.on('FORCE_RELOAD', () => {
        console.warn("[Heartbeat] Comando de reload remoto recebido!");
        window.location.reload();
    });

    // 4. Loop de "Batimento Cardíaco" a cada 30 segundos
    const interval = setInterval(() => {
        if (socket.connected) {
            socket.emit('heartbeat', { type, id });
        } else {
            console.warn(`[Heartbeat] Socket desconectado. A tentar reconectar...`);
        }
    }, 30000);

    // Limpeza
    return () => {
        clearInterval(interval);
        socket.off('connect', register); // Importante desligar o listener
        socket.off('FORCE_RELOAD');
    };
  }, [type, id]);
};