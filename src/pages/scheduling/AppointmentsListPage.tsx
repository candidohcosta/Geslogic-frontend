// frontend/src/pages/scheduling/AppointmentsListPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient  } from '@tanstack/react-query';
import { 
    fetchAppointments, 
    fetchSchedulingResources,
    fetchCompanies,
    cancelAppointmentAsAdmin 
} from '../../services/api';
import { SchedulingResource } from '../../types/scheduling';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user'; // <--- Importar Role
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { format, endOfDay, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, User, Building2, XCircle, CalendarClock  } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { RescheduleModal } from '../../components/scheduling/RescheduleModal';

const AppointmentsListPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient(); 
  
  // Estado da Empresa (Se for CompanyAdmin, já vem preenchido. Se for Platform, começa vazio)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(user?.company?.id || '');

  // Estado para controlar qual agendamento estamos a editar
  const [reschedulingAppt, setReschedulingAppt] = useState<any>(null);

  // Filtros
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [resourceFilter, setResourceFilter] = useState<string>('ALL');

  // 1. Buscar Empresas (Apenas para Platform Admin)
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // Efeito para selecionar a primeira empresa automaticamente (UX)
/*   useEffect(() => {
    if (user?.role === UserRole.PLATFORM_ADMIN && companies && companies.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(companies[0].id);
    }
  }, [companies, user, selectedCompanyId]); */

  // 2. Buscar Recursos (Depende da Empresa)
  const { data: resources } = useQuery<SchedulingResource[]>({
    queryKey: ['schedulingResources', selectedCompanyId],
    queryFn: () => fetchSchedulingResources(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  // 3. Buscar Agendamentos (Depende da Empresa)
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', dateFilter, resourceFilter, selectedCompanyId],
    queryFn: () => fetchAppointments({
        startDate: new Date(dateFilter).toISOString(),
        endDate: endOfDay(new Date(dateFilter)).toISOString(),
        resourceId: resourceFilter !== 'ALL' ? resourceFilter : undefined,
        companyId: selectedCompanyId // <--- Filtro crítico
    }),
    enabled: !!selectedCompanyId,
  });

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Agenda Diária</h1>
            <p className="text-gray-500">Gestão de marcações e presenças.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            
            {/* SELETOR DE EMPRESA (PLATFORM ADMIN) */}
            {user?.role === UserRole.PLATFORM_ADMIN && (
                <div className="w-full md:w-64">
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="h-10 bg-white">
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

            {/* FILTROS DE DATA E RECURSO (Só aparecem se houver empresa selecionada) */}
            {selectedCompanyId && (
                <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm h-10 items-center">
                    <div className="relative">
                        <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input 
                            type="date" 
                            value={dateFilter} 
                            onChange={(e) => setDateFilter(e.target.value)} 
                            className="w-40 pl-9 border-0 bg-transparent focus-visible:ring-0 h-8"
                        />
                    </div>
                    <div className="w-px bg-gray-200 h-6 mx-1"></div>
                    <div className="w-48">
                        <Select value={resourceFilter} onValueChange={setResourceFilter}>
                            <SelectTrigger className="border-0 bg-transparent focus:ring-0 h-8">
                                <SelectValue placeholder="Todos os Recursos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os Recursos</SelectItem>
                                {resources?.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
        </div>
      </div>

      {!selectedCompanyId && user?.role === UserRole.PLATFORM_ADMIN && (
          <div className="p-8 text-center border-2 border-dashed rounded-lg text-gray-400">
              Selecione uma empresa para visualizar a agenda.
          </div>
      )}

      {selectedCompanyId && (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hora</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Serviço</TableHead>
                            <TableHead>Recurso Atribuído</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8">A carregar agenda...</TableCell></TableRow>
                        ) : appointments?.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-500">Sem agendamentos para este dia.</TableCell></TableRow>
                        ) : (
                            appointments?.map((appt: any) => (
                                <TableRow key={appt.id}>
                                    <TableCell className="font-mono font-medium text-blue-700 text-base">
                                        {format(parseISO(appt.startTime), 'HH:mm')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <div className="font-medium flex items-center gap-2">
                                                {appt.customer ? <User className="w-3 h-3 text-blue-500" /> : null}
                                                {appt.guestName || `${appt.customer?.firstName} ${appt.customer?.lastName}`}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {appt.guestEmail || appt.customer?.email}
                                            </span>
                                            {appt.guestPhone && <span className="text-xs text-gray-400">{appt.guestPhone}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>{appt.profile?.name}</TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {appt.resources?.map((r: any) => r.name).join(', ')}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                            ${appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 
                                            appt.status === 'CANCELED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {appt.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {appt.status !== 'CANCELED' && appt.status !== 'COMPLETED' && (
                                            <div className="flex items-center justify-end space-x-1">
                                                <Button 
                                                    variant="ghost" size="icon" 
                                                    className="text-blue-500 hover:bg-blue-50"
                                                    onClick={() => setReschedulingAppt(appt)}
                                                    title="Reagendar"
                                                >
                                                    <CalendarClock className="w-4 h-4" />
                                                </Button>                                            
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={async () => {
                                                        if (window.confirm('Tem a certeza que deseja cancelar esta marcação?')) {
                                                            try {
                                                                // CORREÇÃO: Usar a função exportada
                                                                await cancelAppointmentAsAdmin(appt.id);
                                                                // Agora queryClient já existe e funciona
                                                                queryClient.invalidateQueries({ queryKey: ['appointments'] });
                                                            } catch (e) {
                                                                alert('Erro ao cancelar.');
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>                               
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}
    {reschedulingAppt && (
        <RescheduleModal 
            appointment={reschedulingAppt} 
            onClose={() => setReschedulingAppt(null)} 
        />
    )}
    </div>
  );
};

export default AppointmentsListPage;