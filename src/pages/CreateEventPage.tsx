import React, { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createEvent, fetchCompanies } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Textarea } from '../components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Building2 } from 'lucide-react';

const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const preselectedId = location.state?.preselectedCompanyId;

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(preselectedId || user?.company?.id || '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [registrationStartDate, setRegistrationStartDate] = useState('');
  const [locationName, setLocationName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [baseCost, setBaseCost] = useState<number | ''>(''); // Apenas o custo base
  const [isPublic, setIsPublic] = useState(true);
  
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { mutate: createEventMutate, isPending, error: mutationError } = useMutation({
    mutationFn: createEvent,
    onSuccess: (newEvent) => {
      setSuccess(`Evento "${newEvent.name}" criado com sucesso!`);
      // Redirecionar para a edição para adicionar campos e tarifas
      setTimeout(() => navigate(`/events/edit/${newEvent.id}`), 1500);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setFormError(null);

    if (user?.role === UserRole.PLATFORM_ADMIN && !selectedCompanyId) {
        setFormError('Por favor, selecione uma empresa.');
        return;
    }

    if (!name || !startDate || !registrationStartDate || !locationName || maxParticipants === '' || baseCost === '') {
      setFormError('Preencha os campos obrigatórios.');
      return;
    }

    const eventData = { 
        name, description, startDate, endDate: endDate || undefined, 
        registrationStartDate, location: locationName, 
        maxParticipants: Number(maxParticipants), isActive, isPublic, 
        baseCost: Number(baseCost), 
        companyId: selectedCompanyId
    };
    
    createEventMutate(eventData);
  };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      {success && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md"><CardContent className="p-6 text-center"><CardTitle>Sucesso!</CardTitle><CardDescription>A redirecionar para configuração avançada...</CardDescription></CardContent></Card>
        </div>
      )}

      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Criar Novo Evento</CardTitle>
          <CardDescription>Defina os dados base. Poderá adicionar campos e tarifas específicas no próximo passo.</CardDescription>
        </CardHeader>
        <CardContent>
          {formError && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">{formError}</div>}
          {mutationError && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">{(mutationError as Error).message}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {user.role === UserRole.PLATFORM_ADMIN && (
                <div className="p-4 bg-gray-50 border rounded-md mb-6">
                    <Label className="mb-2 block font-bold">Empresa Organizadora</Label>
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="bg-white"><Building2 className="w-4 h-4 mr-2" /><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{companies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            )}

            <div className="grid w-full items-center gap-1.5"><Label>Nome do Evento *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="grid w-full items-center gap-1.5"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5"><Label>Início do Evento *</Label><Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
              <div className="grid w-full items-center gap-1.5"><Label>Fim do Evento</Label><Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5"><Label>Abertura das Inscrições *</Label><Input type="datetime-local" value={registrationStartDate} onChange={(e) => setRegistrationStartDate(e.target.value)} required /></div>
              <div className="grid w-full items-center gap-1.5"><Label>Localização *</Label><Input value={locationName} onChange={(e) => setLocationName(e.target.value)} required /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5"><Label>Lotação Máx. *</Label><Input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} min="0" required /></div>
              <div className="grid w-full items-center gap-1.5"><Label>Custo Base (€) *</Label><Input type="number" value={baseCost} onChange={(e) => setBaseCost(Number(e.target.value))} min="0" step="0.01" required /></div>
            </div>

            <div className="flex items-center space-x-4 pt-2">
              <div className="flex items-center space-x-2"><Checkbox id="isActive" checked={isActive} onCheckedChange={(c) => setIsActive(Boolean(c))} /><Label htmlFor="isActive">Ativo</Label></div>
              <div className="flex items-center space-x-2"><Checkbox id="isPublic" checked={isPublic} onCheckedChange={(c) => setIsPublic(Boolean(c))} /><Label htmlFor="isPublic">Público</Label></div>
            </div>

            <Button type="submit" className="w-full mt-6" disabled={isPending}>{isPending ? 'A criar...' : 'Criar Evento'}</Button>
          </form>
        </CardContent>
        <CardFooter><Button variant="outline" className="w-full" onClick={() => navigate(-1)}>Voltar</Button></CardFooter>
      </Card>
    </div>
  );
};
export default CreateEventPage;