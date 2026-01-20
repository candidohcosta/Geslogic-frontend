// frontend/src/hooks/useDeviceContext.ts
import { useState, useEffect } from 'react';
import { TelemetryService } from '../lib/telemetry';

export interface DeviceContextData {
  browser: string;
  os: string;
  url: string; // URL "Real" (anterior)
  history: string[]; // Histórico de navegação
  screenResolution: string;
  viewport: string; // Tamanho da janela (útil se estiverem com zoom ou janela pequena)
  userAgent: string;
  lastErrors: string[]; // <--- Ouro
  connection?: string; // 4G, WiFi (se disponível)
}

export const useDeviceContext = () => {
  const [context, setContext] = useState<DeviceContextData | null>(null);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    
    // Detetor de Browser
    let browser = "Unknown";
    if (userAgent.match(/chrome|chromium|crios/i)) browser = "Chrome";
    else if (userAgent.match(/firefox|fxios/i)) browser = "Firefox";
    else if (userAgent.match(/safari/i)) browser = "Safari";
    else if (userAgent.match(/opr\//i)) browser = "Opera";
    else if (userAgent.match(/edg/i)) browser = "Edge";

    // Detetor de OS
    let os = "Unknown OS";
    if (userAgent.indexOf("Win") !== -1) os = "Windows";
    if (userAgent.indexOf("Mac") !== -1) os = "MacOS";
    if (userAgent.indexOf("Linux") !== -1) os = "Linux";
    if (userAgent.indexOf("Android") !== -1) os = "Android";
    if (userAgent.indexOf("iOS") !== -1) os = "iOS";

    // Info de Ecrã
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const viewport = `${window.innerWidth}x${window.innerHeight}`;

    // Info de Rede (Experimental, pode não existir em todos os browsers)
    const conn = (navigator as any).connection;
    const connectionType = conn ? (conn.effectiveType || conn.type) : 'unknown';

    setContext({
      browser,
      os,
      url: TelemetryService.getPreviousRoute(), // <--- Vai buscar a rota anterior real!
      history: TelemetryService.getFullHistory(),
      screenResolution: screenRes,
      viewport,
      userAgent: userAgent,
      lastErrors: TelemetryService.getLastErrors(), // <--- Erros recentes
      connection: connectionType
    });
  }, []);

  return context;
};