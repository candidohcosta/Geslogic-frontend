// frontend/src/pages/EditKioskPage.tsx (VERSÃO COM PRINT SERVER IP)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createKiosk, 
  updateKiosk, 
  fetchKioskById, 
  fetchServices,
  fetchTestKioskHours
} from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { SingleFileUpload } from '../components/ui/SingleFileUpload';
import { FilePurpose } from '../types/file';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Printer, Network, MapPin } from 'lucide-react';

import { QzService } from '../utils/qz-service';
import { KioskQRCode } from '../components/kiosk/KioskQRCode';

interface SimpleServiceData { id: string; name: string; }
interface KioskData {
  id: string;
  name: string;
  deviceSecret: string;
  operatingHours: any;
  services: SimpleServiceData[];
  printerName?: string | null;
  printServerIp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofencingRadius?: number;  
  company: { id: string, slug: string,subscribedServices: string[] };
  uiConfig: { primaryColor?: string; buttonTextColor?: string; cardBackgroundColor?: string; pageBackgroundColor?: string; } | null;
  logo: { url: string; } | null;
}
interface KioskPayload {
  name?: string;
  operatingHours?: any;
  serviceIds?: string[];
  printerName?: string | null;
  printServerIp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofencingRadius?: number;  
  companyId?: string;
  uiConfig?: any;
  logo_file_id?: string | null;
}

// Helper para gerar todas as horas em intervalos de 30 minutos
/* const generateHoursOptions = (): string[] => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = String(h).padStart(2, '0');
      const minute = String(m).padStart(2, '0');
      options.push(`${hour}:${minute}`);
    }
  }
  return options;
};
const HOURS_OPTIONS = generateHoursOptions(); */

