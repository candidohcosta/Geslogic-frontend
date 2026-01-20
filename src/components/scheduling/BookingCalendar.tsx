// src/components/scheduling/BookingCalendar.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAvailableSlots } from '../../services/api';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, isBefore, startOfDay, parseISO 
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  profileId: string;
  location?: string; // <--- ADICIONADO: Opcional
  onSelectSlot: (date: Date) => void;
}

export const BookingCalendar: React.FC<Props> = ({ profileId, location, onSelectSlot }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const formattedDateQuery = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '';
  
  // 1. QUERY ATUALIZADA: Agora recebe e usa a location
  const { data: slots, isLoading: isLoadingSlots, isError } = useQuery<string[]>({
    queryKey: ['availableSlots', profileId, formattedDateQuery, location], // <--- Adicionado à chave
    queryFn: () => fetchAvailableSlots(profileId, formattedDateQuery, location), // <--- Passado à API
    enabled: !!selectedDay && !!profileId,
  });

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const dateFormat = "d";
    const dayList = eachDayOfInterval({ start: startDate, end: endDate });

    return (
        <div className="grid grid-cols-7 gap-1 text-center mt-2">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                <div key={d} className="text-xs font-medium text-gray-500 py-1 uppercase">{d}</div>
            ))}
            
            {dayList.map((dayItem, idx) => {
                const isPast = isBefore(dayItem, startOfDay(new Date()));
                const isSelected = selectedDay && isSameDay(dayItem, selectedDay);
                const isCurrentMonth = isSameMonth(dayItem, monthStart);

                return (
                    <button
                        key={idx}
                        disabled={isPast}
                        onClick={() => setSelectedDay(dayItem)}
                        className={`
                            h-9 w-9 rounded-full flex items-center justify-center text-sm transition-colors
                            ${!isCurrentMonth ? 'text-gray-300' : ''}
                            ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 text-gray-700'}
                            ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md font-bold' : ''}
                            ${isToday(dayItem) && !isSelected ? 'text-blue-600 font-bold border border-blue-200' : ''}
                        `}
                    >
                        {format(dayItem, dateFormat)}
                    </button>
                );
            })}
        </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full min-h-[400px]">
      
      <div className="flex-1 md:max-w-[350px]">
        <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: pt })}
            </h2>
            <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
        
        {renderCalendarDays()}
      </div>

      <div className="hidden md:block w-px bg-gray-200"></div>

      <div className="flex-1 flex flex-col">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            {selectedDay 
                ? format(selectedDay, "EEEE, d 'de' MMMM", { locale: pt }) 
                : 'Selecione uma data'}
        </h3>

        <div className="flex-1 overflow-y-auto pr-2 max-h-[350px]">
            {!selectedDay ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                    Escolha um dia no calendário para ver os horários disponíveis.
                </div>
            ) : isLoadingSlots ? (
                <div className="h-full flex items-center justify-center text-blue-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : isError ? (
                <div className="text-red-500 text-sm text-center">Erro ao carregar horários.</div>
            ) : slots?.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-10 bg-gray-50 rounded-lg border border-dashed">
                    Não existem vagas disponíveis para este dia.
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slots?.map((isoDateString) => {
                        const dateObj = parseISO(isoDateString);
                        const timeLabel = format(dateObj, 'HH:mm'); 
                        
                        return (
                            <Button
                                key={isoDateString}
                                variant="outline"
                                className="w-full border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white transition-all"
                                onClick={() => onSelectSlot(dateObj)}
                            >
                                {timeLabel}
                            </Button>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

    </div>
  );
};