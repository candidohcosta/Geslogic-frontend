// frontend/src/pages/OperatorSetupPage.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchCompanies, 
  fetchCounters, 
  fetchStationsByCounter, 
  startOperatorSession, 
  forceCloseMySessions // <--- IMPORTAR
} from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { useOperatorSession } from '../context/OperatorSessionContext';
import { AlertTriangle } from 'lucide-react'; // Importar ícone

// ... (Interfaces) ...
interface SimpleServiceData { id: string; name: string; }
interface SimpleCounterData { id: string; name: string; services: SimpleServiceData[]; }

const OperatorSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessionId, isLoadingSession, refetchSession } = useOperatorSession();
  const queryClient = useQueryClient();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [selectedCounterId, setSelectedCounterId] = useState<string>('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [showForceClose, setShowForceClose] = useState(false); // Estado para mostrar o botão de emergência

  const targetCompanyId = useMemo(() => {
    return user?.role === UserRole.PLATFORM_ADMIN ? selectedCompanyId : user?.company?.id;
  }, [user, selectedCompanyId]);

  // Queries
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: availableCounters = [], isLoading: isLoadingCounters } = useQuery<SimpleCounterData[]>({
    queryKey: ['counters', targetCompanyId],
    queryFn: () => fetchCounters(targetCompanyId),
    enabled: !!targetCompanyId,
  });

  const { data: availableStations = [], isLoading: isLoadingStations } = useQuery({
    queryKey: ['stations', selectedCounterId],
    queryFn: () => fetchStationsByCounter(selectedCounterId),
    enabled: !!selectedCounterId,
  });

  const selectedCounter = useMemo(() => availableCounters.find(c => c.id === selectedCounterId), [selectedCounterId, availableCounters]);

  const servicesToShow = useMemo(() => {
    if (!selectedCounter) return [];
    if (user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.COMPANY_ADMIN) return selectedCounter.services;
    if (user?.role === UserRole.OPERATOR) {
      const allowed = new Set(user.operatorDetails?.allowedServiceIds || []);
      return allowed.size === 0 ? selectedCounter.services : selectedCounter.services.filter(s => allowed.has(s.id));
    }
    return [];
  }, [selectedCounter, user]);  

  useEffect(() => { setSelectedServiceIds(new Set()); }, [selectedCounterId]);

  // Mutação para Iniciar Sessão
  const { mutate: startSession, isPending, error } = useMutation({
    mutationFn: startOperatorSession,
    onSuccess: (data) => {
      sessionStorage.setItem('operatorSessionId', data.id);
      refetchSession(); // Atualiza o contexto
      navigate('/operator/dashboard');
    },
    onError: (err: any) => {
        // Se o erro for "Conflict" (409), significa que já existe sessão ativa
        if (err.message?.includes('ativa') || err.message?.includes('Conflict')) {
            setShowForceClose(true);
        }
    }
  });

  // Mutação para Forçar Fecho
  const { mutate: forceClose, isPending: isClosing } = useMutation({
    mutationFn: forceCloseMySessions,
    onSuccess: () => {
        setShowForceClose(false);
        refetchSession();
        alert("Sessão anterior encerrada. Pode iniciar nova sessão.");
    }
  });

  // REDIRECIONAMENTO SE JÁ EXISTIR SESSÃO (DESCOMENTADO E MELHORADO)
  useEffect(() => {
    if (!isLoadingSession && sessionId) {
       // Se o contexto diz que temos sessão, vamos para o dashboard
       navigate('/operator/dashboard', { replace: true });
    }
  }, [sessionId, isLoadingSession, navigate]);


  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) newSet.delete(serviceId); else newSet.add(serviceId);
      return newSet;
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCounterId || selectedServiceIds.size === 0) return;
    startSession({
      counterId: selectedCounterId,
      stationId: selectedStationId,
      attendedServiceIds: Array.from(selectedServiceIds),
    });
  };

  if (isLoadingSession) return <div className="p-6 text-center">A verificar sessão...</div>;
  
  if (!user || ![UserRole.OPERATOR, UserRole.COMPANY_ADMIN, UserRole.PLATFORM_ADMIN].includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Iniciar Sessão de Atendimento</CardTitle>
          <CardDescription>Selecione o seu balcão e os serviços que vai atender.</CardDescription>
        </CardHeader>
        <CardContent>
          
          {/* AVISO DE CONFLITO + BOTÃO DE FORÇAR FECHO */}
          {showForceClose && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex flex-col gap-2">
                <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Sessão "Zombie" Detetada</span>
                </div>
                <p className="text-sm text-yellow-700">Parece que a sua sessão anterior não fechou corretamente. Deseja forçar o encerramento?</p>
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => forceClose()} 
                    disabled={isClosing}
                >
                    {isClosing ? 'A encerrar...' : 'Sim, fechar sessão anterior'}
                </Button>
            </div>
          )}

          {isLoadingCounters ? <p>A carregar configurações...</p> : (
            <form onSubmit={handleSubmit} className="space-y-6">

                {user.role === UserRole.PLATFORM_ADMIN && (
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="company-select">Empresa (Modo Admin)</Label>
                    <Select onValueChange={setSelectedCompanyId} value={selectedCompanyId}>
                    <SelectTrigger id="company-select"><SelectValue placeholder="Selecione uma empresa..." /></SelectTrigger>
                    <SelectContent>
                        {companies.map((company: any) => (
                        <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                )}

                {targetCompanyId && (
                <>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="counter-select">O seu Balcão</Label>
                        <Select onValueChange={setSelectedCounterId} value={selectedCounterId}>
                        <SelectTrigger id="counter-select"><SelectValue placeholder="Selecione um balcão..." /></SelectTrigger>
                        <SelectContent>
                            {availableCounters.map(counter => (
                            <SelectItem key={counter.id} value={counter.id}>{counter.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                </>
                )}

          {selectedCounterId && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="station-select">O seu Posto de Atendimento</Label>
              <Select onValueChange={setSelectedStationId} value={selectedStationId}>
                <SelectTrigger id="station-select"><SelectValue placeholder="Selecione um posto..." /></SelectTrigger>
                <SelectContent>
                  {isLoadingStations ? <p>A carregar postos...</p> : availableStations.map((station: any) => (
                    <SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}                

          {selectedCounter && (
            <div className="grid w-full items-center gap-1.5">
              <Label>Serviços a Atender</Label>
              <div className="space-y-2 p-4 border rounded-md max-h-60 overflow-y-auto">
                {servicesToShow.map(service => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox id={`service-${service.id}`} checked={selectedServiceIds.has(service.id)} onCheckedChange={() => handleServiceToggle(service.id)} />
                    <Label htmlFor={`service-${service.id}`} className="font-normal">{service.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

              {error && !showForceClose && <p className="text-red-500 text-sm">{(error as Error).message}</p>}
            </form>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={isPending || !selectedCounterId || selectedServiceIds.size === 0} className="w-full">
            {isPending ? 'A iniciar...' : 'Iniciar Sessão'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OperatorSetupPage;