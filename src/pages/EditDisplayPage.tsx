// frontend/src/pages/EditDisplayPage.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createDisplay, updateDisplay, fetchDisplayById, fetchCounters } from '../services/api';
import { UserRole } from '../types/user';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { SingleFileUpload } from '../components/ui/SingleFileUpload';
import { MultiFileUpload } from '../components/ui/MultiFileUpload';
import { FilePurpose } from '../types/file';

import { Monitor, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { FRONTEND_SOUND_OPTIONS, DEFAULT_BELL_SOUND } from '../lib/sound-options';

import { safeCopyToClipboard, buildDisplaySetupUrl } from '../utils/device-links';

import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
type SectionsProp = React.ComponentProps<typeof DetailFormTemplate>['sections'];

// --- INTERFACES ---
interface SimpleCounterData { id: string; name: string; }
enum DisplayLayoutFormat { HORIZONTAL = 'HORIZONTAL', VERTICAL = 'VERTICAL' }

interface StoredFileData {
  id: string;
  url: string;
  displayName: string;
}

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

interface DisplayData {
  id: string;
  name: string;
  deviceSecret: string;
  layoutFormat: DisplayLayoutFormat;
  counters: SimpleCounterData[];
  company: { id: string };
  bellSound: string;
  operatingHours: any;
  mediaFiles: StoredFileData[];
  logo?: { id: string; url: string } | null;
  uiConfig: DisplayUiConfig | null;
}

interface DisplayPayload {
  name?: string;
  layoutFormat?: DisplayLayoutFormat;
  counterIds?: string[];
  companyId?: string;
  bellSound?: string;
  operatingHours?: string; // JSON string
  logo_file_id?: string | null;    // UPDATE via mutação própria
  uiConfig?: DisplayUiConfig;      // UPDATE (differences only)
}

const EditDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const { displayId } = useParams<{ displayId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!displayId;

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // Locks
  const savingRef = useRef(false);

  // Estados do formulário
  const [name, setName] = useState('');
  const [layoutFormat, setLayoutFormat] = useState<DisplayLayoutFormat>(DisplayLayoutFormat.HORIZONTAL);
  const [selectedCounterIds, setSelectedCounterIds] = useState<Set<string>>(new Set());

  const [bellSound, setBellSound] = useState(DEFAULT_BELL_SOUND);

  const [operatingHoursStart, setOperatingHoursStart] = useState('09:00');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('17:00');

  // UI config (cores)
  const [headerBg, setHeaderBg] = useState('#1f2937');
  const [mainBg, setMainBg] = useState('#111827');
  const [footerBg, setFooterBg] = useState('#111827');
  const [footerTextColor, setFooterTextColor] = useState('#ffffff');

  const [ticketCallBg, setTicketCallBg] = useState('#ffffff');
  const [ticketCallTitle, setTicketCallTitle] = useState('#ca8a04');
  const [ticketCallNumber, setTicketCallNumber] = useState('#ca8a04');
  const [ticketCallCounter, setTicketCallCounter] = useState('#ca8a04');

  const [lastCalledBg, setLastCalledBg] = useState('#ffffff');
  const [lastCalledTextColor, setLastCalledTextColor] = useState('#000000');

  // --- Queries ---
  const { data: displayDetails, isLoading: isLoadingDisplay } = useQuery<DisplayData, Error>({
    queryKey: ['display', displayId],
    queryFn: () => fetchDisplayById(displayId!),
    enabled: isEditing,
  });

  // Fonte da empresa
  const targetCompanyId = useMemo(() => {
    if (isEditing && displayDetails) return displayDetails.company.id;
    if (user?.role === UserRole.PLATFORM_ADMIN) return queryParams.get('companyId') || undefined;
    return user?.company?.id;
  }, [displayDetails, isEditing, user, queryParams]);

  // Balcões por empresa
  const { data: availableCounters = [] } = useQuery<SimpleCounterData[]>({
    queryKey: ['counters', targetCompanyId],
    queryFn: () => fetchCounters(targetCompanyId!),
    enabled: !!targetCompanyId,
  });

  // Utils
  const cleanStr = (v?: string | null) => (v ?? '').trim();
  const isEqualShallow = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

  // Preencher o formulário quando os dados chegam
  useEffect(() => {
    if (isEditing && displayDetails) {
      setName(displayDetails.name);
      setLayoutFormat(displayDetails.layoutFormat);
      setSelectedCounterIds(new Set(displayDetails.counters?.map(c => c.id) || []));

      setBellSound(displayDetails.bellSound || DEFAULT_BELL_SOUND);

      // HORÁRIO
      let hoursObject: { start?: string; end?: string } | null = null;
      const raw = displayDetails.operatingHours;
      if (raw) {
        try {
          hoursObject = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
          console.error('Erro ao parsear operatingHours:', e);
        }
      }
      if (hoursObject?.start && hoursObject?.end) {
        setOperatingHoursStart(hoursObject.start);
        setOperatingHoursEnd(hoursObject.end);
      } else {
        setOperatingHoursStart('08:30');
        setOperatingHoursEnd('18:30');
      }

      // UI Config
      const cfg = displayDetails.uiConfig || {};
      setHeaderBg(cfg.headerBackgroundColor ?? '#1f2937');
      setMainBg(cfg.mainBackgroundColor ?? '#111827');
      setFooterBg(cfg.footerBackgroundColor ?? '#111827');
      setFooterTextColor(cfg.footerTextColor ?? '#ffffff');

      const call = cfg.ticketCallWidget || {};
      setTicketCallBg(call.backgroundColor ?? '#ffffff');
      setTicketCallTitle(call.titleColor ?? '#ca8a04');
      setTicketCallNumber(call.ticketNumberColor ?? '#ca8a04');
      setTicketCallCounter(call.counterNameColor ?? '#ca8a04');

      const last = cfg.lastCalledWidget || {};
      setLastCalledBg(last.backgroundColor ?? '#ffffff');
      setLastCalledTextColor(last.textColor ?? '#000000');
    }
  }, [displayDetails, isEditing]);

  // Tocar som
  const handlePlaySound = () => {
    const audio = new Audio(`/assets/sounds/${bellSound}.mp3`);
    audio.play().catch(() => {
      toast('O seu browser bloqueou a reprodução automática.', { position: 'bottom-right' });
    });
  };

  const handleCounterToggle = (counterId: string) => {
    setSelectedCounterIds(prev => {
      const next = new Set(prev);
      next.has(counterId) ? next.delete(counterId) : next.add(counterId);
      return next;
    });
  };

  // Build payloads
  const buildCreatePayload = (): DisplayPayload => ({
    name,
    layoutFormat,
    counterIds: Array.from(selectedCounterIds),
    bellSound,
    operatingHours: JSON.stringify({ start: operatingHoursStart, end: operatingHoursEnd }),
    companyId: targetCompanyId ?? undefined,
  });

  const buildUpdatePayloadDiff = (): DisplayPayload | null => {
    if (!displayDetails) return null;
    const payload: DisplayPayload = {};
    let changed = false;

    // name
    if (cleanStr(name) !== cleanStr(displayDetails.name)) {
      payload.name = name; changed = true;
    }

    // layoutFormat
    if (layoutFormat !== displayDetails.layoutFormat) {
      payload.layoutFormat = layoutFormat; changed = true;
    }

    // counters
    const origIds = new Set((displayDetails.counters || []).map(c => c.id));
    const newIds = Array.from(selectedCounterIds);
    const sameCounters = newIds.length === origIds.size && newIds.every(id => origIds.has(id));
    if (!sameCounters) {
      payload.counterIds = newIds; changed = true;
    }

    // bellSound
    if (cleanStr(bellSound) !== cleanStr(displayDetails.bellSound || '')) {
      payload.bellSound = bellSound; changed = true;
    }

    // operatingHours
    let originalHours = { start: '09:00', end: '17:00' };
    try {
      const oh = typeof displayDetails.operatingHours === 'string'
        ? JSON.parse(displayDetails.operatingHours)
        : displayDetails.operatingHours;
      originalHours = { start: oh?.start || '09:00', end: oh?.end || '17:00' };
    } catch {}
    const currentHours = { start: operatingHoursStart, end: operatingHoursEnd };
    if (!isEqualShallow(currentHours, originalHours)) {
      payload.operatingHours = JSON.stringify(currentHours);
      changed = true;
    }

    // uiConfig (apenas em edição; diff-aware)
    const uiOrig = displayDetails.uiConfig || {};
    const uiNew: DisplayUiConfig = {
      headerBackgroundColor: headerBg,
      mainBackgroundColor: mainBg,
      footerBackgroundColor: footerBg,
      footerTextColor,
      ticketCallWidget: {
        backgroundColor: ticketCallBg,
        titleColor: ticketCallTitle,
        ticketNumberColor: ticketCallNumber,
        counterNameColor: ticketCallCounter,
      },
      lastCalledWidget: {
        backgroundColor: lastCalledBg,
        textColor: lastCalledTextColor,
      },
    };
    if (!isEqualShallow(uiOrig, uiNew)) {
      payload.uiConfig = uiNew; changed = true;
    }

    return changed ? payload : null;
  };

  // Mutations
  const { mutate: saveDisplay, isPending } = useMutation({
    mutationFn: (displayPayload: DisplayPayload) =>
      isEditing
        ? updateDisplay({ id: displayId!, displayData: displayPayload })
        : createDisplay(displayPayload),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['displays', targetCompanyId] });

      toast.success(isEditing ? 'Display atualizado' : 'Display criado', { position: 'bottom-right' });

      if (!isEditing) {
        const newId = data?.id;
        if (newId) {
          navigate(`/displays/edit/${newId}`, { replace: true });
          return;
        }
        navigate(`/displays/company/${targetCompanyId}`);
      } else {
        navigate(`/displays/company/${targetCompanyId}`);
      }
    },
    onError: (err: any) => {
      toast.error(`Erro ao guardar display: ${(err as Error)?.message ?? 'Tenta novamente.'}`, {
        position: 'bottom-right',
      });
    },
    onSettled: () => {
      savingRef.current = false;
    },
  });

  const { mutate: updateDisplayLogo } = useMutation({
    mutationFn: (p: { logo_file_id: string | null }) =>
      updateDisplay({ id: displayId!, displayData: p }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['display', displayId] });
      toast.success('Logótipo atualizado', { position: 'bottom-right' });
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar logótipo: ${(err as Error)?.message ?? 'Tenta novamente.'}`, {
        position: 'bottom-right',
      });
    },
  });

  // Submit
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
      const payload = buildCreatePayload();
      saveDisplay(payload);
      return;
    }

    const diffPayload = buildUpdatePayloadDiff();
    if (!diffPayload) {
      savingRef.current = false;
      toast('Não há alterações para guardar.', { position: 'bottom-right' });
      return;
    }
    saveDisplay(diffPayload);
  };

  // Guards
  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isEditing && isLoadingDisplay) return <div className="p-6 text-center">A carregar display...</div>;

  // SECTIONS (novo template)
  const sections: SectionsProp = [
    // IDENTIFICAÇÃO — FULL WIDTH (sempre visível)
    {
      title: 'Identificação',
      description: 'Defina o nome, formato, horário, sinal sonoro e os balcões a mostrar.',
      accent: true,
      className: isEditing ? 'md:col-span-2' : undefined,
      content: (
        <div className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">Nome do Display <span className="text-red-500">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {isEditing && displayDetails?.deviceSecret && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="deviceSecret">Chave Secreta do Dispositivo</Label>
              <div className="flex gap-2">
                <Input id="deviceSecret" value={displayDetails.deviceSecret} readOnly className="bg-gray-50" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await safeCopyToClipboard(displayDetails.deviceSecret);
                      toast.success('Chave copiada para a área de transferência.', { position: 'bottom-right' });
                    } catch {
                      toast.error('Não foi possível copiar. Selecione e copie manualmente.', { position: 'bottom-right' });
                    }
                  }}
                >
                  Copiar
                </Button>
              </div>

              {/* Link para setup */}
              <div className="mt-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Link público para configurar o Display</Label>
                <div className="flex gap-2">
                  <Input
                    value={buildDisplaySetupUrl(displayDetails.deviceSecret)}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await safeCopyToClipboard(buildDisplaySetupUrl(displayDetails.deviceSecret));
                        toast.success('Link copiado.', { position: 'bottom-right' });
                      } catch {
                        toast.error('Não foi possível copiar. Selecione e copie manualmente.', { position: 'bottom-right' });
                      }
                    }}
                  >
                    Copiar Link
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => window.open(buildDisplaySetupUrl(displayDetails.deviceSecret), '_blank', 'noopener')}
                  >
                    Abrir
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Abra este link no dispositivo do ecrã. O browser guarda o secret e redireciona para o modo de operação.
                </p>
              </div>
            </div>
          )}

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="layoutFormat">Formato do Layout</Label>
            <Select value={layoutFormat} onValueChange={(value) => setLayoutFormat(value as DisplayLayoutFormat)}>
              <SelectTrigger id="layoutFormat"><SelectValue placeholder="Selecione o formato..." /></SelectTrigger>
              <SelectContent>
                {Object.values(DisplayLayoutFormat).map(format => (
                  <SelectItem key={format} value={format}>{format}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Horário */}
          <div className="grid w-full items-center gap-1.5 pt-2 border-t">
            <Label>Horário de Funcionamento (HH:MM)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="time"
                value={operatingHoursStart}
                onChange={(e) => setOperatingHoursStart(e.target.value)}
                step="300"
                className="flex-grow"
              />
              <span className="flex-shrink-0">-</span>
              <Input
                type="time"
                value={operatingHoursEnd}
                onChange={(e) => setOperatingHoursEnd(e.target.value)}
                step="300"
                className="flex-grow"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O Display será monitorizado apenas dentro deste horário.
            </p>
          </div>

          {/* Sinal Sonoro */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="bellSound">Sinal Sonoro de Chamada</Label>
            <div className="flex gap-2 items-center">
              <Select value={bellSound} onValueChange={setBellSound}>
                <SelectTrigger id="bellSound" className="w-full">
                  <SelectValue placeholder="Selecione um som..." />
                </SelectTrigger>
                <SelectContent>
                  {FRONTEND_SOUND_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="secondary" onClick={handlePlaySound} title="Ouvir Som">
                <Volume2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Balcões */}
          <div className="grid w-full items-center gap-1.5 pt-2">
            <Label>Balcões a Mostrar Neste Display</Label>
            <div className="space-y-2 p-4 border rounded-md max-h-48 overflow-y-auto">
              {availableCounters.map((counter) => (
                <div key={counter.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`counter-${counter.id}`}
                    checked={selectedCounterIds.has(counter.id)}
                    onCheckedChange={() => handleCounterToggle(counter.id)}
                  />
                  <Label htmlFor={`counter-${counter.id}`} className="font-normal">{counter.name}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },

    // RESTANTES SECÇÕES — APENAS EM EDIÇÃO
    ...(isEditing ? [
      // LOGÓTIPO (coluna esquerda)
      {
        title: 'Logótipo',
        description: 'Imagem apresentada no topo do display.',
        accent: true,
        className: 'md:col-span-1',
        content: (
          <div className="space-y-2">
            <SingleFileUpload
              ownerType="Display"
              ownerId={displayId!}
              purpose={FilePurpose.DISPLAY_LOGO}
              currentFileUrl={displayDetails?.logo?.url || undefined}
              onUploadSuccess={(file) => updateDisplayLogo({ logo_file_id: file.id })}
              onFileClear={() => updateDisplayLogo({ logo_file_id: null })}
            />
          </div>
        ),
      },
      // SLIDESHOW / MEDIA (coluna direita)
      {
        title: 'Slideshow (Média)',
        description: 'Carregue imagens para o slideshow do display (máx. 5).',
        accent: true,
        className: 'md:col-span-1',
        content: (
          <div className="space-y-2">
            <MultiFileUpload
              ownerType="Display"
              ownerId={displayId!}
              purpose={FilePurpose.DISPLAY_SLIDESHOW}
              existingFiles={displayDetails?.mediaFiles || []}
              maxFiles={5}
              queryKeyToInvalidate={['display', displayId]}
            />
          </div>
        ),
      },
      // PERSONALIZAÇÃO VISUAL (full width)
      {
        title: 'Personalização Visual',
        description: 'Ajuste cores e aparência dos widgets do display.',
        accent: true,
        className: 'md:col-span-2',
        content: (
          <div className="space-y-6">
            {/* Cores Gerais */}
            <div className="space-y-2">
              <Label className="font-semibold">Cores Gerais</Label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border p-4 rounded-md">
                <div className="grid gap-1.5">
                  <Label>Fundo do Cabeçalho</Label>
                  <Input type="color" value={headerBg} onChange={(e) => setHeaderBg(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Fundo Principal</Label>
                  <Input type="color" value={mainBg} onChange={(e) => setMainBg(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Fundo do Rodapé</Label>
                  <Input type="color" value={footerBg} onChange={(e) => setFooterBg(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Texto do Rodapé</Label>
                  <Input type="color" value={footerTextColor} onChange={(e) => setFooterTextColor(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Widget de Chamada */}
            <div className="space-y-2">
              <Label className="font-semibold">Widget de Chamada Principal</Label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border p-4 rounded-md">
                <div className="grid gap-1.5">
                  <Label>Fundo</Label>
                  <Input type="color" value={ticketCallBg} onChange={(e) => setTicketCallBg(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Cor do Título ("SENHA")</Label>
                  <Input type="color" value={ticketCallTitle} onChange={(e) => setTicketCallTitle(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Cor do Nº da Senha</Label>
                  <Input type="color" value={ticketCallNumber} onChange={(e) => setTicketCallNumber(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Cor do Nome do Balcão</Label>
                  <Input type="color" value={ticketCallCounter} onChange={(e) => setTicketCallCounter(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Widget de Últimas Chamadas */}
            <div className="space-y-2">
              <Label className="font-semibold">Widget de Últimas Chamadas</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                <div className="grid gap-1.5">
                  <Label>Fundo</Label>
                  <Input type="color" value={lastCalledBg} onChange={(e) => setLastCalledBg(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Cor do Texto</Label>
                  <Input type="color" value={lastCalledTextColor} onChange={(e) => setLastCalledTextColor(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        ),
      },
    ] : []) as SectionsProp,
  ];

  return (
    <DetailFormTemplate
      header={{
        icon: Monitor,
        title: isEditing ? 'Editar Display' : 'Criar Novo Display',
        subtitle: isEditing
          ? 'Altere as configurações do display.'
          : 'Preencha os campos base do display.',
        actions: (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Voltar</Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit()}
              disabled={isPending || savingRef.current}
            >
              {(isPending || savingRef.current)
                ? 'A Guardar...'
                : (isEditing ? 'Guardar Alterações' : 'Guardar Display')}
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

export default EditDisplayPage;