// frontend/src/pages/EditCounterPage.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCounter,
  updateCounter,
  fetchCounterById,
  fetchServices,
  fetchStationsByCounter,
  bulkUpdateStations
} from '../services/api';
import { UserRole } from '../types/user';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';

import { Computer } from 'lucide-react';
import toast from 'react-hot-toast';

import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
type SectionsProp = React.ComponentProps<typeof DetailFormTemplate>['sections'];



// --- Tipos ---
interface SimpleServiceData { id: string; name: string; }

interface CounterDetailsData {
  id: string;
  name: string;
  locationDescription: string | null;
  services: SimpleServiceData[];
  company: { id: string };
}

interface CounterPayload {
  name?: string;
  locationDescription?: string | null;
  serviceIds?: string[];
  companyId?: string;
}

interface StationData { id?: string; name: string; }

// --- Helpers ---
// Remove quaisquer campos não permitidos (createdAt/updatedAt/etc) e normaliza o nome.
function sanitizeStationsForPayload(arr: StationData[]) {
  return arr
    .map(s => ({ id: s.id, name: (s.name ?? '').trim() }))
    .filter(s => s.name.length > 0);
}

const EditCounterPage: React.FC = () => {
  const navigate = useNavigate();
  const { counterId } = useParams<{ counterId?: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!counterId;

  // Estado principal
  const [name, setName] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  // Postos
  const [numberOfStations, setNumberOfStations] = useState<number>(0);
  const [stations, setStations] = useState<StationData[]>([]);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [stationsApiError, setStationsApiError] = useState<string | null>(null);

  // Locks/flags para evitar corrida e consolidar toasts
  const savingRef = useRef(false);
  const savingStationsThenCounterRef = useRef(false);

  // Query balcão
  const { data: counterDetails, isLoading } = useQuery<CounterDetailsData, Error>({
    queryKey: ['counter', counterId],
    queryFn: () => fetchCounterById(counterId!),
    enabled: isEditing,
  });

  // Determinar empresa para carregar serviços
  const companyIdForFetch = useMemo(() => {
    if (isEditing && counterDetails) return counterDetails.company.id;
    if (user?.role === UserRole.PLATFORM_ADMIN) {
      const qs = new URLSearchParams(location.search);
      return qs.get('companyId') || undefined;
    }
    return user?.company?.id;
  }, [counterDetails, isEditing, user, location.search]);

  // Query postos (apenas edição)
  const { data: existingStations = [] } = useQuery<StationData[]>({
    queryKey: ['stations', counterId],
    queryFn: () => fetchStationsByCounter(counterId!),
    enabled: isEditing,
  });

  // Query serviços
  const { data: availableServices = [] } = useQuery<SimpleServiceData[]>({
    queryKey: ['services', companyIdForFetch],
    queryFn: () => fetchServices(companyIdForFetch ?? undefined),
    enabled: !!companyIdForFetch,
  });

  // Preencher form em edição
  useEffect(() => {
    if (isEditing && counterDetails) {
      setName(counterDetails.name);
      setLocationDescription(counterDetails.locationDescription || '');
      setSelectedServiceIds(new Set(counterDetails.services?.map((s) => s.id) || []));
    }
  }, [counterDetails, isEditing]);

  // Sincronizar postos em edição (sanitizados)
  useEffect(() => {
    if (isEditing) {
      setNumberOfStations(existingStations.length);
      setStations(existingStations.map(({ id, name }) => ({ id, name })));
    }
  }, [isEditing, existingStations]);

  // Info: alterações pendentes nos postos
  const stationsChanged = useMemo(() => {
    if (!isEditing) return false;
    if (stations.length !== existingStations.length) return true;
    for (let i = 0; i < stations.length; i++) {
      const a = stations[i]?.name?.trim() || '';
      const b = existingStations[i]?.name?.trim() || '';
      if (a !== b) return true;
    }
    return false;
  }, [isEditing, stations, existingStations]);

  // Mutations
  const { mutate: saveCounter, isPending } = useMutation({
    mutationFn: (counterPayload: CounterPayload) => {
      return isEditing
        ? updateCounter({ id: counterId!, counterData: counterPayload })
        : createCounter(counterPayload);
    },
    onSuccess: (data: any, variables) => {
      // Invalida lista por empresa
      const companyId = isEditing ? counterDetails?.company?.id : variables.companyId;
      queryClient.invalidateQueries({ queryKey: ['counters', companyId] });

      // ✅ TOAST de sucesso (consolidado)
      if (savingStationsThenCounterRef.current) {
        toast.success('Balcão e Postos guardados', { position: 'bottom-right' });
        savingStationsThenCounterRef.current = false;
      } else {
        toast.success(isEditing ? 'Balcão atualizado' : 'Balcão criado', { position: 'bottom-right' });
      }

      if (!isEditing) {
        // Após criar, ir direto para edição (sem banners)
        const newId = data?.id;
        if (newId) {
          navigate(`/counters/edit/${newId}`, { replace: true });
          return;
        }
        // fallback se o backend não devolver id
        navigate(`/counters/company/${companyId}`);
      } else {
        // Em edição: volta à lista
        navigate(`/counters/company/${companyId}`);
      }
    },
    onError: (err: any) => {
      toast.error(`Erro ao guardar balcão: ${(err as Error)?.message ?? 'Tenta novamente.'}`, {
        position: 'bottom-right',
      });
    },
    onSettled: () => {
      savingRef.current = false;
    }
  });

  const { mutate: saveStations, isPending: isSavingStations } = useMutation({
    mutationFn: (stationsData: { counterId: string, stations: StationData[] }) =>
      bulkUpdateStations(stationsData.counterId, stationsData.stations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations', counterId] });
      setStationsError(null);
      setStationsApiError(null);

      // ⚠️ Só mostra toast aqui se NÃO estivermos no fluxo “postos + balcão”
      if (!savingStationsThenCounterRef.current) {
        toast.success('Postos guardados', { position: 'bottom-right' });
      }
    },
    onError: (err: any) => {
      setStationsApiError((err as Error)?.message || 'Falha ao guardar postos.');
      toast.error(`Erro ao guardar postos: ${(err as Error)?.message ?? 'Tenta novamente.'}`, {
        position: 'bottom-right',
      });
    },
  });

  // Handlers
  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const next = new Set(prev);
      next.has(serviceId) ? next.delete(serviceId) : next.add(serviceId);
      return next;
    });
  };

  const handleNumberOfStationsChange = (num: number) => {
    const newSize = Math.max(0, num);
    setNumberOfStations(newSize);
    const newStations = Array.from({ length: newSize }, (_, i) => stations[i] || { name: `Posto ${i + 1}` });
    setStations(newStations);
  };

  const handleStationNameChange = (index: number, newName: string) => {
    const newStations = [...stations];
    newStations[index].name = newName;
    setStations(newStations);
  };

  // Construir payload do balcão
  const buildCounterPayload = (): CounterPayload => ({
    name,
    locationDescription,
    serviceIds: Array.from(selectedServiceIds),
    companyId: isEditing ? undefined : (companyIdForFetch ?? undefined),
  });

  // Guardar pelo header: se postos alterados, guarda Postos e depois Balcão (com toasts)
  const handleHeaderSaveClick = () => {
    if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) return;
    if (savingRef.current) return;
    savingRef.current = true;

    const counterPayload = buildCounterPayload();

    if (isEditing && stationsChanged) {
      const payloadStations = sanitizeStationsForPayload(stations);
      if (payloadStations.length !== stations.length) {
        setStationsError('Existem postos com nome vazio. Por favor, preencha todos os nomes antes de guardar.');
        savingRef.current = false;
        return;
      }

      // Vamos fazer “postos → balcão”; evita toast duplicado em saveStations
      savingStationsThenCounterRef.current = true;

      saveStations(
        { counterId: counterId!, stations: payloadStations },
        {
          onSuccess: () => {
            // navegação e toast final ocorrem no onSuccess do saveCounter
            saveCounter(counterPayload);
          },
          onError: () => {
            savingRef.current = false;
          }
        }
      );
      return;
    }

    // Sem alterações nos postos (ou criação): guardar só o balcão
    saveCounter(counterPayload);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleHeaderSaveClick();
  };

  // Guards
  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isEditing && isLoading) return <div className="p-6 text-center">A carregar balcão...</div>;

  // ===== Secções (full width) =====
  const sections: SectionsProp = [
    {
      title: 'Detalhes do Balcão',
      description: 'Defina os detalhes e os serviços associados a este balcão.',
      accent: true,
      content: (
        <div className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">Nome do Balcão <span className="text-red-500">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="locationDescription">Descrição da Localização (opcional)</Label>
            <Input
              id="locationDescription"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
            />
          </div>

          <div className="grid w-full items-center gap-1.5 pt-2">
            <Label>Serviços Atendidos Neste Balcão</Label>
            <div className="space-y-2 p-4 border rounded-md max-h-48 overflow-y-auto">
              {availableServices.map((service) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service.id}`}
                    checked={selectedServiceIds.has(service.id)}
                    onCheckedChange={() => handleServiceToggle(service.id)}
                  />
                  <Label htmlFor={`service-${service.id}`} className="font-normal">
                    {service.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },

    ...(isEditing
      ? [{
          title: 'Postos de Atendimento',
          description: 'Defina os postos individuais deste balcão.',
          accent: true,
          content: (
            <div className="space-y-4">
              <div className="grid w-full sm:w-1/2 items-center gap-1.5">
                <Label htmlFor="numberOfStations">Número de Postos</Label>
                <Input
                  id="numberOfStations"
                  type="number"
                  value={numberOfStations}
                  onChange={(e) => handleNumberOfStationsChange(Number(e.target.value))}
                  min="0"
                />
              </div>

              {stations.length > 0 && (
                <div className="space-y-2">
                  {stations.map((station, index) => (
                    <div key={station.id || index} className="grid w-full items-center gap-1.5">
                      <Label htmlFor={`station-name-${index}`}>Nome do Posto {index + 1}</Label>
                      <Input
                        id={`station-name-${index}`}
                        value={station.name}
                        onChange={(e) => handleStationNameChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {stationsChanged && (
                <p className="text-xs text-amber-600">
                  Existem alterações nos postos por guardar. Ao clicar em “Guardar Alterações”, os postos serão guardados primeiro.
                </p>
              )}
              {stationsError && (
                <p className="text-sm text-red-600">
                  {stationsError}
                </p>
              )}
              {stationsApiError && (
                <p className="text-sm text-red-600">
                  {stationsApiError}
                </p>
              )}
            </div>
          ),
        }] as SectionsProp
      : []),
  ];

  return (
    <DetailFormTemplate
      header={{
        icon: Computer,
        title: isEditing ? 'Editar Balcão' : 'Criar Novo Balcão',
        subtitle: 'Defina os detalhes e os serviços associados a este balcão.',
        actions: (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleHeaderSaveClick}
              disabled={isPending || isSavingStations || savingRef.current}
            >
              {(isPending || isSavingStations || savingRef.current)
                ? 'A Guardar...'
                : (isEditing ? 'Guardar Alterações' : 'Guardar Balcão')}
            </Button>
          </div>
        ),
      }}
      columnsMd={1}     // full width nas secções
      sections={sections}
      actions={<></>}   // sem ações no rodapé
    />
  );
};

export default EditCounterPage;