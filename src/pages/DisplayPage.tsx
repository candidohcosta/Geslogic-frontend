// frontend/src/pages/DisplayPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDisplayConfig, fetchDisplayState } from '../services/api';

// Swiper (Slideshow)
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import 'swiper/css/autoplay';
import 'swiper/css/effect-fade';

// Monitorização
import { useDeviceHeartbeat } from '../hooks/useDeviceHeartbeat';
// 👇 novo: usar o socket root do cliente centralizado
import { getSocket } from '../lib/socketClient';

// --- INTERFACES ---
interface StoredFileData { id: string; url: string; }
enum DisplayLayoutFormat { HORIZONTAL = 'HORIZONTAL', VERTICAL = 'VERTICAL' }

interface DisplayUiConfig {
  headerBackgroundColor?: string;
  mainBackgroundColor?: string;
  footerBackgroundColor?: string;
  footerTextColor?: string;
  ticketCallWidget?: {
    backgroundColor?: string;
    titleColor?: string;
    ticketNumberColor?: string;
    counterNameColor?: string;
  };
  lastCalledWidget?: {
    backgroundColor?: string;
    textColor?: string;
  };
}

interface DisplayConfig {
  id: string;
  name: string;
  layoutFormat: DisplayLayoutFormat;
  counters: { id: string; name: string }[];
  mediaFiles: StoredFileData[];
  company: {
    name: string;
    address?: string;
    postalCode?: string;
    locality?: string;
    phone?: string;
    email?: string;
  };
  uiConfig: DisplayUiConfig | null;
  logo?: { url: string } | null;
}

