import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCompanies,
  fetchCounters,
  fetchStationsByCounter,
  startOperatorSession,
  forceCloseMySessions
} from '../services/api';
import { UserRole } from '../types/user';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { useOperatorSession } from '../context/OperatorSessionContext';
import { AlertTriangle, Settings2, Play } from 'lucide-react';
import { UtilityPageTemplate, UtilitySection } from '../components/templates/UtilityPageTemplate';

// --- (Interfaces) ---
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
  const [showForceClose, setShowForceClose] = useState(false);

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

  const selectedCounter = useMemo(
    () => availableCounters.find(c => c.id === selectedCounterId),
    [selectedCounterId, availableCounters]
  );

  const servicesToShow = useMemo(() => {
    if (!selectedCounter) return [];
    if (user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.COMPANY_ADMIN) return selectedCounter.services;
    if (user?.role === UserRole.OPERATOR) {
      const allowed = new Set(user.operatorDetails?.allowedServiceIds || []);
      return allowed.size === 0 ? selectedCounter.services : selectedCounter.services.filter(s => allowed.has(s.id));
    }
    return [];
  }, [selectedCounter, user]);

  // Limpar serviços ao mudar de balcão
  useEffect(() => { setSelectedServiceIds(new Set()); }, [selectedCounterId]);

  // Mutação para Iniciar Sessão
  const { mutate: startSession, isPending, error } = useMutation({
    mutationFn: startOperatorSession,
    onSuccess: (data) => {
      sessionStorage.setItem('operatorSessionId', data.id);
      refetchSession();
      navigate('/operator/dashboard');
    },
    onError: (err: any) => {
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

  // REDIRECIONAMENTO SE JÁ EXISTIR SESSÃO (mantido)
  useEffect(() => {
    if (!isLoadingSession && sessionId) {
      navigate('/operator/dashboard', { replace: true });
    }
  }, [sessionId, isLoadingSession, navigate]);

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const next = new Set(prev);
      next.has(serviceId) ? next.delete(serviceId) : next.add(serviceId);
      return next;
    });
  };

  // ✅ Agora exige Balcão + Posto + pelo menos 1 serviço
  const isFormValid = !!selectedCounterId && !!selectedStationId && selectedServiceIds.size > 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid) return;
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
    <UtilityPageTemplate
      header={{
        icon: Settings2,
        title: 'Iniciar Sessão de Atendimento',
        subtitle: 'Selecione o balcão, o posto e os serviços que vai atender.',
        actions: (
          <Button
            onClick={() => handleSubmit()}
            disabled={isPending || !isFormValid}
            title={!isFormValid ? 'Selecione o balcão, o posto e os serviços' : 'Iniciar Sessão'}
          >
            <Play className="w-4 h-4 mr-2" />
            {isPending ? 'A iniciar...' : 'Iniciar Sessão'}
          </Button>
        )
      }}
      banner={
        showForceClose && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md flex flex-col gap-2">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Sessão "Zombie" detetada</span>
            </div>
            <p className="text-sm text-yellow-700">
              Parece que a sua sessão anterior não fechou corretamente. Deseja forçar o encerramento?
            </p>
            <div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => forceClose()}
                disabled={isClosing}
              >
                {isClosing ? 'A encerrar...' : 'Sim, fechar sessão anterior'}
              </Button>
            </div>
          </div>
        )
      }
      optionsBar={
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {user.role === UserRole.PLATFORM_ADMIN && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="company-select">Empresa (Modo Admin)</Label>
              <Select onValueChange={setSelectedCompanyId} value={selectedCompanyId}>
                <SelectTrigger id="company-select">
                  <SelectValue placeholder="Selecione uma empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="counter-select">O seu Balcão</Label>
            <Select
              onValueChange={(val) => { setSelectedCounterId(val); setSelectedStationId(''); }}
              value={selectedCounterId}
              disabled={!targetCompanyId || isLoadingCounters}
            >
              <SelectTrigger id="counter-select">
                <SelectValue placeholder={isLoadingCounters ? 'A carregar...' : 'Selecione um balcão...'} />
              </SelectTrigger>
              <SelectContent>
                {availableCounters.map(counter => (
                  <SelectItem key={counter.id} value={counter.id}>
                    {counter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="station-select">O seu Posto de Atendimento</Label>
            <Select
              onValueChange={setSelectedStationId}
              value={selectedStationId}
              disabled={!selectedCounterId || isLoadingStations}
            >
              <SelectTrigger id="station-select">
                <SelectValue placeholder={isLoadingStations ? 'A carregar postos...' : 'Selecione um posto...'} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(availableStations) &&
                  availableStations.map((station: any) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </form>
      }
      accent={{ options: true, content: false }}
    >
      <div className="space-y-6">
        {/* Serviços a atender — só aparece DEPOIS de escolher Balcão + Posto */}
        <UtilitySection>
          <div className="grid w-full items-center gap-2">
            <Label>Serviços a Atender</Label>

            {selectedCounterId && selectedStationId ? (
              <div className="space-y-2 p-3 border rounded-md max-h-60 overflow-y-auto">
                {servicesToShow.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem serviços disponíveis para este balcão/posto.</p>
                ) : (
                  servicesToShow.map(service => (
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
                  ))
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecione o balcão e o posto para ver os serviços.
              </p>
            )}

            {error && !showForceClose && (
              <p className="text-red-500 text-sm">{(error as Error).message}</p>
            )}

            {/* Botão de iniciar (apenas mobile; no header existe a versão desktop) */}
            <div className="md:hidden pt-2">
              <Button
                className="w-full"
                onClick={() => handleSubmit()}
                disabled={isPending || !isFormValid}
              >
                <Play className="w-4 h-4 mr-2" />
                {isPending ? 'A iniciar...' : 'Iniciar Sessão'}
              </Button>
            </div>
          </div>
        </UtilitySection>
      </div>
    </UtilityPageTemplate>
  );
};

export default OperatorSetupPage;