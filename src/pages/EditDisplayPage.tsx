// frontend/src/pages/EditDisplayPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createDisplay, updateDisplay, fetchDisplayById, fetchCounters } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { MultiFileUpload } from '../components/ui/MultiFileUpload';
import { SingleFileUpload } from '../components/ui/SingleFileUpload';
import { FilePurpose } from '../types/file';

import { Volume2 } from 'lucide-react'; 
import { FRONTEND_SOUND_OPTIONS, DEFAULT_BELL_SOUND } from '../lib/sound-options'; 

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
  logo?: { id: string; url: string; } | null;
  uiConfig: DisplayUiConfig | null;
}

interface DisplayPayload {
  name?: string;
  layoutFormat?: DisplayLayoutFormat;
  counterIds?: string[];
  companyId?: string;
  bellSound?: string;
  operatingHours?: string;
  logo_file_id?: string | null;
  uiConfig?: DisplayUiConfig;
}

const EditDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const { displayId } = useParams<{ displayId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!displayId;
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // Estados do formulário
  const [name, setName] = useState('');
  const [layoutFormat, setLayoutFormat] = useState<DisplayLayoutFormat>(DisplayLayoutFormat.HORIZONTAL);
//  const [mediaConfig, setMediaConfig] = useState('');
//  const [ticketConfig, setTicketConfig] = useState('');
  const [selectedCounterIds, setSelectedCounterIds] = useState<Set<string>>(new Set());

  const [bellSound, setBellSound] = useState(DEFAULT_BELL_SOUND);

  const [operatingHoursStart, setOperatingHoursStart] = useState('09:00');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('17:00');

  const [headerBg, setHeaderBg] = useState('');
  const [mainBg, setMainBg] = useState('');
  const [footerBg, setFooterBg] = useState('');
  const [footerTextColor, setFooterTextColor] = useState('');
  const [ticketCallBg, setTicketCallBg] = useState('');
  const [ticketCallTitle, setTicketCallTitle] = useState('');
  const [ticketCallNumber, setTicketCallNumber] = useState('');
  const [ticketCallCounter, setTicketCallCounter] = useState('');
  const [lastCalledBg, setLastCalledBg] = useState('');
  const [lastCalledTextColor, setLastCalledTextColor] = useState('');


  // Query para buscar os detalhes do display (apenas em modo de edição)
  const { data: displayDetails, isLoading: isLoadingDisplay } = useQuery<DisplayData, Error>({
    queryKey: ['display', displayId],
    queryFn: () => fetchDisplayById(displayId!),
    enabled: isEditing,
  });

  // A FONTE DA VERDADE PARA O ID DA EMPRESA
  const targetCompanyId = useMemo(() => {
    if (isEditing && displayDetails) return displayDetails.company.id;
    if (user?.role === UserRole.PLATFORM_ADMIN) return queryParams.get('companyId');
    return user?.company?.id;
  }, [displayDetails, isEditing, user, queryParams]);

  // Query para buscar todos os balcões disponíveis para esta empresa
  const { data: availableCounters = [] } = useQuery<SimpleCounterData[]>({
    queryKey: ['counters', targetCompanyId],
    queryFn: () => fetchCounters(targetCompanyId!),
    enabled: !!targetCompanyId,
  });

  // Efeito para popular o formulário quando os dados chegam da API
  useEffect(() => {
    if (isEditing && displayDetails) {
      setName(displayDetails.name);
      setLayoutFormat(displayDetails.layoutFormat);
      setSelectedCounterIds(new Set(displayDetails.counters?.map(c => c.id) || []));

      setBellSound(displayDetails.bellSound || DEFAULT_BELL_SOUND);

      // CARREGAR HORÁRIO
      let hoursObject: { start?: string, end?: string } | null = null;
      const rawHours = displayDetails.operatingHours;
      
      if (rawHours) {
          try {
              // Se for string, faz parse. Se já for objeto (API perfeita), usa o objeto.
              hoursObject = typeof rawHours === 'string' ? JSON.parse(rawHours) : rawHours;
          } catch (e) {
              console.error("Erro ao fazer parse de operatingHours:", e);
          }
      }

      // Aplicar os estados (com verificação)
      if (hoursObject && hoursObject.start && hoursObject.end) {
        setOperatingHoursStart(hoursObject.start);
        setOperatingHoursEnd(hoursObject.end);
      } else {
        // Defaults (se a BD tiver NULL ou o parse falhar)
        setOperatingHoursStart('08:30');
        setOperatingHoursEnd('18:30'); 
      }     

      // Preencher os estados das cores
      const config = displayDetails.uiConfig;
      setHeaderBg(config?.headerBackgroundColor || '#1f2937');
      setMainBg(config?.mainBackgroundColor || '#111827');
      setTicketCallBg(config?.ticketCallWidget?.backgroundColor || '#ffffff');
      setTicketCallTitle(config?.ticketCallWidget?.titleColor || '#ca8a04');
      setTicketCallNumber(config?.ticketCallWidget?.ticketNumberColor || '#ca8a04');
      setTicketCallCounter(config?.ticketCallWidget?.counterNameColor || '#ca8a04');
      setLastCalledBg(config?.lastCalledWidget?.backgroundColor || '#ffffff');
      setLastCalledTextColor(config?.lastCalledWidget?.textColor || '#000000');
    }
  }, [displayDetails, isEditing]);

  const { mutate: saveDisplay, isPending } = useMutation({
    mutationFn: (displayPayload: DisplayPayload) => isEditing ? updateDisplay({ id: displayId!, displayData: displayPayload }) : createDisplay(displayPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['displays', targetCompanyId] });
      navigate(`/displays/company/${targetCompanyId}`);
    },
  });
  
