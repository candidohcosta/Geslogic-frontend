// frontend/src/pages/scheduling/TestBookingPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchSchedulingProfiles, fetchCompanies, createAppointment } from '../../services/api';
import { SchedulingProfile } from '../../types/scheduling';
import { BookingCalendar } from '../../components/scheduling/BookingCalendar';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { ArrowLeft, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';

const TestBookingPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<SchedulingProfile | null>(null);
  
  // Estado da Empresa (Se for CompanyAdmin, já vem preenchido. Se for Platform, começa vazio)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(user?.company?.id || '');

  // 1. Buscar Empresas (Apenas para Platform Admin)
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // 2. Buscar Perfis (Depende da Empresa selecionada)
  const { data: profiles, isLoading } = useQuery<SchedulingProfile[]>({
    queryKey: ['schedulingProfiles', selectedCompanyId],
    queryFn: () => fetchSchedulingProfiles(selectedCompanyId),
    enabled: !!selectedCompanyId, // Só busca se houver uma empresa definida
  });

  // Mutação para criar
  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      alert("Agendamento confirmado com sucesso!");
      setSelectedProfile(null); // Volta ao início ou redireciona
    },
    onError: (err: any) => alert(`Erro ao agendar: ${err.message}`)
  });

  const handleSlotSelect = (date: Date) => {
    if (!selectedProfile) return;
    
    const confirmMsg = `Confirma o agendamento para:\n\nServiço: ${selectedProfile.name}\nData: ${date.toLocaleString()}`;
    
    if (window.confirm(confirmMsg)) {
        createMutation.mutate({
            profileId: selectedProfile.id,
            startTime: date.toISOString() // Formato ISO para o backend
        });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      
      {/* CABEÇALHO E SELEÇÃO DE EMPRESA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Simulador de Agendamento</h1>

        {user?.role === UserRole.PLATFORM_ADMIN && (
            <div className="w-full md:w-64">
                <Select value={selectedCompanyId} onValueChange={(val) => { setSelectedCompanyId(val); setSelectedProfile(null); }}>
                    <SelectTrigger>
                        <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                        <SelectValue placeholder="Selecione a Empresa" />
                    </SelectTrigger>
                    <SelectContent>
                        {companies?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}
      </div>

      {/* AVISO SE NÃO HOUVER EMPRESA */}
      {!selectedCompanyId && user?.role === UserRole.PLATFORM_ADMIN && (
          <div className="p-8 text-center border-2 border-dashed rounded-lg text-gray-400">
              Selecione uma empresa para ver os serviços disponíveis.
          </div>
      )}

      {selectedCompanyId && (
        <>
            {/* SELEÇÃO DE PERFIL */}
            {!selectedProfile ? (
                isLoading ? (
                    <div className="p-8 text-center">A carregar serviços...</div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profiles?.map(profile => (
                                <Card key={profile.id} className="cursor-pointer hover:border-blue-400 transition-all group" onClick={() => setSelectedProfile(profile)}>
                                    <CardContent className="p-6">
                                        <h3 className="font-bold text-lg text-blue-900 group-hover:text-blue-600">{profile.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{profile.description || 'Sem descrição'}</p>
                                        <div className="mt-4 flex items-center gap-2 text-xs font-mono text-gray-400">
                                            <span>{profile.durationMinutes} min</span>
                                            <span>•</span>
                                            <span>{profile.assignableResources?.length || 0} Recursos</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        {profiles?.length === 0 && (
                            <p className="text-center text-gray-500 py-8">
                                Nenhum serviço configurado nesta empresa.
                            </p>
                        )}
                    </div>
                )
            ) : (
                /* WIDGET DE CALENDÁRIO */
                <Card className="min-h-[500px] flex flex-col animate-in fade-in zoom-in duration-300">
                    <div className="p-4 border-b flex items-center gap-4 bg-gray-50 rounded-t-lg">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedProfile(null)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h2 className="font-bold text-gray-800">{selectedProfile.name}</h2>
                            <p className="text-xs text-gray-500">Selecione uma data e hora</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-6">
                        <BookingCalendar 
                            profileId={selectedProfile.id} 
                            onSelectSlot={handleSlotSelect} 
                        />
                    </div>
                </Card>
            )}
        </>
      )}
    </div>
  );
};

export default TestBookingPage;