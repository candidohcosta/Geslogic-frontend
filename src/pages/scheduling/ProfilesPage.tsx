// frontend/src/pages/scheduling/ProfilesPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    fetchSchedulingProfiles, 
    createSchedulingProfile,
    fetchSchedulingResources,
    fetchServices, // Serviços de Fila (Queue)
    fetchCompanies 
} from '../../services/api';
import { SchedulingProfile, SchedulingResource } from '../../types/scheduling';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';

// UI Imports
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Plus, Calendar, Link as LinkIcon, Building2 } from 'lucide-react';

const ProfilesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Seleção de Empresa (Platform Admin)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(user?.company?.id || '');

  // Estados do Formulário
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [duration, setDuration] = useState(30);
  const [buffer, setBuffer] = useState(5);
  
  // Integração com Filas
  const [integratesWithQueue, setIntegratesWithQueue] = useState(false);
  const [linkedQueueServiceId, setLinkedQueueServiceId] = useState<string>('');

  // Recursos (Multi-Select)
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

  // 1. QUERY: Empresas (Platform Admin)
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // Lógica para obter o prefixo do slug
  const getCompanySlugPrefix = () => {
    if (user?.role === UserRole.COMPANY_ADMIN) {
        return user.company?.slug || '';
    }
    // Se for Platform Admin, procura na lista de empresas carregada
    if (user?.role === UserRole.PLATFORM_ADMIN && selectedCompanyId && companies) {
        const selected = companies.find((c: any) => c.id === selectedCompanyId);
        return selected?.slug || '...';
    }
    return '...';
  };

  const companySlugPrefix = getCompanySlugPrefix();

  // 2. QUERIES DEPENDENTES DA EMPRESA SELECIONADA
  const { data: profiles, isLoading } = useQuery<SchedulingProfile[]>({
    queryKey: ['schedulingProfiles', selectedCompanyId],
    queryFn: () => fetchSchedulingProfiles(selectedCompanyId),
    enabled: !!selectedCompanyId || user?.role === UserRole.COMPANY_ADMIN, 
    // Nota: Se for Platform Admin, a API de listagem idealmente devia aceitar companyId, 
    // mas vamos assumir que o backend filtra pelo contexto ou adicionaremos filtro depois se necessário.
    // (Para simplificar, assume-se que CompanyAdmin vê os seus. PlatformAdmin vê tudo ou filtra).
  });

  const { data: resources } = useQuery<SchedulingResource[]>({
    queryKey: ['schedulingResources', selectedCompanyId],
    queryFn: () => fetchSchedulingResources(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: queueServices } = useQuery({
    queryKey: ['queueServices', selectedCompanyId],
    queryFn: () => fetchServices(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  // Mutação
  const createMutation = useMutation({
    mutationFn: createSchedulingProfile,
    onSuccess: () => {
      setShowForm(false);
      setName('');
      setSlug('');
      setSelectedResourceIds([]);
      setIntegratesWithQueue(false);
      queryClient.invalidateQueries({ queryKey: ['schedulingProfiles'] });
    },
    onError: (err: any) => alert(`Erro: ${err.message}`)
  });

  // Auto-gerar Slug a partir do nome
  const handleNameChange = (val: string) => {
    setName(val);
    // Transforma "Consulta Geral" em "consulta-geral"
    const autoSlug = val.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    setSlug(autoSlug);
  };

  const handleResourceToggle = (id: string, checked: boolean) => {
    setSelectedResourceIds(prev => 
        checked ? [...prev, id] : prev.filter(rid => rid !== id)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return alert("Selecione uma empresa.");
    if (selectedResourceIds.length === 0) return alert("Selecione pelo menos um recurso (quem faz o serviço).");

    createMutation.mutate({
      name,
      slug: slug,
      durationMinutes: Number(duration),
      bufferAfterMinutes: Number(buffer),
      integratesWithQueue,
      linkedQueueServiceId: integratesWithQueue ? linkedQueueServiceId : undefined,
      resourceIds: selectedResourceIds,
      companyId: selectedCompanyId // Envia ID se for Platform Admin
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfis de Agendamento</h1>
          <p className="text-gray-500">Tipos de serviço que os utentes podem marcar.</p>
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
          {showForm ? 'Cancelar' : <><Plus className="w-4 h-4 mr-2" /> Novo Perfil</>}
        </Button>
      </div>

      {!selectedCompanyId && user?.role === UserRole.PLATFORM_ADMIN && (
          <div className="p-8 text-center border-2 border-dashed rounded-lg text-gray-400">
              Selecione uma empresa para gerir os perfis.
          </div>
      )}

      {selectedCompanyId && (
        <>
            {showForm && (
                <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                    <CardTitle className="text-base">Configurar Serviço de Agendamento</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* INFO BÁSICA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* --- O CAMPO DE SLUG COM PREFIXO FIXO --- */}
                        <div className="space-y-1.5">
                            <Label>Nome</Label>
                            <div className="flex rounded-md shadow-sm">
{/*                                 <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-gray-100 text-gray-500 text-sm select-none">
                                    {companySlugPrefix}/
                                </span> */}
                                <Input 
                                    className="rounded-l-none" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="ex: Consulta Geral"
                                    required 
                                />
                            </div>
                            <p className="text-[10px] text-gray-500">
                                O link final será: geslogic.com/agendar/{companySlugPrefix}/{slug || '...'}
                            </p>
                        </div>
                        {/* ---------------------------------------- */}
                        <div className="space-y-1.5">
                            <Label>Slug (Link Público)</Label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-gray-500 text-sm whitespace-nowrap shrink-0">
                                    agendar/{companySlugPrefix}/
                                </span>
                                <Input className="rounded-l-none" value={slug} onChange={e => setSlug(e.target.value)} placeholder="ex: consulta-geral" required />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <Label>Duração (min)</Label>
                            <Input type="number" min={5} value={duration} onChange={e => setDuration(Number(e.target.value))} required />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Intervalo/Limpeza (min)</Label>
                            <Input type="number" min={0} value={buffer} onChange={e => setBuffer(Number(e.target.value))} />
                        </div>
                    </div>

                    {/* INTEGRAÇÃO COM FILAS */}
                    <div className="p-4 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center space-x-2 mb-4">
                            <Checkbox 
                                id="queue-integration" 
                                checked={integratesWithQueue}
                                onCheckedChange={(c) => setIntegratesWithQueue(c as boolean)}
                            />
                            <Label htmlFor="queue-integration" className="font-semibold cursor-pointer">
                                Gerar senha de fila automaticamente (Check-in)
                            </Label>
                        </div>

                        {integratesWithQueue && (
                            <div className="ml-6 space-y-1.5 max-w-md">
                                <Label>Qual o serviço de fila correspondente?</Label>
                                <Select value={linkedQueueServiceId} onValueChange={setLinkedQueueServiceId}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o serviço de fila..." /></SelectTrigger>
                                    <SelectContent>
                                        {queueServices?.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500">Quando o utente chegar, será gerada uma senha para este serviço.</p>
                            </div>
                        )}
                    </div>

                    {/* SELEÇÃO DE RECURSOS (MUITO IMPORTANTE) */}
                    <div className="space-y-2">
                        <Label>Quem realiza este serviço? (Selecione um ou vários)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-white p-3 rounded-md border">
                            {resources?.length === 0 && <span className="text-sm text-gray-400 p-2">Sem recursos criados. Crie primeiro em "Recursos".</span>}
                            
                            {resources?.map((res) => (
                                <div key={res.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                    <Checkbox 
                                        id={`res-${res.id}`} 
                                        checked={selectedResourceIds.includes(res.id)}
                                        onCheckedChange={(c) => handleResourceToggle(res.id, c as boolean)}
                                    />
                                    <Label htmlFor={`res-${res.id}`} className="cursor-pointer flex items-center gap-2">
                                        {res.name} 
                                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">{res.type}</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'A criar...' : 'Criar Perfil'}
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
                        <TableHead>Nome</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Integração</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-4">A carregar...</TableCell></TableRow>
                    ) : profiles?.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Nenhum perfil de agendamento criado.</TableCell></TableRow>
                    ) : (
                        profiles?.map((profile) => (
                        <TableRow key={profile.id}>
                            <TableCell className="font-medium">
                                {profile.name}
                                <div className="text-xs text-gray-500">
                                    {profile.assignableResources?.length || 0} recursos atribuídos
                                </div>
                            </TableCell>
                            <TableCell className="text-xs text-blue-600 font-mono">/{profile.slug}</TableCell>
                            <TableCell>{profile.durationMinutes} min</TableCell>
                            <TableCell>
                                {profile.integratesWithQueue ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        <LinkIcon className="w-3 h-3 mr-1" /> Fila
                                    </span>
                                ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                )}
                            </TableCell>
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

export default ProfilesPage;