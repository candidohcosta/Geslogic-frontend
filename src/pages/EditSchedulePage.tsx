// frontend/src/pages/EditSchedulePage.tsx (VERSÃO FINAL E CORRIGIDA)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSchedule, updateSchedule, fetchScheduleById, fetchUserTypes } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Trash2, PlusCircle } from 'lucide-react';
import { translatePriorityRuleType } from '../lib/translations';
import { PriorityRuleType } from '../types/schedules';

// --- INTERFACES E ENUMS ---
//enum PriorityRuleType { ALWAYS_ACTIVE = 'ALWAYS_ACTIVE', SCHEDULED = 'SCHEDULED' }
interface TimeSlotData { id?: string; dayOfWeek: number; startTime: string; endTime: string; }
interface UserTypeOption { id: string; name: string; }
interface ScheduleData {
  id: string;
  description: string;
  userType: UserTypeOption;
  ruleType: PriorityRuleType;
  isActive?: boolean;
  timeSlots?: TimeSlotData[];
  company?: { id: string };
}
interface SchedulePayload {
  description: string;
  userTypeId: string;
  ruleType: PriorityRuleType;
  isActive?: boolean;
  timeSlots?: Omit<TimeSlotData, 'id'>[]; // O payload não envia o 'id' dos time slots
  companyId?: string;
}

const weekDays = [
  {id: 1, name: 'Segunda-feira'}, {id: 2, name: 'Terça-feira'}, {id: 3, name: 'Quarta-feira'},
  {id: 4, name: 'Quinta-feira'}, {id: 5, name: 'Sexta-feira'}, {id: 6, name: 'Sábado'}, {id: 7, name: 'Domingo'}
];

const EditSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { scheduleId } = useParams<{ scheduleId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!scheduleId;

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const companyIdFromQuery = queryParams.get('companyId');

  const [formData, setFormData] = useState({
    description: '',
    userTypeId: '',
    ruleType: PriorityRuleType.SCHEDULED,
    isActive: true,
    timeSlots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }] as Partial<TimeSlotData>[],
  });

  const { data: scheduleDetails, isLoading } = useQuery<ScheduleData, Error>({
    queryKey: ['schedule', scheduleId],
    queryFn: () => fetchScheduleById(scheduleId!),
    enabled: isEditing,
  });

  const companyIdForFetch = useMemo(() => {
    if (isEditing && scheduleDetails) return scheduleDetails.company?.id;
    return user?.role === UserRole.PLATFORM_ADMIN ? (companyIdFromQuery ?? undefined) : user?.company?.id;
  }, [scheduleDetails, isEditing, user, companyIdFromQuery]);

  const { data: availableUserTypes = [], isLoading: isLoadingUserTypes } = useQuery<UserTypeOption[]>({
    queryKey: ['userTypes', companyIdForFetch],
    queryFn: () => fetchUserTypes(companyIdForFetch),
    enabled: !!companyIdForFetch,
  });

  useEffect(() => {
    if (isEditing && scheduleDetails) {
      
      // 1. PRIMEIRO, FORMATAMOS OS TIME SLOTS
      let formattedTimeSlots: Partial<TimeSlotData>[] = [{}]; // Valor padrão
      if (scheduleDetails.timeSlots && scheduleDetails.timeSlots.length > 0) {
        formattedTimeSlots = scheduleDetails.timeSlots.map(slot => ({
          ...slot,
          // Cortamos a string para remover os segundos
          startTime: slot.startTime?.slice(0, 5),
          endTime: slot.endTime?.slice(0, 5),
        }));
      }

      // 2. DEPOIS, ATUALIZAMOS O ESTADO 'formData' COM OS DADOS CORRETOS
      setFormData({
        description: scheduleDetails.description || '',
        userTypeId: scheduleDetails.userType?.id || '',
        ruleType: scheduleDetails.ruleType || PriorityRuleType.SCHEDULED,
        isActive: scheduleDetails.isActive ?? true,
        timeSlots: formattedTimeSlots, // Usamos a nossa variável formatada
      });
    }
  }, [scheduleDetails, isEditing]);

  const { mutate: saveSchedule, isPending } = useMutation({
    mutationFn: (payload: SchedulePayload) => isEditing ? updateSchedule({ id: scheduleId!, scheduleData: payload }) : createSchedule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', companyIdForFetch] });
      navigate(`/schedules/company/${companyIdForFetch}`);
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  const handleTimeSlotChange = (index: number, field: keyof TimeSlotData, value: any) => {
    const newTimeSlots = [...formData.timeSlots];
    newTimeSlots[index] = { ...newTimeSlots[index], [field]: value };
    setFormData(prev => ({ ...prev, timeSlots: newTimeSlots }));
  };
  const addTimeSlot = () => setFormData(prev => ({ ...prev, timeSlots: [...prev.timeSlots, { dayOfWeek: 1, startTime: '', endTime: '' }] }));
  const removeTimeSlot = (index: number) => setFormData(prev => ({ ...prev, timeSlots: prev.timeSlots.filter((_, i) => i !== index) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userTypeId) {
      alert('Por favor, selecione um Tipo de Utente.');
      return;
    }

    let timeSlotsForPayload: Omit<TimeSlotData, 'id'>[] = [];
    if (formData.ruleType === PriorityRuleType.SCHEDULED) {
      timeSlotsForPayload = formData.timeSlots
        // AQUI ESTÁ A CORREÇÃO:
        // Adicionamos a verificação de 'dayOfWeek' e usamos um "type guard"
        .filter(
          (ts): ts is TimeSlotData => 
            ts.dayOfWeek !== undefined && !!ts.startTime && !!ts.endTime
        )
        .map(({ id, ...rest }) => rest);
    }
    
    const basePayload = { 
      description: formData.description, 
      userTypeId: formData.userTypeId, 
      ruleType: formData.ruleType, 
      timeSlots: timeSlotsForPayload,
    };

    let finalPayload: SchedulePayload;
    if (isEditing) {
      finalPayload = { ...basePayload, isActive: formData.isActive };
    } else {
      const companyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromQuery : user?.company?.id;
      finalPayload = { ...basePayload, companyId: companyId ?? undefined };
    }
    
    saveSchedule(finalPayload);
  };

  if (isEditing && isLoading) return <div>A carregar...</div>;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Regra de Prioridade' : 'Criar Nova Regra'}</CardTitle>
        <CardDescription>Defina quando e para quem esta regra de prioridade se aplica.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="userTypeId">Aplicar Prioridade a</Label>
            <Select key={`user-type-select-${formData.userTypeId}`} value={formData.userTypeId} onValueChange={(v) => handleInputChange('userTypeId', v)} required>
              <SelectTrigger id="userTypeId"><SelectValue placeholder="Selecione um Tipo de Utente..." /></SelectTrigger>
              <SelectContent>{isLoadingUserTypes ? <SelectItem value="loading" disabled>A carregar...</SelectItem> : availableUserTypes.map(type => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Tipo de Regra</Label>
            <Select key={`rule-type-select-${formData.ruleType}`} value={formData.ruleType} onValueChange={(v) => handleInputChange('ruleType', v as PriorityRuleType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={PriorityRuleType.ALWAYS_ACTIVE}>{translatePriorityRuleType(PriorityRuleType.ALWAYS_ACTIVE)}</SelectItem>
                <SelectItem value={PriorityRuleType.SCHEDULED}>{translatePriorityRuleType(PriorityRuleType.SCHEDULED)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="isActive" checked={formData.isActive} onCheckedChange={(c) => handleInputChange('isActive', Boolean(c))} disabled={!isEditing}/>
            <Label htmlFor="isActive">Regra Ativa</Label>
          </div>
          {formData.ruleType === PriorityRuleType.SCHEDULED && (
            <div className="space-y-4 pt-4 border-t">
              <Label className="font-semibold">Intervalos de Tempo</Label>
              {formData.timeSlots.map((slot, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                  <Select value={String(slot.dayOfWeek || 1)} onValueChange={(v) => handleTimeSlotChange(index, 'dayOfWeek', Number(v))} key={`day-select-${index}-${slot.dayOfWeek}`} >
                    <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                    <SelectContent>{weekDays.map(day => <SelectItem key={day.id} value={String(day.id)}>{day.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="time" value={slot.startTime || ''} onChange={(e) => handleTimeSlotChange(index, 'startTime', e.target.value)} />
                  <Input type="time" value={slot.endTime || ''} onChange={(e) => handleTimeSlotChange(index, 'endTime', e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTimeSlot(index)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addTimeSlot} className="w-full"><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Intervalo</Button>
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending}>{isPending ? 'A Guardar...' : 'Guardar Regra'}</Button>
      </CardFooter>
    </Card>
  );
};

export default EditSchedulePage;