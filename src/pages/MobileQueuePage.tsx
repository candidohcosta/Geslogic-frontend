// frontend/src/pages/MobileQueuePage.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate  } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  fetchPublicServices, 
  createMobileTicket, 
  fetchPublicTicketStatus, 
  fetchPushPublicKey, 
  subscribeToPush,
  submitTicketFeedback // <--- Garantir este import
} from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { 
  Loader2, Users, Ticket as TicketIcon, Clock, LogOut, 
  MapPin, BellRing, CheckCircle2, Star, Send 
} from 'lucide-react';
import { TicketStatus } from '../types/queue';

// --- INTERFACES ---
interface Service { id: string; name: string; waitingCount: number; }

interface CompanyData { 
  name: string; 
  logoUrl?: string; 
  latitude?: number;
  longitude?: number;
  geofencingRadius?: number;
}

interface ServicesResponse { 
  company: CompanyData; 
  services: Service[]; 
  location?: {
    latitude: number;
    longitude: number;
    geofencingRadius: number;
  };
}

// Renomeado para evitar conflito com o Enum TicketStatus
interface TicketTrackingInfo { 
  status: TicketStatus; 
  ticketNumber: string; 
  serviceName: string;
  peopleAhead: number; 
  estimatedWaitMinutes: number;
}

