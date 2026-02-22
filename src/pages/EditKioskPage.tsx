// frontend/src/pages/EditKioskPage.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
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

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { SingleFileUpload } from '../components/ui/SingleFileUpload';
import { FilePurpose } from '../types/file';

import { Network, MapPin, MonitorSmartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { QzService } from '../utils/qz-service';
import { KioskQRCode } from '../components/kiosk/KioskQRCode';

import { safeCopyToClipboard, buildKioskSetupUrl } from '../utils/device-links';

import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
type SectionsProp = React.ComponentProps<typeof DetailFormTemplate>['sections'];

// --------------------
// TYPES
// --------------------
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
  geofencingRadius?: number | null;
  company: { id: string; slug: string; subscribedServices: string[] };
  uiConfig: {
    primaryColor?: string;
    buttonTextColor?: string;
    cardBackgroundColor?: string;
    pageBackgroundColor?: string;
  } | null;
  logo: { url: string } | null;
}

interface KioskPayload {
  name?: string;
  operatingHours?: any;
  serviceIds?: string[];
  printerName?: string | null;
  printServerIp?: string | null;
  latitude?: number | null;         // update only
  longitude?: number | null;        // update only
  geofencingRadius?: number | null; // update only
  companyId?: string;               // create only
  uiConfig?: any;                   // update only
  logo_file_id?: string | null;     // update only
}