const EditKioskPage: React.FC = () => {
  const navigate = useNavigate();
  const { kioskId } = useParams<{ kioskId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!kioskId;
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // Estados
  const [name, setName] = useState('');
  const [operatingHoursStart, setOperatingHoursStart] = useState('09:00'); // <--- NOVO STATE
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('17:00');   
  //const [operatingHours, setOperatingHours] = useState('');
  const [printerName, setPrinterName] = useState<string>('');
  const [printServerIp, setPrintServerIp] = useState<string>(''); // <--- NOVO STATE
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  
  // NOVOS ESTADOS PARA GEOFENCING
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [geofencingRadius, setGeofencingRadius] = useState<string>('500');

  // UI Config States
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [buttonTextColor, setButtonTextColor] = useState('#ffffff');
  const [cardBackgroundColor, setCardBackgroundColor] = useState('#ffffff');
  const [pageBackgroundColor, setPageBackgroundColor] = useState('#f3f4f6');
  
  // QZ States
  const [printersList, setPrintersList] = useState<string[]>([]);
  const [isQzConnected, setIsQzConnected] = useState(false);
  const [qzError, setQzError] = useState<string | null>(null);

  const { data: kioskDetails, isLoading } = useQuery<KioskData, Error>({
    queryKey: ['kiosk', kioskId],
    queryFn: () => fetchKioskById(kioskId!),
    enabled: isEditing,
  });

  const companyIdForFetch = useMemo(() => {
    if (isEditing && kioskDetails) return kioskDetails.company.id;
    if (user?.role === UserRole.PLATFORM_ADMIN) return queryParams.get('companyId');
    return user?.company?.id;
  }, [kioskDetails, isEditing, user, queryParams]);
  
  const { data: availableServices = [] } = useQuery<SimpleServiceData[]>({
    queryKey: ['services', companyIdForFetch],
    queryFn: () => fetchServices(companyIdForFetch ?? undefined),
    enabled: !!companyIdForFetch,
  });

  useEffect(() => {
    if (isEditing && kioskDetails) {
      setName(kioskDetails.name);
      setPrinterName(kioskDetails.printerName || '');
      setPrintServerIp(kioskDetails.printServerIp || ''); // <--- CARREGAR
      setSelectedServiceIds(new Set(kioskDetails.services?.map(s => s.id) || []));

      // --- CORREÇÃO CRÍTICA AQUI ---
      let hours: { start?: string, end?: string } | null = null;
      
      // 1. Verificar se o campo existe
      if (kioskDetails.operatingHours) {
        // 2. Tentar PARSEAR a string JSON (porque o backend a devolve stringificada)
        try {
            // Se já for um objeto, usa. Se for uma string, faz JSON.parse.
            hours = typeof kioskDetails.operatingHours === 'string' 
                ? JSON.parse(kioskDetails.operatingHours) 
                : kioskDetails.operatingHours;
        } catch (e) {
            console.error("Erro ao fazer parse de operatingHours:", e);
        }
      }

      // Geofencing
      setLatitude(kioskDetails.latitude?.toString() || '');
      setLongitude(kioskDetails.longitude?.toString() || '');
      setGeofencingRadius(kioskDetails.geofencingRadius?.toString() || '500');      

      // 3. Aplicar os estados
      if (hours && hours.start && hours.end) {
        setOperatingHoursStart(hours.start);
        setOperatingHoursEnd(hours.end);
      } else {
        // Fallback (o que estava a acontecer)
        setOperatingHoursStart('09:00');
        setOperatingHoursEnd('17:00');
      }


      if (kioskDetails.uiConfig) {
        setPrimaryColor(kioskDetails.uiConfig.primaryColor || '#4f46e5');
        setButtonTextColor(kioskDetails.uiConfig.buttonTextColor || '#ffffff');
        setCardBackgroundColor(kioskDetails.uiConfig.cardBackgroundColor || '#ffffff'); 
        setPageBackgroundColor(kioskDetails.uiConfig.pageBackgroundColor || '#f3f4f6');        
      }      
    }
  }, [kioskDetails, isEditing]);

  const { mutate: saveKiosk, isPending } = useMutation({
    mutationFn: (kioskPayload: KioskPayload) => isEditing ? updateKiosk({ id: kioskId!, kioskData: kioskPayload }) : createKiosk(kioskPayload),
    onSuccess: (data: any, variables) => {
      const companyId = isEditing ? kioskDetails?.company?.id : variables.companyId;
      queryClient.invalidateQueries({ queryKey: ['kiosks', companyId] });
      navigate(`/kiosks/company/${companyId}`);
    },
  });
  
  const { mutate: updateKioskFile } = useMutation({
    mutationFn: (payload: { logo_file_id: string | null }) => updateKiosk({ id: kioskId!, kioskData: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kiosk', kioskId] }),
  });

  // Função de Teste de Horário
const handleTestHours = async () => {
    if (!kioskId) return;
    try {
        const result = await fetchTestKioskHours(kioskId);
        
        // --- CÓDIGO LIMPO ---
        const status = result.isOpen ? 'ABERTO' : 'FECHADO';
        // Acessamos diretamente, pois o Backend já garante que hours não é NULL
        const hoursDisplay = `Horário: ${result.hours.start} - ${result.hours.end}`;
        
        alert(`O quiosque está ${status}. ${hoursDisplay}`);
        
    } catch (e: any) {
        alert(`Erro ao testar horário: ${e.message}`);
    }
  }

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) newSet.delete(serviceId); else newSet.add(serviceId);
      return newSet;
    });
  };

  // --- DETEÇÃO DE IMPRESSORAS ---
  const handleDetectPrinters = async () => {
    setQzError(null);
    try {
        // Usa o IP definido ou 'localhost' por defeito
        const hostToConnect = printServerIp || 'localhost';
        
        const printers = await QzService.connectAndListPrinters(hostToConnect);
        
        console.log("Impressoras recebidas:", printers);
        setPrintersList(printers);
        setIsQzConnected(true);
        
        if (printers.length === 0) setQzError("Nenhuma impressora encontrada.");

    } catch (err: any) {
        console.error("Erro na página:", err);
        setQzError("Erro: " + (err.message || err));
        setIsQzConnected(false);
    }
  };

