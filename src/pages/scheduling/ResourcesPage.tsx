// frontend/src/pages/scheduling/ResourcesPage.tsx

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    fetchSchedulingResources, 
    createSchedulingResource,
    fetchCompanies
} from '../../services/api';
import { SchedulingResource, ResourceType, WorkingHours } from '../../types/scheduling';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';
// UI Imports
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Plus, User, Box, Monitor, Clock, Building2, MapPin } from 'lucide-react';
import { WeeklyScheduleEditor } from '../../components/scheduling/WeeklyScheduleEditor';

const ResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Estado da Empresa Selecionada
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(user?.company?.id || '');

  // Estados do Formulário
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>(ResourceType.USER);
  const [locationName, setLocationName] = useState(''); // NOVO
  const [address, setAddress] = useState(''); // NOVO

  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: [{ start: '09:00', end: '18:00' }],
    tuesday: [{ start: '09:00', end: '18:00' }],
    wednesday: [{ start: '09:00', end: '18:00' }],
    thursday: [{ start: '09:00', end: '18:00' }],
    friday: [{ start: '09:00', end: '18:00' }],
  });

  // 1. Buscar Empresas (Só se for Platform Admin)
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // 2. Buscar Recursos (Depende da Empresa Selecionada)
  const { data: resources, isLoading } = useQuery<SchedulingResource[]>({
    queryKey: ['schedulingResources', selectedCompanyId],
    queryFn: () => fetchSchedulingResources(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: createSchedulingResource,
    onSuccess: () => {
      setShowForm(false);
      setName('');
      setLocationName(''); // Limpar
      setAddress(''); // Limpar
      
      // Reset horário
      setWorkingHours({
        monday: [{ start: '09:00', end: '18:00' }],
        tuesday: [{ start: '09:00', end: '18:00' }],
        wednesday: [{ start: '09:00', end: '18:00' }],
        thursday: [{ start: '09:00', end: '18:00' }],
        friday: [{ start: '09:00', end: '18:00' }],
      });
      queryClient.invalidateQueries({ queryKey: ['schedulingResources'] });
    },
    onError: (err: any) => alert(`Erro: ${err.message}`)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return alert("Selecione uma empresa.");

    createMutation.mutate({
      name,
      type,
      locationName, // Enviar
      address, // Enviar
      timezone: 'Europe/Lisbon',
      workingHours,
      companyId: selectedCompanyId 
    });
  };

  const getIcon = (type: ResourceType) => {
    switch (type) {
      case ResourceType.USER: return <User className="w-4 h-4" />;
      case ResourceType.ROOM: return <Box className="w-4 h-4" />;
      case ResourceType.EQUIPMENT: return <Monitor className="w-4 h-4" />;
    }
  };

  const formatScheduleSummary = (hours: WorkingHours) => {
    const days = Object.keys(hours).length;
    if (days === 0) return 'Fechado';
    if (days === 5 && hours.monday && hours.friday) return 'Seg-Sex';
    return `${days} dias/sem`;
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recursos de Agendamento</h1>
          <p className="text-gray-500">Pessoas, Salas ou Equipamentos.</p>
        </div>
        
        {/* SELETOR DE EMPRESA (PLATFORM ADMIN) */}
        {user?.role === UserRole.PLATFORM_ADMIN && (
            <div className="w-full md:w-64">
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
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

        <Button onClick={() => setShowForm(!showForm)} disabled={!selectedCompanyId}>
          {showForm ? 'Cancelar' : <><Plus className="w-4 h-4 mr-2" /> Novo Recurso</>}
        </Button>
      </div>

      {/* AVISO SE NÃO HOUVER EMPRESA SELECIONADA */}
      {!selectedCompanyId && user?.role === UserRole.PLATFORM_ADMIN && (
          <div className="p-8 text-center border-2 border-dashed rounded-lg text-gray-400">
              Selecione uma empresa para gerir os seus recursos.
          </div>
      )}

      {/* FORMULÁRIO E LISTA */}
      {selectedCompanyId && (
        <>
            {showForm && (
                <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                    <CardTitle className="text-base">Adicionar Novo Recurso</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* DADOS BÁSICOS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                            <Label>Nome do Recurso</Label>
                            <Input placeholder="Ex: Dr. Silva..." value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tipo</Label>
                            <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ResourceType.USER}>Pessoa (Staff)</SelectItem>
                                    <SelectItem value={ResourceType.ROOM}>Espaço / Sala</SelectItem>
                                    <SelectItem value={ResourceType.EQUIPMENT}>Equipamento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* DADOS DE LOCALIZAÇÃO (NOVO) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Localização / Delegação</Label>
                            <Input 
                                placeholder="Ex: Sede, Loja Lisboa..." 
                                value={locationName} 
                                onChange={e => setLocationName(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Morada Completa</Label>
                            <Input 
                                placeholder="Ex: Rua X, 123" 
                                value={address} 
                                onChange={e => setAddress(e.target.value)} 
                            />
                        </div>
                    </div>

                    <WeeklyScheduleEditor value={workingHours} onChange={setWorkingHours} />

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'A criar...' : 'Criar Recurso'}
                        </Button>
                    </div>
                    </form>
                </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-0">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Localização</TableHead> {/* NOVA COLUNA */}
                        <TableHead>Horário</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-4">A carregar...</TableCell></TableRow>
                    ) : resources?.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Nenhum recurso criado.</TableCell></TableRow>
                    ) : (
                        resources?.map((res) => (
                        <TableRow key={res.id}>
                            <TableCell>{getIcon(res.type)}</TableCell>
                            <TableCell className="font-medium">{res.name}</TableCell>
                            <TableCell className="text-xs text-gray-500">{res.type}</TableCell>
                            
                            {/* COLUNA DE LOCALIZAÇÃO */}
                            <TableCell>
                                {res.locationName ? (
                                    <span className="flex items-center text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit">
                                        <MapPin className="w-3 h-3 mr-1" /> {res.locationName}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </TableCell>

                            <TableCell className="text-xs font-mono">{formatScheduleSummary(res.workingHours)}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm">Editar</Button>
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </>
      )}
    </div>
  );
};

export default ResourcesPage;