// ==================================================================================
// COMPONENT
// ==================================================================================
const EditKioskPage: React.FC = () => {
  // --- BASICS ---
  const navigate = useNavigate();
  const { kioskId } = useParams<{ kioskId?: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isEditing = !!kioskId;

  // --------------------
  // FORM STATE
  // --------------------
  const [name, setName] = useState('');
  const [operatingHoursStart, setOperatingHoursStart] = useState('09:00');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('17:00');

  const [printerName, setPrinterName] = useState<string>('');
  const [printServerIp, setPrintServerIp] = useState<string>('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  // Geofencing (strings → podem ser '' = null)
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [geofencingRadius, setGeofencingRadius] = useState<string>('500');

  // UI Config
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [buttonTextColor, setButtonTextColor] = useState('#ffffff');
  const [cardBackgroundColor, setCardBackgroundColor] = useState('#ffffff');
  const [pageBackgroundColor, setPageBackgroundColor] = useState('#f3f4f6');

  // QZ
  const [printersList, setPrintersList] = useState<string[]>([]);
  const [isQzConnected, setIsQzConnected] = useState(false);
  const [qzError, setQzError] = useState<string | null>(null);

  // Prevent duplicate submissions
  const savingRef = useRef(false);

  // ==================================================================================
  // QUERIES
  // ==================================================================================
  const { data: kioskDetails, isLoading } = useQuery<KioskData, Error>({
    queryKey: ['kiosk', kioskId],
    queryFn: () => fetchKioskById(kioskId!),
    enabled: isEditing,
  });

  const companyIdForFetch = useMemo(() => {
    if (isEditing && kioskDetails) return kioskDetails.company.id;
    if (user?.role === UserRole.PLATFORM_ADMIN) {
      const qs = new URLSearchParams(location.search);
      return qs.get('companyId') || undefined;
    }
    return user?.company?.id;
  }, [kioskDetails, isEditing, user, location.search]);

  const { data: availableServices = [] } = useQuery<SimpleServiceData[]>({
    queryKey: ['services', companyIdForFetch],
    queryFn: () => fetchServices(companyIdForFetch ?? undefined),
    enabled: !!companyIdForFetch,
  });

  // ==================================================================================
  // UTILS
  // ==================================================================================
  const cleanStr = (v?: string | null) => (v ?? '').trim();
  const isEqualShallow = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

  // ==================================================================================
  // FILL FORM IN EDIT
  // ==================================================================================
  useEffect(() => {
    if (isEditing && kioskDetails) {
      setName(kioskDetails.name);
      setPrinterName(cleanStr(kioskDetails.printerName || ''));
      setPrintServerIp(cleanStr(kioskDetails.printServerIp || ''));
      setSelectedServiceIds(new Set(kioskDetails.services?.map(s => s.id) || []));

      try {
        const oh = typeof kioskDetails.operatingHours === 'string'
          ? JSON.parse(kioskDetails.operatingHours)
          : kioskDetails.operatingHours;
        setOperatingHoursStart(oh?.start || '09:00');
        setOperatingHoursEnd(oh?.end || '17:00');
      } catch {
        setOperatingHoursStart('09:00');
        setOperatingHoursEnd('17:00');
      }

      setLatitude(kioskDetails.latitude != null ? String(kioskDetails.latitude) : '');
      setLongitude(kioskDetails.longitude != null ? String(kioskDetails.longitude) : '');
      setGeofencingRadius(
        kioskDetails.geofencingRadius != null ? String(kioskDetails.geofencingRadius) : '500'
      );

      if (kioskDetails.uiConfig) {
        setPrimaryColor(kioskDetails.uiConfig.primaryColor || '#4f46e5');
        setButtonTextColor(kioskDetails.uiConfig.buttonTextColor || '#ffffff');
        setCardBackgroundColor(kioskDetails.uiConfig.cardBackgroundColor || '#ffffff');
        setPageBackgroundColor(kioskDetails.uiConfig.pageBackgroundColor || '#f3f4f6');
      }
    }
  }, [kioskDetails, isEditing]);

  // ==================================================================================
  // HANDLERS (definidos ANTES de usar no JSX)
  // ==================================================================================
  const handleDetectPrinters = async () => {
    setQzError(null);
    try {
      const hostToConnect = printServerIp || 'localhost';
      const printers = await QzService.connectAndListPrinters(hostToConnect);
      setPrintersList(printers);
      setIsQzConnected(true);
      if (printers.length === 0) toast('Nenhuma impressora encontrada.', { position: 'bottom-right' });
    } catch (err: any) {
      console.error('Erro na página (QZ):', err);
      setQzError('Erro: ' + (err.message || err));
      setIsQzConnected(false);
      toast.error('Falha ao detetar impressoras. Verifique o Print Server IP.', { position: 'bottom-right' });
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('O seu navegador não suporta geolocalização.', { position: 'bottom-right' });
      return;
    }
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      toast('A geolocalização automática exige HTTPS. Use localhost ou preencha manualmente.', {
        position: 'bottom-right'
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
        toast.success('Localização detetada com sucesso!', { position: 'bottom-right' });
      },
      (err) => {
        if (err.code === 1) {
          toast('Permissão negada. Ative o acesso à localização nas definições do navegador.', {
            position: 'bottom-right'
          });
        } else {
          toast.error('Erro ao obter localização: ' + err.message, { position: 'bottom-right' });
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleTestHours = async () => {
    if (!kioskId) return;
    try {
      const result = await fetchTestKioskHours(kioskId);
      const status = result.isOpen ? 'ABERTO' : 'FECHADO';
      const hoursDisplay = `Horário: ${result.hours.start} - ${result.hours.end}`;
      toast(`${status}. ${hoursDisplay}`, { position: 'bottom-right' });
    } catch (e: any) {
      toast.error(`Erro ao testar horário: ${e.message}`, { position: 'bottom-right' });
    }
  };

  // ==================================================================================
  // BUILD PAYLOADS
  // ==================================================================================
  const buildCreatePayload = (): KioskPayload => ({
    name,
    operatingHours: JSON.stringify({ start: operatingHoursStart, end: operatingHoursEnd }),
    serviceIds: Array.from(selectedServiceIds),
    printerName: cleanStr(printerName) || null,
    printServerIp: cleanStr(printServerIp) || null,
    companyId: companyIdForFetch ?? undefined,
    // geofencing/UI não permitido em CREATE (DTO)
  });

  const buildUpdatePayloadDiff = (): KioskPayload | null => {
    if (!kioskDetails) return null;

    const payload: KioskPayload = {};
    let changed = false;

    // name
    if (cleanStr(name) !== cleanStr(kioskDetails.name)) {
      payload.name = name;
      changed = true;
    }

    // operatingHours
    let originalHours = { start: '09:00', end: '17:00' };
    try {
      const oh = typeof kioskDetails.operatingHours === 'string'
        ? JSON.parse(kioskDetails.operatingHours)
        : kioskDetails.operatingHours;
      originalHours = { start: oh?.start || '09:00', end: oh?.end || '17:00' };
    } catch {}
    const currentHours = { start: operatingHoursStart, end: operatingHoursEnd };
    if (!isEqualShallow(currentHours, originalHours)) {
      payload.operatingHours = JSON.stringify(currentHours);
      changed = true;
    }

    // services
    const origIds = new Set((kioskDetails.services || []).map(s => s.id));
    const newIds = Array.from(selectedServiceIds);
    const sameServices = newIds.length === origIds.size && newIds.every(id => origIds.has(id));
    if (!sameServices) {
      payload.serviceIds = newIds;
      changed = true;
    }

    // printer
    const pNameChanged = cleanStr(printerName) !== cleanStr(kioskDetails.printerName || '');
    const pIpChanged   = cleanStr(printServerIp) !== cleanStr(kioskDetails.printServerIp || '');
    if (pNameChanged) { payload.printerName = cleanStr(printerName) || null; changed = true; }
    if (pIpChanged)   { payload.printServerIp = cleanStr(printServerIp) || null; changed = true; }

    // geofencing (strings → number | null; null = limpar)
    const latOrig = kioskDetails.latitude ?? null;
    const lonOrig = kioskDetails.longitude ?? null;
    const radOrig = kioskDetails.geofencingRadius ?? null;

    const latNew = latitude === '' ? null : Number(latitude);
    const lonNew = longitude === '' ? null : Number(longitude);
    const radNew = geofencingRadius === '' ? null : Number(geofencingRadius);

    const latClean = Number.isNaN(latNew as number) ? null : latNew;
    const lonClean = Number.isNaN(lonNew as number) ? null : lonNew;
    const radClean = Number.isNaN(radNew as number) ? null : radNew;

    if (latClean !== latOrig) { payload.latitude = latClean; changed = true; }
    if (lonClean !== lonOrig) { payload.longitude = lonClean; changed = true; }
    if (radClean !== radOrig) { payload.geofencingRadius = radClean; changed = true; }

    // uiConfig (diff-aware)
    const uiOrig = kioskDetails.uiConfig || {};
    const uiNew  = { primaryColor, buttonTextColor, cardBackgroundColor, pageBackgroundColor };
    if (!isEqualShallow(uiOrig, uiNew)) {
      payload.uiConfig = uiNew;
      changed = true;
    }

    return changed ? payload : null;
  };

  // ==================================================================================
  // MUTATIONS
  // ==================================================================================
  const { mutate: saveKiosk, isPending } = useMutation({
    mutationFn: (payload: KioskPayload) =>
      isEditing
        ? updateKiosk({ id: kioskId!, kioskData: payload })
        : createKiosk(payload),

    onSuccess: (data: any, variables) => {
      const companyId = isEditing ? kioskDetails?.company?.id : variables.companyId;
      queryClient.invalidateQueries({ queryKey: ['kiosks', companyId] });

      toast.success(isEditing ? 'Quiosque atualizado' : 'Quiosque criado', { position: 'bottom-right' });

      if (!isEditing) {
        const newId = data?.id;
        if (newId) {
          navigate(`/kiosks/edit/${newId}`, { replace: true });
          return;
        }
        navigate(`/kiosks/company/${companyId}`);
      } else {
        navigate(`/kiosks/company/${companyId}`);
      }
    },

    onError: (err: any) => {
      toast.error(`Erro ao guardar quiosque: ${(err as Error)?.message ?? 'Tenta novamente.'}`, {
        position: 'bottom-right',
      });
    },

    onSettled: () => {
      savingRef.current = false;
    },
  });

  const { mutate: updateKioskFile } = useMutation({
    mutationFn: (p: { logo_file_id: string | null }) =>
      updateKiosk({ id: kioskId!, kioskData: p }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['kiosk', kioskId] }),
  });

  // ==================================================================================
  // SUBMIT
  // ==================================================================================
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;

    if (!name) {
      toast.error('O nome é obrigatório.', { position: 'bottom-right' });
      savingRef.current = false;
      return;
    }
    if (operatingHoursStart >= operatingHoursEnd) {
      toast.error('O horário de fecho deve ser posterior ao horário de abertura.', {
        position: 'bottom-right',
      });
      savingRef.current = false;
      return;
    }

    if (!isEditing) {
      saveKiosk(buildCreatePayload());
      return;
    }

    const diffPayload = buildUpdatePayloadDiff();
    if (!diffPayload) {
      toast('Não há alterações para guardar.', { position: 'bottom-right' });
      savingRef.current = false;
      return;
    }

    saveKiosk(diffPayload);
  };

  // ==================================================================================
  // GUARDS
  // ==================================================================================
  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isEditing && isLoading) {
    return <div className="p-6 text-center">A carregar quiosque...</div>;
  }

  // ==================================================================================
  // SECTIONS
  // ==================================================================================
  const sections: SectionsProp = [
    {
      title: 'Identificação',
      description: 'Defina o nome e os serviços do quiosque.',
      accent: true,
      className: isEditing ? 'md:col-span-2' : undefined,
      content: (
        <div className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">Nome do Quiosque <span className="text-red-500">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

{isEditing && kioskDetails?.deviceSecret && (
  <div className="grid w-full items-center gap-1.5">
    <Label>Chave Secreta</Label>
    <div className="flex gap-2">
      <Input value={kioskDetails.deviceSecret} readOnly className="bg-gray-50" />
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          try {
            await safeCopyToClipboard(kioskDetails.deviceSecret);
            toast.success('Chave copiada.', { position: 'bottom-right' });
          } catch {
            toast.error('Não foi possível copiar. Selecione e copie manualmente.', {
              position: 'bottom-right',
            });
          }
        }}
      >
        Copiar
      </Button>
    </div>

    {/* ---- Link de Setup (copiar/abrir) ---- */}
    <div className="mt-2 space-y-1">
      <Label className="text-xs text-muted-foreground">
        Link público para configurar o Quiosque
      </Label>
      <div className="flex gap-2">
        <Input
          value={buildKioskSetupUrl(kioskDetails.deviceSecret)}
          readOnly
          className="bg-gray-50"
        />
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await safeCopyToClipboard(buildKioskSetupUrl(kioskDetails.deviceSecret));
              toast.success('Link copiado.', { position: 'bottom-right' });
            } catch {
              toast.error('Não foi possível copiar. Selecione e copie manualmente.', {
                position: 'bottom-right',
              });
            }
          }}
        >
          Copiar Link
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            window.open(buildKioskSetupUrl(kioskDetails.deviceSecret), '_blank', 'noopener')
          }
        >
          Abrir
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Abra este link no dispositivo do quiosque. O browser guarda o secret e redireciona
        para o modo de operação.
      </p>
    </div>
    {/* -------------------------------------- */}
  </div>
)}

          <div className="grid w-full items-center gap-1.5 pt-2">
            <Label>Serviços Disponíveis</Label>
            <div className="space-y-2 p-4 border rounded-md max-h-48 overflow-y-auto">
              {availableServices.map((svc) => (
                <div key={svc.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${svc.id}`}
                    checked={selectedServiceIds.has(svc.id)}
                    onCheckedChange={() =>
                      setSelectedServiceIds(prev => {
                        const next = new Set(prev);
                        next.has(svc.id) ? next.delete(svc.id) : next.add(svc.id);
                        return next;
                      })
                    }
                  />
                  <Label htmlFor={`service-${svc.id}`} className="font-normal">
                    {svc.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },

    ...(isEditing ? [
      {
        title: 'Horário de Funcionamento',
        description: 'Defina o horário em que o quiosque emite senhas.',
        accent: true,
        className: 'md:col-span-1',
        content: (
          <div className="space-y-2">
            <Label>Horário (HH:MM)</Label>
            <div className="flex gap-2 items-center">
              <Input type="time" value={operatingHoursStart} onChange={(e) => setOperatingHoursStart(e.target.value)} step="300" className="flex-grow" />
              <span className="flex-shrink-0">-</span>
              <Input type="time" value={operatingHoursEnd} onChange={(e) => setOperatingHoursEnd(e.target.value)} step="300" className="flex-grow" />
              <Button type="button" variant="secondary" onClick={handleTestHours} className="flex-shrink-0">
                Testar Agora
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">O quiosque não permitirá tirar senha fora deste horário.</p>
          </div>
        ),
      },
      {
        title: 'Segurança por Localização (Geofencing)',
        description: 'Opcional. Restringe emissão de senhas móveis a uma zona.',
        accent: true,
        className: 'md:col-span-1',
        content: (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-500" /> Geofencing
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={handleDetectLocation}>
                Usar minha posição
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Latitude</Label>
                <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Ex: 38.716" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Longitude</Label>
                <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Ex: -9.133" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Raio (m)</Label>
                <Input type="number" value={geofencingRadius} onChange={(e) => setGeofencingRadius(e.target.value)} />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Deixe os campos vazios para desativar o Geofencing.
            </p>
          </div>
        ),
      },
      {
        title: 'Hardware de Impressão',
        description: 'Configuração de impressora e servidor de impressão.',
        accent: true,
        className: 'md:col-span-1',
        content: (
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label className="flex items-center gap-2"><Network className="w-4 h-4" /> IP do Servidor de Impressão (Opcional)</Label>
              <Input placeholder="Ex: 192.168.1.200" value={printServerIp} onChange={(e) => setPrintServerIp(e.target.value)} />
              <p className="text-xs text-muted-foreground">Deixe vazio para usar este PC como servidor QZ.</p>
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label>Impressora de Talões</Label>
              <div className="flex gap-2">
                {isQzConnected ? (
                  <Select value={printerName} onValueChange={setPrinterName}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a impressora..." /></SelectTrigger>
                    <SelectContent>
                      {printersList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
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
          </div>
        ),
      },
      {
        title: 'Visual',
        description: 'Personalize o aspeto do quiosque.',
        accent: true,
        className: 'md:col-span-1',
        content: (
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label>Logótipo</Label>
              <SingleFileUpload
                ownerType="Kiosk"
                ownerId={kioskId!}
                purpose={FilePurpose.KIOSK_LOGO}
                currentFileUrl={kioskDetails?.logo?.url}
                onUploadSuccess={(newFile) => updateKioskFile({ logo_file_id: newFile.id })}
                onFileClear={() => updateKioskFile({ logo_file_id: null })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label>Cor Primária</Label>
                <Input type="color" className="h-10 p-1" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label>Cor do Texto</Label>
                <Input type="color" className="h-10 p-1" value={buttonTextColor} onChange={(e) => setButtonTextColor(e.target.value)} />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label>Fundo Cartão</Label>
                <Input type="color" className="h-10 p-1" value={cardBackgroundColor} onChange={(e) => setCardBackgroundColor(e.target.value)} />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label>Fundo Página</Label>
                <Input type="color" className="h-10 p-1" value={pageBackgroundColor} onChange={(e) => setPageBackgroundColor(e.target.value)} />
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Ponto de Acesso Móvel',
        description: 'QR Code com acesso aos serviços deste quiosque.',
        accent: true,
        className: 'md:col-span-2',
        content: (
          <div className="space-y-2">
            {kioskDetails?.company.subscribedServices.includes('QUEUES') ? (
              <div className="flex justify-center">
                <KioskQRCode
                  companySlug={kioskDetails.company.slug}
                  kioskId={kioskDetails.id}
                  kioskName={kioskDetails.name}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                A empresa não tem a subscrição <strong>QUEUES</strong> ativa.
              </p>
            )}
          </div>
        ),
      },
    ] : []),
  ];

  // ==================================================================================
  // RETURN
  // ==================================================================================
  return (
    <DetailFormTemplate
      header={{
        icon: MonitorSmartphone,
        title: isEditing ? 'Editar Quiosque' : 'Criar Novo Quiosque',
        subtitle: isEditing
          ? 'Altere as configurações deste quiosque.'
          : 'Preencha os campos base para criar o quiosque.',
        actions: (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending || savingRef.current}
              onClick={() => handleSubmit()}
            >
              {(isPending || savingRef.current)
                ? 'A Guardar...'
                : (isEditing ? 'Guardar Alterações' : 'Guardar Quiosque')}
            </Button>
          </div>
        ),
      }}
      columnsMd={isEditing ? 2 : 1}
      sections={sections}
      actions={<></>}
    />
  );
};

export default EditKioskPage;