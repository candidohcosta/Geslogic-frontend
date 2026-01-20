import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rescheduleAppointment } from '../../services/api';
import { BookingCalendar } from './BookingCalendar';
//import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog'; // Se tiveres Dialog, senão usa div fixa
import { X } from 'lucide-react';

interface Props {
  appointment: any; // O objeto do agendamento que estamos a mexer
  onClose: () => void;
}

export const RescheduleModal: React.FC<Props> = ({ appointment, onClose }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (date: Date) => rescheduleAppointment(appointment.id, date.toISOString()),
    onSuccess: () => {
      alert('Reagendado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    },
    onError: (err: any) => alert('Erro: ' + err.message)
  });

  const handleSelectSlot = (date: Date) => {
    if (window.confirm(`Mudar para ${date.toLocaleString()}?`)) {
        mutation.mutate(date);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-lg">Reagendar: {appointment.guestName || 'Cliente'}</h3>
            <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
            <p className="mb-4 text-sm text-gray-500">Selecione o novo horário para o serviço <strong>{appointment.profile.name}</strong>.</p>
            
            {/* Reutilizamos o Calendário que já tem a lógica de slots livres! */}
            <BookingCalendar 
                profileId={appointment.profile.id}
                onSelectSlot={handleSelectSlot}
                // Se tiver location no recurso, podíamos passar aqui, mas o profileId deve chegar
            />
        </div>
      </div>
    </div>
  );
};