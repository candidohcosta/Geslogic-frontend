// frontend/src/pages/EditCounterPage.tsx (VERSÃO FINAL E CORRIGIDA)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCounter, updateCounter, fetchCounterById, fetchServices, fetchStationsByCounter, bulkUpdateStations } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';

// --- INTERFACES CORRIGIDAS ---
interface SimpleServiceData {
  id: string;
  name: string;
}

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

const EditCounterPage: React.FC = () => {
  const navigate = useNavigate();
  const { counterId } = useParams<{ counterId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!counterId;
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const [name, setName] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  const [numberOfStations, setNumberOfStations] = useState<number>(0);
  const [stations, setStations] = useState<StationData[]>([]);

  const { data: counterDetails, isLoading } = useQuery<CounterDetailsData, Error>({
    queryKey: ['counter', counterId],
    queryFn: () => fetchCounterById(counterId!),
    enabled: isEditing,
  });

  const companyIdForFetch = useMemo(() => {
    if (isEditing && counterDetails) return counterDetails.company.id;
    if (user?.role === UserRole.PLATFORM_ADMIN) return queryParams.get('companyId');
    return user?.company?.id;
  }, [counterDetails, isEditing, user, queryParams]);

  const { data: existingStations = [] } = useQuery<StationData[]>({
    queryKey: ['stations', counterId],
    queryFn: () => fetchStationsByCounter(counterId!),
    enabled: isEditing,
  });

  const { data: availableServices = [] } = useQuery<SimpleServiceData[]>({
    queryKey: ['services', companyIdForFetch],
    queryFn: () => fetchServices(companyIdForFetch ?? undefined),
    enabled: !!companyIdForFetch,
  });

  useEffect(() => {
    if (isEditing && counterDetails) {
      console.log("DADOS DO BALCÃO RECEBIDOS PELA API:", counterDetails); // LOG DE DEPURAÇÃO
      setName(counterDetails.name);
      setLocationDescription(counterDetails.locationDescription || '');
      setSelectedServiceIds(new Set(counterDetails.services?.map((s: SimpleServiceData) => s.id) || []));

      setNumberOfStations(existingStations.length);
      setStations(existingStations);      
    }
  }, [counterDetails, isEditing, existingStations]);

  const { mutate: saveCounter, isPending } = useMutation({
    mutationFn: (counterPayload: CounterPayload) => {
      return isEditing 
        ? updateCounter({ id: counterId!, counterData: counterPayload })
        : createCounter(counterPayload);
    },
    onSuccess: (data: any, variables) => {
      const companyId = isEditing ? counterDetails?.company?.id : variables.companyId;
      queryClient.invalidateQueries({ queryKey: ['counters', companyId] });
      navigate(`/counters/company/${companyId}`);
    },
  });

  // A CORREÇÃO DO HANDLER
  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const { mutate: saveStations, isPending: isSavingStations } = useMutation({
    mutationFn: (stationsData: { counterId: string, stations: StationData[] }) => 
      bulkUpdateStations(stationsData.counterId, stationsData.stations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations', counterId] });
    },
  });

  const handleNumberOfStationsChange = (num: number) => {
    const newSize = Math.max(0, num);
    setNumberOfStations(newSize);
    
    // Ajusta o array de 'stations' para o novo tamanho
    const newStations = Array.from({ length: newSize }, (_, i) => {
      return stations[i] || { name: `Posto ${i + 1}` };
    });
    setStations(newStations);
  };
  
  const handleStationNameChange = (index: number, newName: string) => {
    const newStations = [...stations];
    newStations[index].name = newName;
    setStations(newStations);
  };

  const handleSaveStations = () => {
    saveStations({ counterId: counterId!, stations });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CounterPayload = {
      name,
      locationDescription,
      serviceIds: Array.from(selectedServiceIds),
      companyId: isEditing ? undefined : (companyIdForFetch ?? undefined),
    };
    saveCounter(payload);
  };
  
  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isEditing && isLoading) return <div className="p-6 text-center">A carregar balcão...</div>;

  return (
    <div className="space-y-6">
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Balcão' : 'Criar Novo Balcão'}</CardTitle>
        <CardDescription>Defina os detalhes e os serviços associados a este balcão.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">Nome do Balcão <span className="text-red-500">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="locationDescription">Descrição da Localização (opcional)</Label>
            <Input id="locationDescription" value={locationDescription} onChange={(e) => setLocationDescription(e.target.value)} />
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
                  <Label htmlFor={`service-${service.id}`} className="font-normal">{service.name}</Label>
                </div>
              ))}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'A Guardar...' : 'Guardar Balcão'}
        </Button>
      </CardFooter>
    </Card>

      {/* SÓ MOSTRA A GESTÃO DE POSTOS SE ESTIVER A EDITAR */}
      {isEditing && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Postos de Atendimento</CardTitle>
            <CardDescription>Defina os postos individuais neste balcão.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-1/2 items-center gap-1.5">
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
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={handleSaveStations} disabled={isSavingStations}>
              {isSavingStations ? 'A Guardar...' : 'Guardar Postos'}
            </Button>
          </CardFooter>
        </Card>
      )}
</div>
  );
};

export default EditCounterPage;