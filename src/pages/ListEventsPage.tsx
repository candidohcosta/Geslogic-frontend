// frontend/src/pages/ListEventsPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { fetchEvents, deleteEvent, fetchCompanies, cloneEvent } from '../services/api';
import { UserData, UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Checkbox } from '../components/ui/Checkbox';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Eye, Users, FilePenLine, Trash2, Building2, Copy } from 'lucide-react';

export interface EventData {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  registrationStartDate: string;
  location: string;
  maxParticipants: number;
  isActive: boolean;
  bannerImageUrl?: string;
  baseCost: number;
  costType1?: number;
  costType2?: number;
  costType3?: number;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
}

const ListEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Estados locais (perfeitos como estavam)
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // NOVO: Estado para a pesquisa

  // --- ESTADO DA EMPRESA SELECIONADA (NOVO) ---
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(user?.company?.id || '');

  // 1. BUSCAR EMPRESAS (Só Platform Admin)
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // 2. BUSCAR EVENTOS (Depende da Empresa)
  const { data: events = [], isLoading, error } = useQuery<EventData[], Error>({
    queryKey: ['events', selectedCompanyId], // <--- Chave reativa
    queryFn: () => fetchEvents((selectedCompanyId === 'ALL' || !selectedCompanyId) ? undefined : selectedCompanyId),
    enabled: !!user,
  });

  const deleteEventMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      setSuccess(`Evento eliminado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      handleCloseDeleteModal();
    },
  });

  const { mutate: cloneMutation } = useMutation({
    mutationFn: cloneEvent,
    onSuccess: () => {
        setSuccess('Evento clonado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e: any) => alert(e.message)
  });

  if (!user) return <Navigate to="/login" />;

  // Função auxiliar para formatar Date para uma string legível
  const formatDateTimeDisplay = (isoString: string | Date | undefined): string => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Data Inválida';
    return date.toLocaleString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const handleClone = (eventId: string) => {
      if(window.confirm("Deseja duplicar este evento?")) {
          cloneMutation(eventId);
      }
  };

  // --- Funções para o Modal de Eliminação ---
  const handleDeleteClick = (event: EventData) => {
    setEventToDelete(event);
    setConfirmDelete(false); // Reset checkbox
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setEventToDelete(null);
    setConfirmDelete(false);
  };

  const handleConfirmDeleteEvent = () => {
    if (!eventToDelete || !confirmDelete) return;
    deleteEventMutation.mutate(eventToDelete.id);
  };

  // Lógica de filtragem (NOVO)
  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="p-6 text-center">A carregar eventos...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Erro: {error.message}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão de Eventos</CardTitle>
        <CardDescription>
          Visualize, edite e gira todos os eventos disponíveis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Input
            type="text"
            placeholder="Pesquisar eventos (nome, local, empresa)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />

          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
             {/* SELETOR DE EMPRESA (PLATFORM ADMIN) */}
             {user?.role === UserRole.PLATFORM_ADMIN && (
                <div className="w-full md:w-64">
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger>
                            <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                            <SelectValue placeholder="Todas as Empresas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas as Empresas</SelectItem>
                            {companies?.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {(
              user?.role === UserRole.COMPANY_ADMIN || 
              (user?.role === UserRole.PLATFORM_ADMIN && selectedCompanyId && selectedCompanyId !== 'ALL')
            ) && (
                <Button asChild className="w-full md:w-auto">
                    {/* Dica: Podemos passar o state da empresa selecionada para a página de criação se quisermos facilitar, 
                        mas o comportamento padrão já deve funcionar se o contexto estiver montado. */}
                    <Link 
                        to="/events/create" 
                        state={{ preselectedCompanyId: selectedCompanyId !== 'ALL' ? selectedCompanyId : undefined }}
                    >
                        Criar Novo Evento
                    </Link>
                </Button>
            )}

          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            <p>Nenhum evento encontrado.</p>
          </div>
        ) : (
          <div>
            {/* VISTA DE TABELA PARA DESKTOP */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    {/* Só mostra a coluna Empresa se estiver a ver TODAS */}
                    {user.role === UserRole.PLATFORM_ADMIN && (!selectedCompanyId || selectedCompanyId === 'ALL') && (
                        <TableHead>Empresa</TableHead>
                    )}
                    <TableHead>Data</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      {user.role === UserRole.PLATFORM_ADMIN && (!selectedCompanyId || selectedCompanyId === 'ALL') && (
                        <TableCell className="text-sm text-gray-600">{event.company.name}</TableCell>
                      )}
                      <TableCell>{formatDateTimeDisplay(event.startDate)}</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell>{event.isActive ? 'Ativo' : 'Inativo'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button variant="ghost" size="icon" asChild title="Pré-visualizar Formulário">
                            {/* <Link to={`/events/public/${event.id}`}><Eye className="h-4 w-4" /></Link> */}
                            <Link to={`/events/preview/${event.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                            <>
                              <Button variant="ghost" size="icon" asChild title="Gerir Inscrições">
                                <Link to={`/events/${event.id}/registrations`}><Users className="h-4 w-4" /></Link>
                              </Button>
                              <Button variant="ghost" size="icon" asChild title="Editar Evento">
                                <Link to={`/events/edit/${event.id}`}><FilePenLine className="h-4 w-4" /></Link>
                              </Button>
                              <Button variant="ghost" size="icon" title="Duplicar" onClick={() => handleClone(event.id)}>
                                <Copy className="w-4 h-4 text-amber-600" />
                              </Button>                              
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(event)} className="text-red-600 hover:text-red-700" title="Eliminar Evento">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* VISTA DE CARTÕES PARA MOBILE */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredEvents.map((event) => (
                <div key={event.id} className="rounded-lg border bg-card text-card-foreground p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">{event.name}</div>
                      <div className="text-sm text-muted-foreground">{event.company.name}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${event.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {event.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p>{event.location}</p>
                    <p>{formatDateTimeDisplay(event.startDate)}</p>
                  </div>
                  <div className="flex items-center justify-end space-x-2 border-t pt-3 mt-3">
                    <Button variant="ghost" size="sm" asChild title="Pré-visualizar Formulário">
                      {/* <Link to={`/events/public/${event.id}`}>Ver</Link> */}
                      <Link to={`/events/preview/${event.id}`}>Ver</Link>
                    </Button>
                    {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                      <>
                        <Button variant="ghost" size="sm" asChild title="Gerir Inscrições">
                          <Link to={`/events/${event.id}/registrations`}>Inscrições</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild title="Editar Evento">
                          <Link to={`/events/edit/${event.id}`}>Editar</Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(event)} className="text-red-600 hover:text-red-700" title="Eliminar Evento">
                          Apagar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Modal de Confirmação de Eliminação */}
      {showDeleteModal && eventToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Eliminação</h3>
            <p className="text-sm text-gray-700 mb-4">
              Tem certeza que deseja eliminar o evento "<span className="font-semibold">{eventToDelete.name}</span>"?
              Esta ação é irreversível e eliminará todos os dados associados a este evento, incluindo inscrições e campos personalizados.
            </p>
            <div className="flex items-center mb-4">
              <input
                id="confirmDeleteEvent"
                name="confirmDeleteEvent"
                type="checkbox"
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
              />
              <label htmlFor="confirmDeleteEvent" className="ml-2 block text-sm text-gray-900">
                Compreendo que esta ação é irreversível e desejo continuar.
              </label>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCloseDeleteModal}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteEvent}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  confirmDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                disabled={!confirmDelete || deleteEventMutation.isPending}
              >
                {deleteEventMutation.isPending ? 'A Eliminar...' : 'Eliminar'}
              </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ListEventsPage;
