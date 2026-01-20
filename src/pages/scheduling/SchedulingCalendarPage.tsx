// frontend/src/pages/scheduling/SchedulingCalendarPage.tsx
import React, { useState, useMemo, useContext, createContext } from 'react';
import { Calendar, dateFnsLocalizer, View, Views, Navigate } from 'react-big-calendar';
import { 
  format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, 
  startOfWeek as startOfWeekFns, endOfWeek as endOfWeekFns,
  startOfDay, endOfDay, addDays
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { 
    fetchAppointments, 
    fetchSchedulingResources, 
    fetchCompanies 
} from '../../services/api';
import { SchedulingResource } from '../../types/scheduling';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user'; 
import { RescheduleModal } from '../../components/scheduling/RescheduleModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Card, CardContent } from '../../components/ui/Card';
import { Building2 } from 'lucide-react'; 
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'pt': pt };

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

// --- 1. CONTEXTO DE VISTA (Para o evento saber onde está) ---
const CalendarViewContext = createContext<View>(Views.MONTH);
// -----------------------------------------------------------

// --- 2. COMPONENTE VISUAL DO EVENTO (Inteligente) ---
const CustomEventComponent = ({ event }: any) => {
    const currentView = useContext(CalendarViewContext); // Lê a vista atual

    // Conteúdo do "Balão" (Tooltip nativo)
    const tooltipContent = `
📅 Data: ${format(event.start, 'dd/MM/yyyy')}
⏰ Hora: ${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}
👤 Cliente: ${event.title}
🛠️ Serviço: ${event.serviceName}
📍 Estado: ${event.status}
📞 Contacto: ${event.resource.guestPhone || event.resource.customer?.email || 'N/A'}
    `.trim();

    return (
        <div 
            className="h-full flex flex-col justify-start overflow-hidden leading-none" 
            title={tooltipContent} // <--- O BALÃO DE INFORMAÇÃO
        >
            {/* Título (Nome do Cliente) - Sempre visível */}
            <div className="font-bold text-xs truncate mb-0.5">
                {event.title}
            </div>
            
            {/* Subtítulo (Serviço) - Escondido no Mês, Visível no Dia/Semana */}
            {currentView !== Views.MONTH && (
                <div className="text-[10px] opacity-90 truncate leading-tight">
                    {event.serviceName}
                </div>
            )}
        </div>
    );
};
// ---------------------------------------------------------

