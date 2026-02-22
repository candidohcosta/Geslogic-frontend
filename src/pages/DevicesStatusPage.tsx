// frontend/src/pages/DevicesStatusPage.tsx
// Migrada para UtilityPageTemplate: sem <Page>, com header + optionsBar padronizados e grid 2 colunas.

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchDevicesStatus,
  reloadDevice,
  fetchCompanies,
  fetchAggregatedUptimeDetailed
} from '../services/api';

import { Button } from '../components/ui/Button';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue
} from '../components/ui/Select';

import { StandardCard as Card } from '../components/ui/StandardCard';
import { Activity, Tv, Monitor, Clock, RefreshCw } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import UptimeModal from '../components/devices/UptimeModal';
import { CompanySelect } from '../components/common/CompanySelect';
import { UtilityPageTemplate, UtilitySection  } from '../components/templates/UtilityPageTemplate';

interface AggregatedUptimeDevice {
  id: string;
  type: 'KIOSK' | 'DISPLAY';
  name: string;
  totalUptimePercent: string;
  hourlyUptime: any[];
}

const DevicesStatusPage: React.FC = () => {
  const { user } = useAuth();

  // CompanyAdmin: empresa fixa; PlatformAdmin: dropdown local (ALL por defeito)
  const [localSelectedCompanyId, setLocalSelectedCompanyId] = useState<string>('ALL');
  const requiredCompanyId = user?.role === UserRole.COMPANY_ADMIN ? user.company?.id : null;

  const companyIdForAPI = requiredCompanyId || localSelectedCompanyId;
  const companyIdForApiCall = companyIdForAPI === 'ALL' ? undefined : companyIdForAPI;
  const companyKey = companyIdForApiCall ?? 'ALL';

  const [uptimeDays, setUptimeDays] = useState('7');
  const [modalDeviceId, setModalDeviceId] = useState<string | null>(null);

  // Empresas (apenas Platform Admin)
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // Status dos devices (REFRESH a cada 30s)
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['devicesStatus', companyKey],
    queryFn: () => fetchDevicesStatus(companyIdForApiCall),
    refetchInterval: 30000,
    enabled: !!user,
  });

  // Uptime detalhado (empresa + dias)
  const { data: uptimeDetailedData = [] } = useQuery<AggregatedUptimeDevice[]>({
    queryKey: ['devicesUptimeDetailed', companyKey, uptimeDays],
    queryFn: () => fetchAggregatedUptimeDetailed(companyIdForApiCall, Number(uptimeDays)),
    enabled: !!user,
  });

  // Juntar status + uptime
  const dataWithUptime = useMemo(() => {
    const map = new Map();
    (uptimeDetailedData || []).forEach((d) => map.set(d.id, d));

    const merge = (device: any) => {
      const u = map.get(device.id);
      return {
        ...device,
        totalUptimePercent: u?.totalUptimePercent || '0.00%',
        hourlyUptime: u?.hourlyUptime || [],
      };
    };

    return {
      kiosks: (statusData?.kiosks || []).map(merge),
      displays: (statusData?.displays || []).map(merge),
    };
  }, [statusData, uptimeDetailedData]);

  // Device para o modal
  const deviceToDisplay = useMemo(() => {
    if (!modalDeviceId) return null;
    return [...dataWithUptime.kiosks, ...dataWithUptime.displays].find((d: any) => d.id === modalDeviceId);
  }, [modalDeviceId, dataWithUptime]);

  // Reiniciar device
  const { mutate: reload } = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => reloadDevice(type, id),
    onSuccess: () => alert('Comando de reinício enviado!'),
  });

  // Componente para uma "row" de device
  const renderDeviceRow = (device: any, type: 'KIOSK' | 'DISPLAY') => (
    <div
      key={device.id}
      className="flex items-center justify-between rounded-md border p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`w-3 h-3 rounded-full ${device.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
        />
        <button className="text-left group min-w-0" onClick={() => setModalDeviceId(device.id)}>
          <p className="font-bold group-hover:text-blue-600 group-hover:underline truncate">{device.name}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
            {device.lastHeartbeat
              ? `Visto: ${new Date(device.lastHeartbeat).toLocaleTimeString()}`
              : 'Nunca visto'}
          </p>
        </button>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium uppercase">Uptime:</span>
          <span
            className={`font-mono font-bold ${
              parseFloat(String(device.totalUptimePercent).replace('%','')) > 90 ? 'text-green-600' : 'text-orange-500'
            }`}
          >
            {device.totalUptimePercent}
          </span>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[10px] uppercase text-gray-500"
          disabled={!device.isOnline}
          onClick={() => reload({ type, id: device.id })}
          title="Enviar comando de reinício"
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Reiniciar
        </Button>
      </div>
    </div>
  );

  if (isLoadingStatus && !statusData) {
    return <div className="p-8 text-center">A carregar estado dos dispositivos...</div>;
  }

  return (
    <>
      <UtilityPageTemplate
        header={{
          icon: Activity,
          title: 'Monitorização de Rede',
          subtitle: 'Estado e performance dos terminais em tempo real.',
          actions: (
            <div className="flex items-center gap-3 w-[42rem] max-w-full">

              {/* Coluna da direita = seletor de dias */}
              <div className="shrink-0 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <Select value={uptimeDays} onValueChange={setUptimeDays}>
                  <SelectTrigger className="h-9 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Dia</SelectItem>
                    <SelectItem value="7">7 Dias</SelectItem>
                    <SelectItem value="30">30 Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                            
              {/* Coluna da esquerda deste bloco = CompanySelect (quando Platform Admin) */}
              {user?.role === UserRole.PLATFORM_ADMIN && (
                <div className="flex-1 min-w-[26rem]">
                  <CompanySelect
                    mode="controlled"
                    companies={companies}
                    includeAllOption
                    allLabel="Todas as Empresas"
                    placeholder="Empresa"
                    value={localSelectedCompanyId}
                    onChange={setLocalSelectedCompanyId}
                    triggerWidthClass="w-full"
                  />
                </div>
              )}
            </div>
          ),
        }}

        // Conteúdo principal: mantemos os dois cartões lado a lado
        accent={{ content: false, options: true }}
      >
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Displays (coluna esquerda) */}
          <UtilitySection /* withAccent=true por defeito */>
            <div className="px-1"> {/* pequeno ajuste opcional */}
              <div className="px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                  <Tv className="w-4 h-4 text-brand-500" /> Displays
                </h2>
              </div>
              <div className="px-6 pt-4 pb-6 space-y-4">
                {(dataWithUptime.displays || []).length > 0 ? (
                  dataWithUptime.displays.map((d: any) => renderDeviceRow(d, 'DISPLAY'))
                ) : (
                  <p className="text-muted-foreground text-center py-6 border-2 border-dashed rounded-lg">
                    Nenhum display encontrado.
                  </p>
                )}
              </div>
            </div>
          </UtilitySection>


          {/* Kiosks (coluna direita) */}
          <UtilitySection>
            <div className="px-1">
              <div className="px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-brand-500" /> Quiosques
                </h2>
              </div>
              <div className="px-6 pt-4 pb-6 space-y-4">
                {(dataWithUptime.kiosks || []).length > 0 ? (
                  dataWithUptime.kiosks.map((k: any) => renderDeviceRow(k, 'KIOSK'))
                ) : (
                  <p className="text-muted-foreground text-center py-6 border-2 border-dashed rounded-lg">
                    Nenhum quiosque encontrado.
                  </p>
                )}
              </div>
            </div>
          </UtilitySection>

        </div>
      </UtilityPageTemplate>

      {/* Modal de Uptime */}
      {modalDeviceId && deviceToDisplay && (
        <UptimeModal
          deviceName={deviceToDisplay.name}
          deviceType={deviceToDisplay.type}
          uptimePercent={deviceToDisplay.totalUptimePercent}
          hourlyData={deviceToDisplay.hourlyUptime}
          days={Number(uptimeDays)}
          onClose={() => setModalDeviceId(null)}
        />
      )}
    </>
  );
};

export default DevicesStatusPage;