const DisplayPage: React.FC = () => {
  const [deviceSecret] = useState(() => localStorage.getItem('displayDeviceSecret'));

  // Estado local para a UI
  const [lastCalledTicket, setLastCalledTicket] = useState<any>(null);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1) Carregar Configuração
  const { data: displayConfig, isLoading, error } = useQuery<DisplayConfig, Error>({
    queryKey: ['displayConfig', deviceSecret],
    queryFn: () => fetchDisplayConfig(deviceSecret!),
    enabled: !!deviceSecret,
  });

  // 2) Carregar Estado Inicial (recuperação)
  const { data: displayState } = useQuery({
    queryKey: ['displayState', deviceSecret],
    queryFn: () => fetchDisplayState(deviceSecret!),
    enabled: !!deviceSecret,
    refetchOnWindowFocus: false,
  });

  // 3) Sincronizar estado inicial no UI
  useEffect(() => {
    if (!displayState) return;
    if (displayState.currentTicket) setLastCalledTicket(displayState.currentTicket);
    if (displayState.history?.length) {
      const history = displayState.history.filter((t: any) => t.id !== displayState.currentTicket?.id);
      setTicketHistory(history);
    }
  }, [displayState]);

  // 4) Monitorização (Heartbeat)
  useDeviceHeartbeat('DISPLAY', displayConfig?.id);

  // --- LÓGICA DE SOM E VOZ ---
  const announceTicket = (ticketNumber: string, counterName: string) => {
    // A. Tocar Ding
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.warn('Som bloqueado (Autoplay Policy):', e));
    }

    // B. Preparar Texto (inteligente)
    let spokenTicket = ticketNumber;
    const match = ticketNumber.match(/^([A-Za-z]+)(\d+)$/);

    if (match) {
      const prefix = match[1];
      const numberPart = parseInt(match[2], 10);
      spokenTicket = `${prefix}... ${numberPart}`;
    } else {
      spokenTicket = ticketNumber.split('').join('... ');
    }

    const text = `Senha... ${spokenTicket}. ... Balcão... ${counterName}.`;

    // C. Falar
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-PT';
    utterance.rate = 0.9;

    window.speechSynthesis.cancel();
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 1200);
  };

  // Relógio
  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  // WebSockets (Tempo Real): subscrição aos canais dos balcões desta configuração
  useEffect(() => {
    if (!displayConfig?.counters?.length) return;

    const s = getSocket({ forcePollingOnly: true }); // usa o socket root (lazy, centralizado)

    const channels = displayConfig.counters.map(c => `display_counter_${c.id}`);

    const handleTicketCalled = (data: { type: string; payload: any }) => {
      if (data?.type !== 'TICKET_CALLED') return;

      setLastCalledTicket(data.payload);
      setTicketHistory(prev => {
        const newHistory = [data.payload, ...prev.filter(t => t.id !== data.payload.id)].slice(0, 4);
        return newHistory;
      });

      const tNumber = data.payload.ticketNumber;
      const cName = data.payload.station?.name || data.payload.counterName || '';
      announceTicket(tNumber, cName);
    };

    channels.forEach(channel => s.on(channel, handleTicketCalled));

    return () => {
      channels.forEach(channel => s.off(channel, handleTicketCalled));
    };
  }, [displayConfig?.counters]);

  if (!deviceSecret) {
    return <p className="text-red-500 p-4">Erro: Chave secreta em falta.</p>;
  }
  if (isLoading) {
    return <p className="text-white p-4">A carregar configuração do display...</p>;
  }
  if (error) {
    return <p className="text-red-500 p-4">Erro: {(error as Error).message}</p>;
  }

  const isVertical = displayConfig?.layoutFormat === DisplayLayoutFormat.VERTICAL;
  const uiConfig = displayConfig?.uiConfig;

  return (
    <div
      className="min-h-screen text-white flex flex-col transition-colors"
      style={{ backgroundColor: uiConfig?.mainBackgroundColor || '#111827' }}
    >
      <audio ref={audioRef} src="/assets/sounds/ding.mp3" preload="auto" />

      {displayConfig?.logo?.url && (
        <header
          className="w-full p-4 flex justify-center"
          style={{ backgroundColor: uiConfig?.headerBackgroundColor || '#1f2937' }}
        >
          <img
            src={displayConfig.logo.url}
            alt={`Logótipo de ${displayConfig.company.name}`}
            className="h-20 w-auto"
          />
        </header>
      )}

      <div className={`flex-grow p-4 lg:p-8 flex ${isVertical ? 'flex-col' : 'flex-row'}`}>
        {/* Média / Slideshow */}
        <div className={`${isVertical ? 'w-full h-2/3 mb-4' : 'w-2/3 h-full pr-4'}`}>
          <div className="bg-gray-800 rounded-lg h-full w-full overflow-hidden shadow-2xl">
            <Swiper
              modules={[Autoplay, EffectFade]}
              spaceBetween={0}
              slidesPerView={1}
              loop={true}
              effect="fade"
              fadeEffect={{ crossFade: true }}
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              className="h-full w-full"
            >
              {displayConfig?.mediaFiles.map(file => (
                <SwiperSlide key={file.id}>
                  <img src={file.url} alt="" className="w-full h-full object-cover" />
                </SwiperSlide>
              ))}
              {(!displayConfig?.mediaFiles || displayConfig.mediaFiles.length === 0) && (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Sem conteúdo multimédia.
                </div>
              )}
            </Swiper>
          </div>
        </div>

        {/* Widgets de Senha */}
        <div className={`flex flex-col ${isVertical ? 'w-full h-1/3' : 'w-1/3 h-full'}`}>
          <div
            className="text-center rounded-lg p-4 lg:p-8 flex flex-col justify-center flex-grow shadow-lg transition-all duration-500"
            style={{ backgroundColor: uiConfig?.ticketCallWidget?.backgroundColor || '#ffffff' }}
          >
            <h1
              className="text-4xl lg:text-6xl font-bold uppercase tracking-wider"
              style={{ color: uiConfig?.ticketCallWidget?.titleColor || '#ca8a04' }}
            >
              SENHA
            </h1>
            <p
              className="text-8xl lg:text-9xl font-bold my-4 flex-grow flex items-center justify-center"
              style={{ color: uiConfig?.ticketCallWidget?.ticketNumberColor || '#000000' }}
            >
              {lastCalledTicket?.ticketNumber || '----'}
            </p>
            <p
              className="text-3xl lg:text-5xl font-semibold"
              style={{ color: uiConfig?.ticketCallWidget?.counterNameColor || '#000000' }}
            >
              BALCÃO {lastCalledTicket?.station?.name || '--'}
            </p>
          </div>

          <div
            className="rounded-lg p-4 lg:p-6 mt-4 shadow-lg"
            style={{ backgroundColor: uiConfig?.lastCalledWidget?.backgroundColor || '#1f2937' }}
          >
            <h2
              className="text-center lg:text-3xl font-bold mb-4 uppercase"
              style={{ color: uiConfig?.lastCalledWidget?.textColor || '#ffffff' }}
            >
              ÚLTIMAS CHAMADAS
            </h2>
            <ul className="space-y-4" style={{ color: uiConfig?.lastCalledWidget?.textColor || '#ffffff' }}>
              {ticketHistory.length === 0 && (
                <li className="text-center opacity-50">Histórico vazio</li>
              )}
              {ticketHistory.map(ticket => (
                <li
                  key={ticket.id}
                  className="flex justify-between text-lg lg:text-2xl opacity-70 border-b border-white/10 pb-2 last:border-0"
                >
                  <span className="font-bold">{ticket.ticketNumber}</span>
                  <span>Balcão {ticket.station?.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <footer
        className="flex-shrink-0 p-4 text-sm shadow-inner"
        style={{
          backgroundColor: uiConfig?.footerBackgroundColor || '#1f2937',
          color: uiConfig?.footerTextColor || '#9ca3af',
        }}
      >
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-2 text-center md:text-left">
            {displayConfig?.company.address && (
              <span>
                {displayConfig.company.address}, {displayConfig.company.postalCode}{' '}
                {displayConfig.company.locality}
              </span>
            )}
            <span className="hidden md:inline">
              {displayConfig?.company.address && displayConfig?.company.phone && (
                <>
                  <span>&bull;</span>
                  <span>{displayConfig.company.phone}</span>
                </>
              )}
              {(displayConfig?.company.address || displayConfig?.company.phone) &&
                displayConfig?.company.email && (
                  <>
                    <span>&bull;</span>
                    <span>{displayConfig.company.email}</span>
                  </>
                )}
            </span>
          </div>
          <div className="font-bold text-lg md:text-xl text-white">{currentTime.toLocaleString('pt-PT')}</div>
        </div>
      </footer>
    </div>
  );
};

export default DisplayPage;