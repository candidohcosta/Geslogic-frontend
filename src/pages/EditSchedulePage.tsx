// frontend/src/pages/EditSchedulePage.tsx (VERSÃO FINAL E CORRIGIDA — template unificado)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSchedule, updateSchedule, fetchScheduleById, fetchUserTypes } from '../services/api';
import { UserRole } from '../types/user';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Trash2, PlusCircle, CalendarClock } from 'lucide-react';

import { translatePriorityRuleType } from '../lib/translations';
import { PriorityRuleType } from '../types/schedules';

import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
type SectionsProp = React.ComponentProps<typeof DetailFormTemplate>['sections'];

// --- INTERFACES ---
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
  timeSlots?: Omit<TimeSlotData, 'id'>[];
  companyId?: string;
}

const weekDays = [
  { id: 1, name: 'Segunda-feira' },
  { id: 2, name: 'Terça-feira' },
  { id: 3, name: 'Quarta-feira' },
  { id: 4, name: 'Quinta-feira' },
  { id: 5, name: 'Sexta-feira' },
  { id: 6, name: 'Sábado' },
  { id: 7, name: 'Domingo' },
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
    ruleType: PriorityRuleType.SCHEDULED as PriorityRuleType,
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
    return user?.role === UserRole.PLATFORM_ADMIN
      ? (companyIdFromQuery ?? undefined)
      : user?.company?.id;
  }, [scheduleDetails, isEditing, user, companyIdFromQuery]);

  const { data: availableUserTypes = [], isLoading: isLoadingUserTypes } = useQuery<UserTypeOption[]>({
    queryKey: ['userTypes', companyIdForFetch],
    queryFn: () => fetchUserTypes(companyIdForFetch),
    enabled: !!companyIdForFetch,
  });

  useEffect(() => {
    if (isEditing && scheduleDetails) {
      // Formatar timeslots (remover segundos)
      let formattedTimeSlots: Partial<TimeSlotData>[] = [{}];
      if (scheduleDetails.timeSlots && scheduleDetails.timeSlots.length > 0) {
        formattedTimeSlots = scheduleDetails.timeSlots.map(slot => ({
          ...slot,
          startTime: slot.startTime?.slice(0, 5),
          endTime: slot.endTime?.slice(0, 5),
        }));
      }
      setFormData({
        description: scheduleDetails.description || '',
        userTypeId: scheduleDetails.userType?.id || '',
        ruleType: scheduleDetails.ruleType || PriorityRuleType.SCHEDULED,
        isActive: scheduleDetails.isActive ?? true,
        timeSlots: formattedTimeSlots,
      });
    }
  }, [scheduleDetails, isEditing]);

  const { mutate: saveSchedule, isPending } = useMutation({
    mutationFn: (payload: SchedulePayload) =>
      isEditing
        ? updateSchedule({ id: scheduleId!, scheduleData: payload })
        : createSchedule(payload),
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

  const addTimeSlot = () =>
    setFormData(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, { dayOfWeek: 1, startTime: '', endTime: '' }],
    }));

  const removeTimeSlot = (index: number) =>
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((_, i) => i !== index),
    }));

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.userTypeId) {
      alert('Por favor, selecione um Tipo de Utente.');
      return;
    }

    let timeSlotsForPayload: Omit<TimeSlotData, 'id'>[] = [];
    if (formData.ruleType === PriorityRuleType.SCHEDULED) {
      timeSlotsForPayload = formData.timeSlots
        .filter(
          (ts): ts is TimeSlotData =>
            ts.dayOfWeek !== undefined && !!ts.startTime && !!ts.endTime
        )
        .map(({ id, ...rest }) => rest);
    }

    const basePayload: SchedulePayload = {
      description: formData.description,
      userTypeId: formData.userTypeId,
      ruleType: formData.ruleType,
      timeSlots: timeSlotsForPayload,
    };

    let finalPayload: SchedulePayload;
    if (isEditing) {
      finalPayload = { ...basePayload, isActive: formData.isActive };
    } else {
      const companyId =
        user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromQuery : user?.company?.id;
      finalPayload = { ...basePayload, companyId: companyId ?? undefined };
    }

    saveSchedule(finalPayload);
  };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isEditing && isLoading) return <div className="p-6 text-center">A carregar...</div>;

  // ===== Secções (full width) =====
  const sections: SectionsProp = [
    {
      title: 'Configuração',
      description: 'Defina quando e para quem esta regra de prioridade se aplica.',
      accent: true,
      content: (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="userTypeId">Aplicar Prioridade a</Label>
            <Select
              key={`user-type-select-${formData.userTypeId}`}
              value={formData.userTypeId}
              onValueChange={(v) => handleInputChange('userTypeId', v)}
              required
            >
              <SelectTrigger id="userTypeId">
                <SelectValue placeholder="Selecione um Tipo de Utente..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingUserTypes ? (
                  <SelectItem value="loading" disabled>
                    A carregar...
                  </SelectItem>
                ) : (
                  availableUserTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Tipo de Regra</Label>
            <Select
              key={`rule-type-select-${formData.ruleType}`}
              value={formData.ruleType}
              onValueChange={(v) => handleInputChange('ruleType', v as PriorityRuleType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PriorityRuleType.ALWAYS_ACTIVE}>
                  {translatePriorityRuleType(PriorityRuleType.ALWAYS_ACTIVE)}
                </SelectItem>
                <SelectItem value={PriorityRuleType.SCHEDULED}>
                  {translatePriorityRuleType(PriorityRuleType.SCHEDULED)}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(c) => handleInputChange('isActive', Boolean(c))}
              disabled={!isEditing}
            />
            <Label htmlFor="isActive">Regra Ativa</Label>
          </div>
        </form>
      ),
    },

    ...(formData.ruleType === PriorityRuleType.SCHEDULED
      ? [
          {
            title: 'Intervalos de Tempo',
            description:
              'Configure os dias e horas em que a regra estará ativa. Pode adicionar múltiplos intervalos.',
            accent: true,
            content: (
              <div className="space-y-4">
                {formData.timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 border rounded-md"
                  >
                    <Select
                      value={String(slot.dayOfWeek || 1)}
                      onValueChange={(v) => handleTimeSlotChange(index, 'dayOfWeek', Number(v))}
                      key={`day-select-${index}-${slot.dayOfWeek}`}
                    >
                      <SelectTrigger className="sm:w-60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weekDays.map((day) => (
                          <SelectItem key={day.id} value={String(day.id)}>
                            {day.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="time"
                      value={slot.startTime || ''}
                      onChange={(e) => handleTimeSlotChange(index, 'startTime', e.target.value)}
                      className="sm:w-40"
                    />
                    <Input
                      type="time"
                      value={slot.endTime || ''}
                      onChange={(e) => handleTimeSlotChange(index, 'endTime', e.target.value)}
                      className="sm:w-40"
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTimeSlot(index)}
                      title="Remover intervalo"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}

                <Button type="button" variant="secondary" onClick={addTimeSlot} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Intervalo
                </Button>
              </div>
            ),
          } as const,
        ]
      : []),
  ];

  return (
    <DetailFormTemplate
      header={{
        icon: CalendarClock,
        title: isEditing ? 'Editar Regra de Prioridade' : 'Criar Nova Regra',
        subtitle: 'Defina quando e para quem esta regra de prioridade se aplica.',
        actions: (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button size="sm" onClick={() => handleSubmit()} disabled={isPending}>
              {isPending ? 'A Guardar...' : (isEditing ? 'Guardar Alterações' : 'Guardar Regra')}
            </Button>
          </div>
        ),
      }}
      columnsMd={1}         // full width em todas as secções
      sections={sections}
      actions={<></>}       // sem botões no rodapé
    />
  );
};

export default EditSchedulePage;