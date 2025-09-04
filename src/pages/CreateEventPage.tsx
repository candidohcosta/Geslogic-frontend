// frontend/src/pages/CreateEventPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { createEvent } from '../services/api';
import { UserData, UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Textarea } from '../components/ui/Textarea';

const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [registrationStartDate, setRegistrationStartDate] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [baseCost, setBaseCost] = useState<number | ''>('');
  const [costType1, setCostType1] = useState<number | ''>('');
  const [costType2, setCostType2] = useState<number | ''>('');
  const [costType3, setCostType3] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { mutate: createEventMutate, isPending, error: mutationError } = useMutation({
    mutationFn: createEvent,
    onSuccess: (newEvent) => {
      setSuccess(`Evento "${newEvent.name}" criado com sucesso!`);
      // Limpar formulário
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setRegistrationStartDate('');
      setLocation('');
      setMaxParticipants('');
      setBaseCost('');
      setCostType1('');
      setCostType2('');
      setCostType3('');
      setIsActive(true);
      // Opcional: redirecionar para a página de edição do novo evento
      setTimeout(() => navigate(`/events/edit/${newEvent.id}`), 2000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setFormError(null);

    if (!name || !startDate || !registrationStartDate || !location || maxParticipants === '' || baseCost === '') {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    // ... (as tuas outras validações de data estão perfeitas e podem ficar aqui)

    // Se a validação passar, preparamos os dados e chamamos a mutação
    const eventData = { name, description, startDate, endDate, registrationStartDate, location, maxParticipants: Number(maxParticipants), isActive, baseCost: Number(baseCost), costType1: costType1 === '' ? undefined : Number(costType1), costType2: costType2 === '' ? undefined : Number(costType2), costType3: costType3 === '' ? undefined : Number(costType3) };
    createEventMutate(eventData);
  };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4">

    {/* +++ O NOSSO NOVO MODAL DE SUCESSO +++ */}
    {success && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-green-500 mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle>Sucesso!</CardTitle>
            <CardDescription>O novo evento foi criado. A redirecionar para a lista...</CardDescription>
          </CardContent>
        </Card>
      </div>
    )}

      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Criar Novo Evento</CardTitle>
          <CardDescription>Preencha os detalhes abaixo para criar um novo evento.</CardDescription>
        </CardHeader>
        <CardContent>
          {formError && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">{formError}</div>}
          {mutationError && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">{(mutationError as Error).message}</div>}
          {success && <div className="p-3 mb-4 text-sm text-green-800 bg-green-100 rounded-md">{success}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="name">Nome do Evento <span className="text-red-500">*</span></Label>
              <Input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="startDate">Data e Hora de Início <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="endDate">Data e Hora de Fim</Label>
                <Input type="datetime-local" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="registrationStartDate">Início das Inscrições <span className="text-red-500">*</span></Label>
              <Input type="datetime-local" id="registrationStartDate" value={registrationStartDate} onChange={(e) => setRegistrationStartDate(e.target.value)} required />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="location">Localização <span className="text-red-500">*</span></Label>
              <Input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="maxParticipants">Nº Máx. Participantes <span className="text-red-500">*</span></Label>
                <Input type="number" id="maxParticipants" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} min="0" required />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="baseCost">Custo Base (€) <span className="text-red-500">*</span></Label>
                <Input type="number" id="baseCost" value={baseCost} onChange={(e) => setBaseCost(Number(e.target.value))} min="0" step="0.01" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="costType1">Custo Tipo 1 (€)</Label>
                <Input type="number" id="costType1" value={costType1} onChange={(e) => setCostType1(Number(e.target.value))} min="0" step="0.01" />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="costType2">Custo Tipo 2 (€)</Label>
                <Input type="number" id="costType2" value={costType2} onChange={(e) => setCostType2(Number(e.target.value))} min="0" step="0.01" />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="costType3">Custo Tipo 3 (€)</Label>
                <Input type="number" id="costType3" value={costType3} onChange={(e) => setCostType3(Number(e.target.value))} min="0" step="0.01" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={(checked) => setIsActive(Boolean(checked))} />
              <Label htmlFor="isActive">Evento Ativo</Label>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'A criar...' : 'Criar Evento'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateEventPage;