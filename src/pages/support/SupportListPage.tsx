// frontend/src/pages/support/SupportListPage.tsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSupportTickets } from '../../services/api';
import { SupportTicket, SupportTicketStatus } from '../../types/support'; // <--- Importar tipos
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { StatusBadge, PriorityBadge } from '../../lib/support-utils';
import { Plus, MessageSquare, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '../../components/ui/Input';

// Hook para "debounce" da pesquisa (para não fazer pedidos a cada letra)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const SupportListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); 
  
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Aguarda 500ms depois de parar de escrever para atualizar a pesquisa
  const debouncedSearch = useDebounce(search, 500);

  // Busca os tickets (Server-Side Pagination & Search)
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['supportTickets', statusFilter, page, debouncedSearch], // Incluir search na chave
    queryFn: () => fetchSupportTickets({ 
      status: statusFilter !== 'ALL' ? (statusFilter as SupportTicketStatus) : undefined,
      page,
      search: debouncedSearch // Envia para o backend
    }),
  });

  const tickets = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, lastPage: 1 };

  // Socket para refresh automático
  useEffect(() => {
    if (!user) return;
    const socket = io(`${process.env.REACT_APP_API_BASE_URL || ''}/support`, { 
      path: '/socket.io', transports: ['websocket'], withCredentials: true,
    });
    socket.on('connect', () => socket.emit('joinList'));
    socket.on('refreshList', () => queryClient.invalidateQueries({ queryKey: ['supportTickets'] }));
    return () => { socket.emit('leaveList'); socket.disconnect(); };
  }, [user, queryClient]);

  if (isLoading) return <div className="p-8 text-center">A carregar pedidos de apoio...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Erro ao carregar tickets.</div>;

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Apoio</h1>
          <p className="text-gray-500">Gestão de pedidos de suporte.</p>
        </div>
        <Button onClick={() => navigate('/support/new')}>
          <Plus className="w-4 h-4 mr-2" /> Novo Pedido
        </Button>
      </div>

      {/* FILTROS */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Pesquisar por assunto ou ID..." 
              className="pl-9" 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} // Reset página ao pesquisar
            />
          </div>
          <div className="w-full md:w-48">
            <select 
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
                <option value="ALL">Todos os Estados</option>
                <option value={SupportTicketStatus.OPEN}>Abertos</option>
                <option value={SupportTicketStatus.IN_PROGRESS}>Em Análise</option>
                <option value={SupportTicketStatus.WAITING_RESPONSE}>Aguarda Resposta</option>
                <option value={SupportTicketStatus.RESOLVED}>Resolvidos</option>
                <option value={SupportTicketStatus.CLOSED}>Fechados</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* LISTA */}
      <Card>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Não existem pedidos correspondentes.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead className="hidden md:table-cell">Criado Por</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* CORREÇÃO: Tipagem explícita para evitar erro TS7006 */}
                {tickets.map((ticket: SupportTicket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/support/${ticket.id}`)}>
                    <TableCell className="font-mono text-gray-500">#{ticket.sequentialId}</TableCell>
                    <TableCell className="font-medium text-blue-700">
                        {ticket.subject}
                        {user?.role === UserRole.PLATFORM_ADMIN && ticket.targetLevel === 'PLATFORM' && (
                            <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Plataforma</span>
                        )}
                    </TableCell>
                    <TableCell><StatusBadge status={ticket.status} /></TableCell>
                    <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {ticket.creator.firstName} {ticket.creator.lastName}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Ver</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        
        {/* RODAPÉ PAGINAÇÃO */}
        <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-gray-500">
                Página {meta.page} de {meta.lastPage} ({meta.total} resultados)
            </div>
            <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= meta.lastPage}
                >
                    Próxima <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>        
      </Card>
    </div>
  );
};

export default SupportListPage;