/*   const handleUiConfigChange = (section: keyof DisplayUiConfig, field: string, value: string) => {
    setUiConfig(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        [field]: value,
      }
    }));
  }; */

  // Lógica para tocar o som
  const handlePlaySound = () => {
    const audio = new Audio(`/assets/sounds/${bellSound}.mp3`);
    audio.play().catch(e => alert("O seu browser bloqueou a reprodução automática."));
  };

  const handleCounterToggle = (counterId: string) => {
    setSelectedCounterIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(counterId)) newSet.delete(counterId);
      else newSet.add(counterId);
      return newSet;
    });
  };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name) {
          alert("O nome é obrigatório.");
          return;
      }

      const operatingHoursPayload = { 
        start: operatingHoursStart, 
        end: operatingHoursEnd 
      };

      const payload: DisplayPayload = { name, layoutFormat, counterIds: Array.from(selectedCounterIds), bellSound, operatingHours: JSON.stringify(operatingHoursPayload) };
      if (isEditing) {
        // Montamos o objeto uiConfig AQUI, antes de o enviar
        payload.uiConfig = {
          headerBackgroundColor: headerBg,
          mainBackgroundColor: mainBg,
          footerBackgroundColor: footerBg,
          footerTextColor: footerTextColor,
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
          // ... (outros widgets)
        };
      } else {
        payload.companyId = targetCompanyId ?? undefined;
      }
      saveDisplay(payload);
    };

  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isEditing && isLoadingDisplay) return <div className="p-6 text-center">A carregar display...</div>;

  return (
    <div className="space-y-6">
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Display' : 'Criar Novo Display'}</CardTitle>
        <CardDescription>Defina os detalhes e as configurações deste ecrã.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">Nome do Display <span className="text-red-500">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {isEditing && displayDetails?.deviceSecret && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="deviceSecret">Chave Secreta do Dispositivo</Label>
              <Input id="deviceSecret" value={displayDetails.deviceSecret} readOnly />
            </div>
          )}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="layoutFormat">Formato do Layout</Label>
            <Select value={layoutFormat} onValueChange={(value) => setLayoutFormat(value as DisplayLayoutFormat)}>
              <SelectTrigger id="layoutFormat"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(DisplayLayoutFormat).map(format => (
                  <SelectItem key={format} value={format}>{format}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* --- BLOCO: HORÁRIO DE FUNCIONAMENTO --- */}
          <div className="grid w-full items-center gap-1.5 pt-2 border-t">
              <Label>Horário de Funcionamento (HH:MM)</Label>
              <div className="flex gap-2 items-center">
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
              </div>
              <p className="text-xs text-muted-foreground">O Display será monitorizado apenas dentro deste horário.</p>
          </div>
          {/* -------------------------------------- */}

          {/* --- BLOCO DO SINAL SONORO (NOVO) --- */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="bellSound">Sinal Sonoro de Chamada</Label>
            <div className="flex gap-2">
                <Select value={bellSound} onValueChange={setBellSound} disabled={!isEditing}>
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
          {/* ------------------------------------ */}

{/*           <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="mediaComponentConfig">Configuração de Média (JSON)</Label>
            <Textarea id="mediaComponentConfig" value={mediaConfig} onChange={(e) => setMediaConfig(e.target.value)} rows={4} />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="ticketComponentConfig">Configuração de Senhas (JSON)</Label>
            <Textarea id="ticketComponentConfig" value={ticketConfig} onChange={(e) => setTicketConfig(e.target.value)} rows={4} />
          </div> */}
          <div className="grid w-full items-center gap-1.5 pt-2">
            <Label>Balcões a Mostrar Neste Display</Label>
            <div className="space-y-2 p-4 border rounded-md max-h-48 overflow-y-auto">
              {availableCounters.map((counter) => (
                <div key={counter.id} className="flex items-center space-x-2">
                  <Checkbox id={`counter-${counter.id}`} checked={selectedCounterIds.has(counter.id)} onCheckedChange={() => handleCounterToggle(counter.id)} />
                  <Label htmlFor={`counter-${counter.id}`} className="font-normal">{counter.name}</Label>
                </div>
              ))}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'A Guardar...' : 'Guardar Display'}
        </Button>
      </CardFooter>
    </Card>
      {/* SÓ MOSTRA A GESTÃO DE FICHEIROS SE ESTIVERMOS A EDITAR (porque precisamos de um displayId) */}
      {isEditing && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Logótipo do Display</CardTitle>
              <CardDescription>Esta imagem aparecerá no topo da página pública do display.</CardDescription>
            </CardHeader>
            <CardContent>
              <SingleFileUpload
                ownerType="Display"
                ownerId={displayId!}
                purpose={FilePurpose.DISPLAY_LOGO} // Precisamos de adicionar este 'purpose'
                currentFileUrl={displayDetails?.logo?.url}
                onUploadSuccess={(newFile) => {
                  saveDisplay({ logo_file_id: newFile.id });
                }}
                onFileClear={() => {
                  saveDisplay({ logo_file_id: null });
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Média para o Display</CardTitle>
              <CardDescription>Carregue as imagens para este display. (Máx: 5)</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiFileUpload
                ownerType="Display"
                ownerId={displayId!}
                purpose={FilePurpose.DISPLAY_SLIDESHOW}
                existingFiles={displayDetails?.mediaFiles || []}
                maxFiles={5}
                // Invalida a query do display para ir buscar a nova lista de imagens
                queryKeyToInvalidate={['display', displayId]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Personalização Visual</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* Secção de Cores Gerais */}
              <div className="space-y-2">
                <Label className="font-semibold">Cores Gerais</Label>
                <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
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
              
              {/* Secção do Widget de Chamada */}
              <div className="space-y-2">
                <Label className="font-semibold">Widget de Chamada Principal</Label>
                <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
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

              {/* Secção do Widget de Últimas Chamadas */}
              <div className="space-y-2">
                <Label className="font-semibold">Widget de Últimas Chamadas</Label>
                <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
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
            </CardContent>
          </Card>

        </>
      )}
    </div>
  );
};

export default EditDisplayPage;