// frontend/src/pages/DevicesStatusPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  fetchDevicesStatus, 
  reloadDevice, 
  fetchCompanies, 
  fetchAggregatedUptimeDetailed 
} from '../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RefreshCw, Monitor, Tv, Building2, Activity, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import UptimeModal from '../components/devices/UptimeModal';

// --- INTERFACES ---
interface AggregatedUptimeDevice {
    id: string;
    type: 'KIOSK' | 'DISPLAY';
    name: string;
    totalUptimePercent: string;
    hourlyUptime: any[];
}

const DevicesStatusPage: React.FC = () => {
  const { user } = useAuth();

  // 1. O ID da empresa que DEVE ser usado na API (Fonte da Verdade)
  const requiredCompanyId = useMemo(() => {
    // CompanyAdmin: SEMPRE usa o seu ID (não pode ver ALL)
    if (user?.role === UserRole.COMPANY_ADMIN) return user.company?.id;
    // PlatformAdmin: Usa o ID do state (selecionado) ou 'ALL'
    return null; // Inicialmente null, o PlatformAdmin usa o state local
  }, [user]);
  
  // 2. Estado local para o PlatformAdmin (Ele pode mudar)
  const [localSelectedCompanyId, setLocalSelectedCompanyId] = useState<string>('ALL'); // State para a dropdown

  // 3. O ID final que vai para o backend
  const companyIdForAPI = requiredCompanyId || localSelectedCompanyId;
  const companyIdForApiCall = companyIdForAPI === 'ALL' ? undefined : companyIdForAPI;

  const [uptimeDays, setUptimeDays] = useState('7');
  
  // Estado para o Modal
  const [modalDeviceId, setModalDeviceId] = useState<string | null>(null);

  // 1. Query: Lista de Empresas (Só Platform Admin)
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // 2. Query: Status em Tempo Real (Online/Offline)
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['devicesStatus', companyIdForAPI],
    queryFn: () => fetchDevicesStatus(companyIdForApiCall),
    refetchInterval: 30000, 
    enabled: !!user && (!!requiredCompanyId || companyIdForAPI === 'ALL'),
  });

  // 3. Query: Uptime Detalhado (Matemática e Gráfico)
  const { data: uptimeDetailedData = [], isLoading: isLoadingUptime } = useQuery<AggregatedUptimeDevice[]>({
    queryKey: ['devicesUptimeDetailed', companyIdForAPI, uptimeDays],
    queryFn: () => fetchAggregatedUptimeDetailed(
        companyIdForApiCall,
        Number(uptimeDays)
    ),
    enabled: !!user && (!!requiredCompanyId || companyIdForAPI === 'ALL'),
  });
  
  // 4. FUSÃO DE DADOS: Junta o Status com o Uptime
const dataWithUptime = useMemo(() => {
    // 1. Criar um mapa de consulta rápida
    const uptimeMap = new Map();
    if (Array.isArray(uptimeDetailedData)) {
        uptimeDetailedData.forEach(d => uptimeMap.set(d.id, d));
    }
    
    // 2. Função de fusão
    const merge = (device: any) => {
        const upInfo = uptimeMap.get(device.id);
        return {
            ...device,
            // Se o upInfo existir, usa a percentagem do backend, senão 0.00%
            totalUptimePercent: upInfo ? upInfo.totalUptimePercent : '0.00%',
            hourlyUptime: upInfo ? upInfo.hourlyUptime : []
        };
    };

    return {
        kiosks: (statusData?.kiosks || []).map(merge),
        displays: (statusData?.displays || []).map(merge),
    };
  }, [statusData, uptimeDetailedData]);

  // 5. Selecionar dispositivo para o Modal
  const deviceToDisplay = useMemo(() => {
    if (!modalDeviceId) return null;
    const allDevices = [...dataWithUptime.kiosks, ...dataWithUptime.displays];
    return allDevices.find((d: any) => d.id === modalDeviceId);
  }, [modalDeviceId, dataWithUptime]);

  const { mutate: reload } = useMutation({
    mutationFn: ({ type, id }: { type: string, id: string }) => reloadDevice(type, id),
    onSuccess: () => alert("Comando de reinício enviado!")
  });

  // 6. RENDER DA LISTA
  const renderDeviceList = (list: any[], type: 'KIOSK' | 'DISPLAY') => (
    <div className="space-y-4">
        {list.map(device => (
            <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                    {/* Indicador Online/Offline */}
                    <div className={`w-3 h-3 rounded-full ${device.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    
                    <div>
                        <button 
                            className="text-left group" 
                            onClick={() => setModalDeviceId(device.id)}
                        >
                            <p className="font-bold text-gray-800 group-hover:text-blue-600 group-hover:underline">{device.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                                {device.lastHeartbeat ? `Visto: ${new Date(device.lastHeartbeat).toLocaleTimeString()}` : 'Nunca visto'}
                            </p>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium uppercase">Uptime:</span>
                        <span className={`font-mono font-bold ${parseFloat(device.totalUptimePercent) > 90 ? 'text-green-600' : 'text-orange-500'}`}>
                            {device.totalUptimePercent || '0.00%'}
                        </span>
                    </div>
                    
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-[10px] uppercase text-gray-500"
                        disabled={!device.isOnline} 
                        onClick={() => reload({ type, id: device.id })}
                    >
                        <RefreshCw className="w-3 h-3 mr-1" /> Reiniciar
                    </Button>
                </div>
            </div>
        ))}
        {list.length === 0 && !isLoadingStatus && (
            <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                Nenhum dispositivo encontrado.
            </p>
        )}
    </div>
  );

  if (isLoadingStatus && !statusData) return <div className="p-8 text-center">A carregar estado dos dispositivos...</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Activity className="text-blue-600" /> Monitorização de Rede
                </h1>
                <p className="text-sm text-gray-500">Estado e performance dos terminais em tempo real.</p>
            </div>

            <div className="flex items-center gap-3">
                {user?.role === UserRole.PLATFORM_ADMIN && (
                    <Select value={localSelectedCompanyId} onValueChange={setLocalSelectedCompanyId}>
                        <SelectTrigger className="w-56 bg-white border-gray-300">
                            <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                            <SelectValue placeholder="Empresa" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas as Empresas</SelectItem>
                            {companies.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                
                <div className="flex items-center bg-white border rounded-md px-2 h-10">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    <Select value={uptimeDays} onValueChange={setUptimeDays}>
                        <SelectTrigger className="border-0 shadow-none focus:ring-0 w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 Dia</SelectItem>
                            <SelectItem value="7">7 Dias</SelectItem>
                            <SelectItem value="30">30 Dias</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                    <Monitor className="w-4 h-4" /> Quiosques
                </h2>
                {renderDeviceList(dataWithUptime.kiosks, 'KIOSK')}
            </section>

            <section className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                    <Tv className="w-4 h-4" /> Displays
                </h2>
                {renderDeviceList(dataWithUptime.displays, 'DISPLAY')}
            </section>
        </div>

        {/* MODAL DE DETALHES (GRÁFICO) */}
        {modalDeviceId && deviceToDisplay && (
            <UptimeModal 
                deviceName={deviceToDisplay.name}
                deviceType={deviceToDisplay.type}
                uptimePercent={deviceToDisplay.totalUptimePercent}
                hourlyData={deviceToDisplay.hourlyUptime || []}
                days={Number(uptimeDays)}
                onClose={() => setModalDeviceId(null)}
            />
        )}
    </div>
  );
};

export default DevicesStatusPage;