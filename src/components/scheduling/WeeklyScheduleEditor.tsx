// frontend/src/components/scheduling/WeeklyScheduleEditor.tsx
import React from 'react';
import { WorkingHours, TimeSlot } from '../../types/scheduling';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, Clock } from 'lucide-react';
import { Label } from '../ui/Label';
import { Checkbox } from '../ui/Checkbox';

interface Props {
  value: WorkingHours;
  onChange: (newSchedule: WorkingHours) => void;
}

const DAYS = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export const WeeklyScheduleEditor: React.FC<Props> = ({ value, onChange }) => {

  const handleDayToggle = (dayKey: string, checked: boolean) => {
    const newSchedule = { ...value };
    if (checked) {
      // Se ativar, adiciona um slot padrão 09-18
      newSchedule[dayKey] = [{ start: '09:00', end: '18:00' }];
    } else {
      // Se desativar, remove a chave (fechado)
      delete newSchedule[dayKey];
    }
    onChange(newSchedule);
  };

  const addSlot = (dayKey: string) => {
    const currentSlots = value[dayKey] || [];
    const newSchedule = { ...value };
    // Adiciona um slot vazio
    newSchedule[dayKey] = [...currentSlots, { start: '14:00', end: '15:00' }];
    onChange(newSchedule);
  };

  const removeSlot = (dayKey: string, index: number) => {
    const currentSlots = value[dayKey] || [];
    const newSchedule = { ...value };
    newSchedule[dayKey] = currentSlots.filter((_, i) => i !== index);
    
    // Se ficar sem slots, removemos o dia? Não, deixamos vazio mas ativo (opcional)
    // Mas para manter a consistência com o toggle, se não tem slots, assume-se que pode fechar.
    // Vamos manter o array vazio se o user apagou tudo manualmente.
    
    onChange(newSchedule);
  };

  const updateSlot = (dayKey: string, index: number, field: 'start' | 'end', val: string) => {
    const currentSlots = value[dayKey] || [];
    const newSlots = [...currentSlots];
    newSlots[index] = { ...newSlots[index], [field]: val };
    
    onChange({ ...value, [dayKey]: newSlots });
  };

  return (
    <div className="space-y-4 border rounded-md p-4 bg-white">
      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
        <Clock className="w-4 h-4" /> Horário de Disponibilidade
      </h3>
      
      <div className="space-y-4">
        {DAYS.map((day) => {
          const isOpen = !!value[day.key];
          const slots = value[day.key] || [];

          return (
            <div key={day.key} className="flex flex-col sm:flex-row sm:items-start gap-4 py-2 border-b last:border-0">
              {/* Checkbox Dia */}
              <div className="w-32 flex items-center gap-2 pt-2">
                <Checkbox 
                    id={`day-${day.key}`} 
                    checked={isOpen}
                    onCheckedChange={(c) => handleDayToggle(day.key, c as boolean)}
                />
                <Label htmlFor={`day-${day.key}`} className={`cursor-pointer ${isOpen ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                    {day.label}
                </Label>
              </div>

              {/* Slots de Tempo */}
              <div className="flex-1 space-y-2">
                {!isOpen ? (
                    <span className="text-sm text-gray-400 italic pt-2 block">Fechado</span>
                ) : (
                    <>
                        {slots.map((slot, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <Input 
                                    type="time" 
                                    className="w-28" 
                                    value={slot.start} 
                                    onChange={(e) => updateSlot(day.key, idx, 'start', e.target.value)}
                                />
                                <span className="text-gray-400">-</span>
                                <Input 
                                    type="time" 
                                    className="w-28" 
                                    value={slot.end} 
                                    onChange={(e) => updateSlot(day.key, idx, 'end', e.target.value)}
                                />
                                <button 
                                    type="button"
                                    onClick={() => removeSlot(day.key, idx)}
                                    className="text-gray-400 hover:text-red-500 p-1"
                                    title="Remover intervalo"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => addSlot(day.key)}
                            className="text-blue-600 hover:text-blue-700 h-8 px-2"
                        >
                            <Plus className="w-3 h-3 mr-1" /> Adicionar Pausa / Intervalo
                        </Button>
                    </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};