// --- COMPONENTE DE AGENDA PERSONALIZADO ---
const CustomAgendaView = ({ events, onSelectEvent }: any) => {
    const sortedEvents = [...events].sort((a: any, b: any) => a.start - b.start);

    if (sortedEvents.length === 0) {
        return <div className="p-8 text-center text-gray-500">Sem agendamentos neste período.</div>;
    }

    return (
        <div className="overflow-auto h-full bg-white rounded-md">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-4 py-3 w-32 border-b">Data</th>
                        <th className="px-4 py-3 w-32 border-b">Hora</th>
                        <th className="px-4 py-3 border-b">Cliente / Serviço</th>
                        <th className="px-4 py-3 w-32 border-b text-center">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedEvents.map((evt: any) => {
                        let statusColor = 'bg-blue-100 text-blue-800';
                        if (evt.status === 'CANCELED') statusColor = 'bg-red-100 text-red-800';
                        if (evt.status === 'COMPLETED') statusColor = 'bg-green-100 text-green-800';

                        // Tooltip também na lista
                        const tooltipText = `Cliente: ${evt.title}\nServiço: ${evt.serviceName}\nContacto: ${evt.resource.guestPhone || 'N/A'}`;

                        return (
                            <tr 
                                key={evt.id} 
                                className="bg-white border-b hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => onSelectEvent(evt)} 
                                title={tooltipText}
                            >
                                <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-100">
                                    {format(evt.start, 'dd MMM', { locale: pt })} <span className="text-gray-400 font-normal text-xs block">{format(evt.start, 'EEE', { locale: pt })}</span>
                                </td>
                                <td className="px-4 py-3 text-gray-600 font-mono text-xs border-r border-gray-100">
                                    {format(evt.start, 'HH:mm')} - {format(evt.end, 'HH:mm')}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-800">
                                    <div>{evt.title}</div>
                                    <div className="text-xs text-gray-500">{evt.serviceName}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                                        {evt.status}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

CustomAgendaView.range = (date: Date) => {
    const start = date;
    const end = addDays(start, 30); 
    return [start, end];
};
CustomAgendaView.navigate = (date: Date, action: any) => {
    switch (action) {
        case Navigate.PREVIOUS: return addDays(date, -30);
        case Navigate.NEXT: return addDays(date, 30);
        default: return date;
    }
};
CustomAgendaView.title = (date: Date) => {
    return `Agenda: ${format(date, 'd MMM')} a ${format(addDays(date, 30), 'd MMM')}`;
};


const SchedulingCalendarPage: React.FC = () => {
  const { user } = useAuth();
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(user?.company?.id || '');
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [resourceFilter, setResourceFilter] = useState<string>('ALL');
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { start, end } = useMemo(() => {
    let start = startOfMonth(date);
    let end = endOfMonth(date);

    if (view === Views.WEEK || view === Views.WORK_WEEK) {
        start = startOfWeekFns(date, { weekStartsOn: 1 });
        end = endOfWeekFns(date, { weekStartsOn: 1 });
    }
    if (view === Views.DAY) {
        start = startOfDay(date);
        end = endOfDay(date);
    }
    if (view === Views.AGENDA) {
        start = startOfDay(date);
        end = endOfDay(addDays(date, 30));
    }
    
    return { start: start.toISOString(), end: end.toISOString() };
  }, [date, view]);

  const { data: resources } = useQuery<SchedulingResource[]>({
    queryKey: ['schedulingResources', selectedCompanyId],
    queryFn: () => fetchSchedulingResources(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', start, end, resourceFilter, selectedCompanyId],
    queryFn: () => fetchAppointments({
        startDate: start,
        endDate: end,
        resourceId: resourceFilter !== 'ALL' ? resourceFilter : undefined,
        companyId: selectedCompanyId
    }),
    enabled: !!selectedCompanyId,
  });

  const events = useMemo(() => {
    return appointments?.map((appt: any) => ({
        id: appt.id,
        // Título Limpo (Apenas Nome)
        title: `${appt.guestName || appt.customer?.firstName || 'Cliente'}`,
        serviceName: appt.profile?.name, 
        start: new Date(appt.startTime),
        end: new Date(appt.endTime),
        resource: appt, 
        status: appt.status
    })) || [];
  }, [appointments]);

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#3b82f6';
    if (event.status === 'CANCELED') backgroundColor = '#ef4444';
    if (event.status === 'COMPLETED') backgroundColor = '#10b981';
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.85em',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        padding: '2px 4px' // Pequeno padding interno para o texto não colar
      }
    };
  };

  const formats = {
    timeGutterFormat: (date: Date, culture: any, localizer: any) => localizer.format(date, 'HH:mm', culture),
    eventTimeRangeFormat: ({ start, end }: any, culture: any, localizer: any) => `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <style>{`
        .rbc-time-content { overflow-y: auto !important; scrollbar-width: thin; }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendário de Agendamentos</h1>
            <p className="text-gray-500">Visão geral e gestão de horários.</p>
        </div>
        
        <div className="flex gap-2">
            {user?.role === UserRole.PLATFORM_ADMIN && (
                <div className="w-64">
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="bg-white">
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

            {selectedCompanyId && (
                <div className="w-64">
                    <Select value={resourceFilter} onValueChange={setResourceFilter}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Todos os Recursos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos os Recursos</SelectItem>
                            {resources?.map((r: any) => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
      </div>

      {!selectedCompanyId && user?.role === UserRole.PLATFORM_ADMIN && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg bg-gray-50 text-gray-400">
              <p>Selecione uma empresa para visualizar o calendário.</p>
          </div>
      )}

      {selectedCompanyId && (
        <Card className="flex-1 flex flex-col overflow-hidden shadow-md h-full">
            <CardContent className="flex-1 p-0 h-full">
                
                {/* 3. ENVOLVER O CALENDÁRIO NO CONTEXTO */}
                <CalendarViewContext.Provider value={view}>
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        
                        view={view}
                        onView={setView}
                        date={date}
                        onNavigate={setDate}
                        
                        culture='pt'
                        formats={formats}
                        
                        components={{
                            event: CustomEventComponent 
                        }}

                        views={{
                            month: true,
                            week: true,
                            day: true,
                            agenda: CustomAgendaView 
                        }}
                        
                        scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
                        
                        messages={{
                            next: "Próximo",
                            previous: "Anterior",
                            today: "Hoje",
                            month: "Mês",
                            week: "Semana",
                            day: "Dia",
                            agenda: "Lista",
                            date: "Data",
                            time: "Hora",
                            event: "Evento",
                            noEventsInRange: "Sem agendamentos."
                        }}
                        onSelectEvent={(event) => setSelectedEvent(event.resource)}
                        eventPropGetter={eventStyleGetter}
                    />
                </CalendarViewContext.Provider>

            </CardContent>
        </Card>
      )}

      {selectedEvent && (
        <RescheduleModal 
            appointment={selectedEvent} 
            onClose={() => setSelectedEvent(null)} 
        />
      )}
    </div>
  );
};

export default SchedulingCalendarPage;