const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("O seu navegador não suporta geolocalização.");
      return;
    }

    // Verificar se o contexto é seguro (HTTPS ou Localhost)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        alert("A geolocalização automática exige uma ligação segura (HTTPS). Por favor, insira as coordenadas manualmente ou use localhost.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
        alert("Localização detetada com sucesso!");
      },
      (err) => {
        if (err.code === 1) {
            alert("Permissão negada. Por favor, ative o acesso à localização nas definições do seu navegador (clique no ícone ao lado do URL).");
        } else {
            alert("Erro ao obter localização: " + err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { alert("O nome é obrigatório."); return; }

    // Validação de horário
    if (operatingHoursStart >= operatingHoursEnd) {
        alert("O horário de fecho deve ser posterior ao horário de abertura.");
        return;
    }

    const payload: KioskPayload = {
      name,
      operatingHours: JSON.stringify({ start: operatingHoursStart, end: operatingHoursEnd }),
      serviceIds: Array.from(selectedServiceIds),
      printerName: printerName || null,
      printServerIp: printServerIp || null,
      // Conversão segura para números ou null
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      geofencingRadius: Number(geofencingRadius),      
      companyId: isEditing ? undefined : (companyIdForFetch ?? undefined),
      uiConfig: { primaryColor, buttonTextColor, cardBackgroundColor, pageBackgroundColor }
    };

    saveKiosk(payload);
  };
  
  const isQueuesSubscribed = useMemo(() => {
    // 1. Se estivermos a editar, a subscrição está nos detalhes do quiosque
    if (isEditing && kioskDetails) {
        return kioskDetails.company.subscribedServices?.includes('QUEUES');
    }
    // 2. Se estivermos a criar (e for Company Admin), está no user logado
    if (user?.role === UserRole.COMPANY_ADMIN) {
        return user.company?.subscribedServices?.includes('QUEUES');
    }
    // 3. Se for Platform Admin, precisamos de ter o ID da empresa alvo, 
    //    mas para o QR Code de edição, basta mostrar.
    //    Simplificação: O PlatformAdmin deve ver o QR Code se a empresa estiver subscrita.
    //    Como o 'kioskDetails' já tem toda a info, o ponto 1 é o que precisamos.
    return false;
  }, [isEditing, kioskDetails, user]);

  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) return <Navigate to="/dashboard" />;
  if (isEditing && isLoading) return <div className="p-6 text-center">A carregar quiosque...</div>;

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader><CardTitle>{isEditing ? 'Editar Quiosque' : 'Criar Novo Quiosque'}</CardTitle><CardDescription>Defina os detalhes e os serviços.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full items-center gap-1.5"><Label htmlFor="name">Nome do Quiosque *</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            {isEditing && kioskDetails?.deviceSecret && (
              <div className="grid w-full items-center gap-1.5"><Label>Chave Secreta</Label><div className="flex gap-2"><Input value={kioskDetails.deviceSecret} readOnly className="bg-gray-50" /><Button type="button" variant="outline" onClick={() => {navigator.clipboard.writeText(kioskDetails.deviceSecret); alert("Copiado!");}}>Copiar</Button></div></div>
            )}
          <div className="grid w-full items-center gap-1.5 pt-2 border-t">
              <Label>Horário de Funcionamento (HH:MM)</Label>
              <div className="flex gap-2 items-center">
                  {/* Inputs de Horário */}
                  <Input 
                      type="time"
                      value={operatingHoursStart}
                      onChange={(e) => setOperatingHoursStart(e.target.value)}
                      disabled={!isEditing}
                      step="300"
                      className="flex-grow"
                  />
                  <span className="flex-shrink-0">-</span>
                  <Input 
                      type="time"
                      value={operatingHoursEnd}
                      onChange={(e) => setOperatingHoursEnd(e.target.value)}
                      disabled={!isEditing}
                      step="300"
                      className="flex-grow"
                  />
                  
                  {/* Botão de Teste (Aparece ao lado dos Inputs) */}
                  {isEditing && kioskId && (
                      <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={handleTestHours} 
                          className="flex-shrink-0"
                      >
                          Testar Agora
                      </Button>
                  )}
              </div>
              <p className="text-xs text-muted-foreground">O quiosque não permitirá tirar senha fora deste horário.</p>
            </div>

          {/* NOVO BLOCO: LOCALIZAÇÃO GPS */}
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-500" /> Segurança por Localização (Geofencing)
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={handleDetectLocation}>
                    Usar minha posição atual
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-1.5">
                    <Label className="text-xs">Latitude</Label>
                    <Input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Ex: 38.716" />
                </div>
                <div className="grid gap-1.5">
                    <Label className="text-xs">Longitude</Label>
                    <Input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Ex: -9.133" />
                </div>
                <div className="grid gap-1.5">
                    <Label className="text-xs">Raio de Validação (metros)</Label>
                    <Input type="number" value={geofencingRadius} onChange={e => setGeofencingRadius(e.target.value)} />
                </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
                Se as coordenadas forem preenchidas, os utilizadores só poderão tirar senhas móveis se estiverem dentro do raio definido.
            </p>
          </div>

            <div className="grid w-full items-center gap-1.5 pt-2"><Label>Serviços Disponíveis</Label><div className="space-y-2 p-4 border rounded-md max-h-48 overflow-y-auto">{availableServices.map((service) => (
                <div key={service.id} className="flex items-center space-x-2"><Checkbox id={`service-${service.id}`} checked={selectedServiceIds.has(service.id)} onCheckedChange={() => handleServiceToggle(service.id)} /><Label htmlFor={`service-${service.id}`} className="font-normal">{service.name}</Label></div>
              ))}</div></div>
          </form>
        </CardContent>
        <CardFooter className="justify-end"><Button onClick={handleSubmit} disabled={isPending}>{isPending ? 'A Guardar...' : 'Guardar Quiosque'}</Button></CardFooter>
      </Card>

      {/* --- NOVO BLOCO: QR CODE ESPECÍFICO --- */}
      {isEditing && kioskDetails && isQueuesSubscribed && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Ponto de Acesso Móvel</CardTitle>
            <CardDescription>
                Este QR Code dá acesso **apenas** aos serviços configurados neste quiosque.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <KioskQRCode 
              companySlug={kioskDetails.company.slug} 
              kioskId={kioskDetails.id}
              kioskName={kioskDetails.name}
            />
          </CardContent>
        </Card>
      )}

      {/* --- HARDWARE --- */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader><CardTitle className="flex items-center gap-2"><Printer className="w-5 h-5" /> Configuração de Hardware</CardTitle><CardDescription>Configure a impressora de talões.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            {/* IP DO SERVIDOR DE IMPRESSÃO */}
            <div className="grid w-full items-center gap-1.5">
                <Label className="flex items-center gap-2"><Network className="w-4 h-4" /> IP do Servidor de Impressão (Opcional)</Label>
                <Input 
                    placeholder="Ex: 192.168.1.200 (Deixe vazio para usar este PC)" 
                    value={printServerIp} 
                    onChange={(e) => setPrintServerIp(e.target.value)} 
                />
                <p className="text-xs text-muted-foreground">Use isto se o quiosque for um Tablet e a impressora estiver ligada a um PC/Raspberry Pi na rede.</p>
            </div>

            <div className="grid w-full items-center gap-1.5">
                <Label>Impressora de Talões</Label>
                <div className="flex gap-2">
                    {isQzConnected ? (
                        <Select value={printerName} onValueChange={setPrinterName}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a impressora..." /></SelectTrigger>
                            <SelectContent>{printersList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                    ) : (
                        <Input value={printerName} onChange={(e) => setPrinterName(e.target.value)} placeholder="Nome da impressora (ou clique Detetar)" />
                    )}
                    <Button type="button" variant="secondary" onClick={handleDetectPrinters}>
                        {isQzConnected ? 'Atualizar' : 'Detetar'}
                    </Button>
                </div>
                {qzError && <p className="text-sm text-red-500 mt-1">{qzError}</p>}
            </div>
        </CardContent>
      </Card>

      {/* VISUAL (Resumido para poupar espaço visual) */}
      {isEditing && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader><CardTitle>Visual</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5"><Label>Logótipo</Label><SingleFileUpload ownerType="Kiosk" ownerId={kioskId!} purpose={FilePurpose.KIOSK_LOGO} currentFileUrl={kioskDetails?.logo?.url} onUploadSuccess={(newFile) => updateKioskFile({ logo_file_id: newFile.id })} onFileClear={() => updateKioskFile({ logo_file_id: null })} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5"><Label>Cor Primária</Label><Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 p-1" /></div>
              <div className="grid w-full items-center gap-1.5"><Label>Cor do Texto</Label><Input type="color" value={buttonTextColor} onChange={(e) => setButtonTextColor(e.target.value)} className="h-10 p-1" /></div>
              <div className="grid w-full items-center gap-1.5"><Label>Fundo Cartão</Label><Input type="color" value={cardBackgroundColor} onChange={(e) => setCardBackgroundColor(e.target.value)} className="h-10 p-1"/></div>
              <div className="grid w-full items-center gap-1.5"><Label>Fundo Página</Label><Input type="color" value={pageBackgroundColor} onChange={(e) => setPageBackgroundColor(e.target.value)} className="h-10 p-1"/></div>              
            </div>
          </CardContent>
        </Card>
      )}
      <div className="w-full max-w-2xl mx-auto"><Button variant="outline" className="w-full" onClick={() => navigate(-1)}>Voltar</Button></div>
    </div>
  );
};

export default EditKioskPage;