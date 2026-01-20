// frontend/src/pages/OperatorDashboard.tsx

import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  callNextTicket, 
  endOperatorSession, 
  updateTicketStatus, 
  transferTicket, 
  searchTickets, 
  recallTicket,
  fetchOperatorSessionStats 
} from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { Loader2, Search, Users, Clock, CheckCircle2, UserX, BarChart3, Timer, Smartphone, Printer } from 'lucide-react';
import { TicketStatus } from '../types/queue';
import { useDebounce } from '../hooks/useDebounce';
import { Input } from '../components/ui/Input';
import { useOperatorSession } from '../context/OperatorSessionContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- INTERFACES ---
interface TicketData {
  id: string;
  ticketNumber: string;
  status: TicketStatus;
  origin: 'KIOSK' | 'MOBILE' | 'MANUAL';
  service: { id: string; name: string; };
}

interface HourlyData {
  hour: number;
  count: number;
}

interface OperatorStats {
  summary: {
    totalServed: number;
    absentCount: number;
    avgServiceTime: number;
    sessionDurationMinutes: number;
  };
  queue: {
    waitingCount: number;
    oldestWaitMinutes: number;
  };
  hourlyDistribution: HourlyData[];
}

const MiniStatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{title}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const OperatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessionId, sessionDetails, currentTicket, setCurrentTicket, endSession: endSessionContext, isLoadingSession } = useOperatorSession();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetServiceId, setTransferTargetServiceId] = useState<string>('');
  const [keepPriority, setKeepPriority] = useState(true);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: stats } = useQuery<OperatorStats>({
    queryKey: ['operatorStats', sessionId],
    queryFn: () => fetchOperatorSessionStats(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 30000,
  });

  const { mutate: callNext, isPending: isCalling, error: callError } = useMutation({
    mutationFn: () => callNextTicket(sessionId!),
    onSuccess: (data) => { if ('ticketNumber' in data) setCurrentTicket(data); else alert(data.message); },
  });

  const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: (newStatus: TicketStatus) => updateTicketStatus({ ticketId: currentTicket!.id, status: newStatus }),
    onSuccess: (updatedTicket) => {
      if (updatedTicket.status === TicketStatus.COMPLETED || updatedTicket.status === TicketStatus.ABSENT) setCurrentTicket(null);
      else setCurrentTicket(updatedTicket);
    },
  });
  
  const { mutate: endSession } = useMutation({
    mutationFn: () => endOperatorSession(sessionId!),
    onSuccess: () => { endSessionContext(); navigate('/operator/setup'); },
  });

  const { mutate: transfer, isPending: isTransferring } = useMutation({
    mutationFn: transferTicket,
    onSuccess: () => { setCurrentTicket(null); setIsTransferModalOpen(false); }
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery<TicketData[]>({
    queryKey: ['ticketSearch', debouncedSearchQuery],
    queryFn: () => searchTickets(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length > 0 && isRecallModalOpen,
  });

  const { mutate: recall, isPending: isRecalling } = useMutation({
    mutationFn: recallTicket,
    onSuccess: (recalledTicket) => { setCurrentTicket(recalledTicket); setIsRecallModalOpen(false); setSearchQuery(''); },
  });

  const handleTransferClick = () => {
    if (!currentTicket || !transferTargetServiceId) return;
    transfer({ ticketId: currentTicket.id, newServiceId: transferTargetServiceId, keepPriority });
  };

  const servicesForTransfer = useMemo(() => {
    if (!sessionDetails?.counter?.services || !currentTicket) return [];
    return sessionDetails.counter.services.filter((s: any) => s.id !== currentTicket.service.id);
  }, [sessionDetails, currentTicket]);

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}m`;
  };

  if (!user || ![UserRole.OPERATOR, UserRole.COMPANY_ADMIN, UserRole.PLATFORM_ADMIN].includes(user.role)) return <Navigate to="/dashboard" />;
  if (isLoadingSession) return <div className="p-6 text-center"><Loader2 className="animate-spin h-12 w-12 mx-auto" /></div>;
  if (!sessionId) return <Navigate to="/operator/setup" replace />;

  // Lógica de restrição (CORRIGIDA)
  const isHandlingTicket = !!currentTicket;

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
      
      {/* GRID PRINCIPAL: items-stretch garante alturas iguais no desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* COLUNA ESQUERDA: OPERAÇÃO */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="shadow-md border-t-4 border-t-indigo-600 flex flex-col flex-grow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">Atendimento em Curso</CardTitle>
                <CardDescription>
                  Posto: <span className="text-gray-900 font-semibold">{sessionDetails?.station.name}</span> | 
                  Balcão: <span className="text-gray-900 font-semibold">{sessionDetails?.counter.name}</span>
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Sessão</p>
                <p className="font-mono text-indigo-600 font-bold">{stats?.summary.sessionDurationMinutes || 0}m ativos</p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-8 py-6 flex-grow flex flex-col justify-center">
              <div className={`relative p-8 border-2 rounded-2xl text-center transition-all ${isHandlingTicket ? 'bg-indigo-50/30 border-indigo-200' : 'bg-gray-50 border-dashed border-gray-200'}`}>
                {isHandlingTicket ? (
                  <>
                    <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                      {currentTicket.service.name}
                    </div>

    <div className="absolute top-4 right-4 flex items-center gap-2">
      {currentTicket.origin === 'MOBILE' ? (
        <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">
          <Smartphone className="w-3 h-3" /> MOBILE
        </div>
      ) : (
        <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold">
          <Printer className="w-3 h-3" /> FÍSICA
        </div>
      )}
    </div>

                    <p className="text-muted-foreground text-xs uppercase tracking-widest">Senha Ativa</p>
                    <p className="text-8xl lg:text-[9rem] leading-none font-black text-indigo-700 my-4">
                      {currentTicket.ticketNumber}
                    </p>
                    <div className="flex justify-center">
                        <span className="text-sm font-bold text-indigo-600 bg-white px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm uppercase tracking-wide">
                            Estado: {currentTicket.status}
                        </span>
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-gray-300">
                    <Users className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-xl font-medium">Aguardando chamada...</p>
                  </div>
                )}
              </div>

              <Button 
                className="w-full h-20 text-3xl shadow-lg" 
                onClick={() => callNext()}
                disabled={isCalling || isHandlingTicket}
              >
                {isCalling ? <Loader2 className="animate-spin h-10 w-10" /> : 'Chamar Próxima'}
              </Button>
              {callError && <p className="text-red-500 text-center font-medium">{(callError as Error).message}</p>}
            </CardContent>

            <CardFooter className="flex flex-wrap justify-center gap-2 border-t bg-gray-50/50 p-4">
                <Button variant="secondary" size="sm" onClick={() => updateStatus(TicketStatus.IN_SERVICE)} disabled={!currentTicket || currentTicket.status !== TicketStatus.CALLED || isUpdatingStatus}><Timer className="w-4 h-4 mr-2" /> Iniciar</Button>
                <Button variant="secondary" size="sm" className="text-orange-700 border-orange-200" onClick={() => updateStatus(TicketStatus.ABSENT)} disabled={!currentTicket || currentTicket.status !== TicketStatus.CALLED || isUpdatingStatus}><UserX className="w-4 h-4 mr-2" /> Ausente</Button>
                <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(TicketStatus.COMPLETED)} disabled={!currentTicket || currentTicket.status !== TicketStatus.IN_SERVICE || isUpdatingStatus}><CheckCircle2 className="w-4 h-4 mr-2" /> Concluir</Button>
                <Button variant="outline" size="sm" onClick={() => setIsTransferModalOpen(true)} disabled={!currentTicket || (currentTicket.status !== TicketStatus.IN_SERVICE && currentTicket.status !== TicketStatus.CALLED)}>Transferir</Button>
            </CardFooter>
          </Card>

          {/* ACÇÕES DE RODAPÉ COM BLOQUEIO SE HOUVER TICKET ATIVO */}
          <div className="flex justify-between items-center gap-4 mt-6">
            <Button 
                variant="ghost" 
                className="text-gray-500 hover:text-indigo-600" 
                onClick={() => setIsRecallModalOpen(true)}
                disabled={isHandlingTicket} // RESTRIÇÃO AQUI
            >
                <Search className="mr-2 h-4 w-4" /> Histórico / Re-chamar
            </Button>
            <Button 
                variant="ghost" 
                className="text-red-400 hover:text-red-600 hover:bg-red-50" 
                onClick={() => endSession()}
                disabled={isHandlingTicket} // RESTRIÇÃO AQUI
            >
                Encerrar Dia de Trabalho
            </Button>
          </div>
        </div>

        {/* COLUNA DIREITA: ESTATÍSTICAS (Sincronizada em altura) */}
        <div className="flex flex-col gap-4">
          
          <div className="bg-indigo-700 text-white rounded-2xl p-5 shadow-xl flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <Users className="w-6 h-6 opacity-50" />
                <Badge className="bg-indigo-500">Tempo Real</Badge>
             </div>
             <div className="mt-4">
                <p className="text-[10px] font-bold uppercase opacity-80 tracking-wider">Em Espera</p>
                <p className="text-5xl font-black">{stats?.queue.waitingCount || 0}</p>
             </div>
             <p className="text-[11px] mt-4 opacity-70 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Maior espera: {stats?.queue.oldestWaitMinutes || 0} min
             </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <MiniStatCard title="Atendidos" value={stats?.summary.totalServed || 0} icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} color="bg-green-50" />
            <MiniStatCard title="Média" value={formatSeconds(stats?.summary.avgServiceTime || 0)} icon={<Clock className="w-4 h-4 text-blue-600" />} color="bg-blue-50" />
            <MiniStatCard title="Ausências" value={stats?.summary.absentCount || 0} icon={<UserX className="w-4 h-4 text-red-600" />} color="bg-red-50" />
          </div>

          {/* GRÁFICO MAIS PEQUENO PARA CABER MELHOR */}
          <Card className="shadow-sm flex-grow">
            <CardHeader className="p-4 pb-0">
                <CardTitle className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-2">
                    <BarChart3 className="w-3 h-3" /> Produtividade Horária
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="h-28 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.hourlyDistribution || []}>
                            <XAxis dataKey="hour" fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
                            <Tooltip 
                                contentStyle={{ fontSize: '10px', borderRadius: '4px' }}
                                cursor={{fill: '#f3f4f6'}} 
                                labelFormatter={(v) => `Hora: ${v}h`} 
                            />
                            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                                {(stats?.hourlyDistribution || []).map((entry: HourlyData, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.hour === new Date().getHours() ? '#4f46e5' : '#e2e8f0'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-none shadow-none mt-auto">
            <CardContent className="p-3">
                <p className="text-[9px] text-gray-400 uppercase font-bold mb-2">Serviços Ativos</p>
                <div className="flex flex-wrap gap-1">
                    {sessionDetails?.attendedServices.map((s: any) => (
                        <span key={s.id} className="text-[9px] bg-white border px-2 py-0.5 rounded text-gray-600 font-medium">
                            {s.name}
                        </span>
                    ))}
                </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* MODAL TRANSFERÊNCIA */}
      {isTransferModalOpen && currentTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader><CardTitle>Transferir Senha: {currentTicket.ticketNumber}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full gap-1.5">
                <Label>Transferir Para:</Label>
                <Select onValueChange={setTransferTargetServiceId} value={transferTargetServiceId}>
                  <SelectTrigger><SelectValue placeholder="Selecione serviço..." /></SelectTrigger>
                  <SelectContent>{servicesForTransfer.map((service: any) => (<SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2"><Checkbox id="keepPriority" checked={keepPriority} onCheckedChange={(checked) => setKeepPriority(Boolean(checked))} /><Label htmlFor="keepPriority" className="text-sm">Manter Prioridade na nova fila</Label></div>
            </CardContent>
            <CardFooter className="justify-end space-x-2 border-t pt-4">
              <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleTransferClick} disabled={isTransferring || !transferTargetServiceId} className="bg-indigo-600">Confirmar</Button>
            </CardFooter>
          </Card>
        </div>
      )}
      
      {/* MODAL RE-CHAMAR */}
      {isRecallModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader><CardTitle>Re-chamar Senha</CardTitle><CardDescription>Pesquise uma senha do dia de hoje para re-atendimento.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Pesquisar número (ex: A005)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="text-lg py-6" />
              <div className="space-y-2 h-48 overflow-y-auto pr-2">
                {isSearching && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-600" /></div>}
                {searchResults.map((ticket: TicketData) => (
                  <div key={ticket.id} className="flex justify-between items-center p-3 border rounded-xl hover:bg-indigo-50 transition-colors group">
                    <div><p className="font-black text-indigo-900">{ticket.ticketNumber}</p><p className="text-[10px] text-gray-500 uppercase">{ticket.service.name}</p></div>
                    <Button size="sm" variant="outline" className="group-hover:bg-indigo-600 group-hover:text-white" onClick={() => recall(ticket.id)} disabled={isRecalling}>Re-chamar</Button>
                  </div>
                ))}
                {!isSearching && searchResults.length === 0 && searchQuery && <p className="text-center py-8 text-gray-400 text-sm">Nenhuma senha encontrada.</p>}
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t pt-4"><Button variant="outline" onClick={() => setIsRecallModalOpen(false)}>Fechar</Button></CardFooter>
          </Card>
        </div>
      )}      
    </div>
  );
};

const Badge: React.FC<{children: React.ReactNode, className?: string}> = ({children, className}) => (
    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${className}`}>{children}</span>
);

export default OperatorDashboard;