// --- UTILITÁRIO ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const MobileQueuePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [activeTicketId, setActiveTicketId] = useState<string | null>(() => {
    const urlId = searchParams.get('ticketId');
    if (urlId && slug) {
        localStorage.setItem(`geslogic_ticket_${slug}`, urlId);
        return urlId;
    }
    return slug ? localStorage.getItem(`geslogic_ticket_${slug}`) : null;
  });

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'IDLE' | 'CHECKING' | 'DENIED'>('IDLE');
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const prevStatusRef = useRef<TicketStatus | null>(null);
  const audioAlertRef = useRef<HTMLAudioElement | null>(null);

  // --- QUERIES ---
  const { data: pageData, isLoading: isLoadingServices } = useQuery<ServicesResponse>({
    queryKey: ['publicServices', slug],
    queryFn: () => fetchPublicServices(slug!),
    enabled: !!slug && !activeTicketId,
  });

  const { data: ticketTracking, isLoading: isLoadingTicket, error: ticketError } = useQuery<TicketTrackingInfo, Error>({
    queryKey: ['myTicket', activeTicketId],
    queryFn: () => fetchPublicTicketStatus(activeTicketId!),
    enabled: !!activeTicketId,
    refetchInterval: 5000,
  });

  // --- MUTAÇÕES ---
  const { mutate: takeTicket, isPending: isTakingTicket } = useMutation({
    mutationFn: (serviceId: string) => createMobileTicket(slug!, serviceId),
    onSuccess: (data) => {
      localStorage.setItem(`geslogic_ticket_${slug!}`, data.id);
      setActiveTicketId(data.id);
    }
  });

  const { mutate: sendFeedback, isPending: isSendingFeedback } = useMutation({
    mutationFn: () => submitTicketFeedback(activeTicketId!, rating, comment),
    onSuccess: () => {
      // 1. Limpar IMEDIATAMENTE os vestígios da senha no telemóvel
      localStorage.removeItem(`geslogic_ticket_${slug}`);
      
      // 2. Marcar como submetido para mostrar o agradecimento
      setFeedbackSubmitted(true);
      
      // 3. Reset do ID ativo para que, se ele fizer refresh, veja a lista inicial
      setActiveTicketId(null);

      // 4. Redirecionar após um breve momento de agradecimento
      setTimeout(() => {
        // Redireciona para a raiz da empresa ou landing page
        // O { replace: true } impede que o utilizador volte atrás para o formulário
        navigate(`/q/${slug}`, { replace: true });
      }, 3000);
    },
    onError: (err: any) => {
        // Se já foi avaliada, limpamos também para não ficar em loop
        if (err.message.includes('avaliada')) {
            localStorage.removeItem(`geslogic_ticket_${slug}`);
            setActiveTicketId(null);
            navigate(`/q/${slug}`, { replace: true });
        } else {
            alert(err.message);
        }
    }
  });

  // --- EFEITO 1: GESTÃO DE ERROS E LIMPEZA (O QUE JÁ TINHAS) ---
  useEffect(() => {
    if (ticketError && slug) {
        localStorage.removeItem(`geslogic_ticket_${slug}`);
        setActiveTicketId(null);
    }
  }, [ticketError, slug]);

  // --- EFEITO 2: ALERTA DE CHAMADA (SOM E VIBRAÇÃO) ---
  useEffect(() => {
    if (ticketTracking?.status) {
      // Definimos o que é uma "chamada ativa" para o utente
      const isCurrentlyCalled = 
        ticketTracking.status === TicketStatus.CALLED || 
        ticketTracking.status === TicketStatus.IN_SERVICE;

      // LÓGICA DE TRANSIÇÃO:
      // Se antes estava em ESPERA e agora está CHAMADA ou EM SERVIÇO
      if (prevStatusRef.current === TicketStatus.WAITING && isCurrentlyCalled) {
        
        // 1. Tocar o Som (Ding)
        if (audioAlertRef.current) {
          audioAlertRef.current.currentTime = 0;
          audioAlertRef.current.play().catch(err => 
            console.warn("Som bloqueado: O browser exige interação prévia do utilizador.", err)
          );
        }

        // 2. Vibrar o telemóvel (se suportado)
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]); // padrão: vibra, pausa, vibra
        }
      }

      // Atualizar a referência para a próxima verificação (daqui a 5s)
      prevStatusRef.current = ticketTracking.status;
    }
  }, [ticketTracking?.status]);

  // --- HANDLERS ---
  const handleTakeTicketAttempt = (serviceId: string) => {
    if (pageData?.location?.latitude && pageData?.location?.longitude) {
      setLocationStatus('CHECKING');
      navigator.geolocation.getCurrentPosition((pos) => {
          const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, pageData.location!.latitude, pageData.location!.longitude);
          if (dist > pageData.location!.geofencingRadius) {
            alert(`Está a ${Math.round(dist)}m. Aproxime-se para tirar senha.`);
            setLocationStatus('DENIED');
          } else {
            takeTicket(serviceId);
          }
        }, () => {
          alert("Necessitamos da localização para validar a senha.");
          setLocationStatus('DENIED');
        }, { enableHighAccuracy: true });
    } else {
      takeTicket(serviceId);
    }
  };

  const handleEnablePush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const registration = await navigator.serviceWorker.register('/sw.js');
      const { publicKey } = await fetchPushPublicKey();
      const convertedKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
      await subscribeToPush(activeTicketId!, subscription);
      setIsPushEnabled(true);
    } catch (err) { console.error(err); }
  };

  const handleLeaveQueue = () => {
    if (window.confirm("Deseja sair da fila?") && slug) {
      localStorage.removeItem(`geslogic_ticket_${slug}`);
      setActiveTicketId(null);
    }
  };

  // --- RENDERING LOGIC ---
  if (!slug) return <div className="p-10 text-center">Configuração inválida.</div>;

  if (activeTicketId) {
    if (isLoadingTicket && !ticketTracking) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    const isCalled = ticketTracking?.status === TicketStatus.CALLED || ticketTracking?.status === TicketStatus.IN_SERVICE;
    const isWaiting = ticketTracking?.status === TicketStatus.WAITING;
    const isCompleted = ticketTracking?.status === TicketStatus.COMPLETED;
    const supportsPush = 'Notification' in window && 'serviceWorker' in navigator;

    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
        <Card className={`w-full max-w-sm shadow-2xl border-t-8 transition-all duration-500 ${isCalled ? 'border-t-green-500 animate-pulse' : isCompleted ? 'border-t-yellow-400' : 'border-t-blue-600'}`}>
          <CardHeader className="text-center pb-2">
            <CardDescription className="uppercase tracking-widest font-bold text-[10px]">A sua vez no telemóvel</CardDescription>
            <CardTitle className="text-6xl font-black text-gray-900 mt-2">{ticketTracking?.ticketNumber}</CardTitle>
            <p className="text-sm text-gray-500 font-medium mt-1">{ticketTracking?.serviceName}</p>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center pt-4">
            {isCalled ? (
              <div className="bg-green-100 text-green-800 p-6 rounded-2xl border border-green-200">
                <p className="text-3xl font-black mb-1">SUA VEZ!</p>
                <p className="text-sm">Dirija-se ao balcão indicado.</p>
              </div>
            ) : isWaiting ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-3xl font-black text-blue-700">{ticketTracking?.peopleAhead}</p>
                    <p className="text-[10px] uppercase font-bold text-blue-600">À frente</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-2xl border border-gray-200">
                    <Clock className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                    <p className="text-3xl font-black text-gray-700">~{ticketTracking?.estimatedWaitMinutes || 0}m</p>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Espera</p>
                  </div>
                </div>
                {supportsPush && !isPushEnabled && (
                  <Button variant="outline" className="w-full bg-yellow-50 border-yellow-200 text-yellow-700 py-4 h-auto" onClick={handleEnablePush}>
                    <BellRing className="w-4 h-4 mr-2" /> Ativar Alerta
                  </Button>
                )}
                {isPushEnabled && <p className="text-[10px] text-green-600 font-bold">✓ Notificações Ativas</p>}
              </>
            ) : isCompleted ? (
                <div className="space-y-4 py-2">
                    {!feedbackSubmitted ? (
                        <>
                            <h3 className="text-xl font-bold">Atendimento concluído!</h3>
                            <p className="text-sm text-gray-500">Como avalia a sua experiência?</p>
                            <div className="flex justify-center gap-2 py-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} onClick={() => setRating(star)}>
                                        <Star className={`w-8 h-8 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                    </button>
                                ))}
                            </div>
                            {rating > 0 && (
                                <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                                    <textarea placeholder="Comentário (opcional)..." className="w-full p-3 bg-gray-50 border rounded-xl text-sm outline-none" value={comment} onChange={(e) => setComment(e.target.value)} />
                                    <Button className="w-full bg-black text-white" onClick={() => sendFeedback()} disabled={isSendingFeedback}>Enviar Avaliação</Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-green-600 font-bold text-lg py-6">Muito Obrigado! ⭐</p>
                    )}
                </div>
            ) : (
               <div className="bg-gray-200 text-gray-600 p-4 rounded-xl">
                 <p className="font-bold">Senha Finalizada</p>
                 <p className="text-xs">Estado: {ticketTracking?.status}</p>
               </div>
            )}

            {!isCompleted && (
                <div className="pt-4 border-t space-y-2">
                    {(isWaiting || isCalled) && <Button variant="ghost" className="w-full text-red-400 text-xs" onClick={handleLeaveQueue}>Sair da Fila</Button>}
                    <Button className="w-full" onClick={() => { slug && localStorage.removeItem(`geslogic_ticket_${slug}`); setActiveTicketId(null); }}>Tirar Nova Senha</Button>
                </div>
            )}
          </CardContent>
        </Card>
        <div className="mt-8 flex items-center gap-2 text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Live Updates Ativos</span>
        </div>

      {/* Elemento de áudio invisível para os alertas */}
      <audio 
        ref={audioAlertRef} 
        src="/assets/sounds/notification.mp3" 
        preload="auto" 
      />
      </div>
    );
  }

  // --- RENDER: LISTA DE SERVIÇOS ---
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center py-8">
            {pageData?.company.logoUrl && <img src={pageData.company.logoUrl} alt="Logo" className="h-16 mx-auto mb-4 object-contain shadow-sm rounded-lg" />}
            <h1 className="text-2xl font-black text-gray-900">{pageData?.company.name}</h1>
            <p className="text-gray-500 text-sm mt-1">Selecione o serviço pretendido</p>
        </div>
        {isLoadingServices ? (
            <div className="text-center p-12"><Loader2 className="animate-spin w-10 h-10 mx-auto text-blue-600" /></div>
        ) : (
            <div className="space-y-3">
                {pageData?.services.map(service => (
                    <button key={service.id} disabled={locationStatus === 'CHECKING' || isTakingTicket} className="w-full text-left bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex justify-between items-center" onClick={() => handleTakeTicketAttempt(service.id)}>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">{service.name}</h3>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Users className="w-3 h-3" /> {service.waitingCount} em espera</p>
                        </div>
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">{locationStatus === 'CHECKING' ? <Loader2 className="animate-spin w-5 h-5" /> : <TicketIcon className="w-5 h-5" />}</div>
                    </button>
                ))}
            </div>
        )}
        {locationStatus === 'CHECKING' && <div className="text-center text-xs text-blue-600 font-bold animate-pulse"><MapPin className="w-3 h-3 inline mr-1" /> Validando localização...</div>}
      </div>
    </div>
  );
};

export default MobileQueuePage;