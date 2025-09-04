// frontend/src/pages/EventRegistrationsPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { fetchEventRegistrations, fetchEventById, fetchRegistrationDetails, updateRegistrationStatus } from '../services/api';
import { UserRole } from '../types/user';
import { RegistrationStatus } from '../types/event';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import { useDebounce } from '../hooks/useDebounce';
import { ClipboardList, Eye, Mail } from 'lucide-react';
import { sendCustomEmail } from '../services/api'; 
import RichTextEditor from '../components/ui/RichTextEditor';

// --- INTERFACES DE DADOS ---
interface RegistrationDocument { id: string; name: string; url: string; }
interface DetailFieldValue { id: string; value: string; fieldDefinition: { fieldName: string; }; }
interface DetailDocument { id: string; documentName: string; documentUrl: string; }
interface FullRegistrationDetails { id: string; registrationDate: Date; status: RegistrationStatus; finalCost: number | null; participantDetails: { phone: string | null; user: { firstName: string; lastName: string; email: string; }; }; fieldValues: DetailFieldValue[]; documents: DetailDocument[]; }
interface RegistrationDetails { registrationId: string; status: RegistrationStatus; registrationDate: Date; participantName: string; participantEmail: string; firstCustomFieldValue: string | null; documents: RegistrationDocument[]; participantDetailsId: string; }
interface RegistrationsApiResponse { data: RegistrationDetails[]; total: number; page: number; limit: number; }

const EventRegistrationsPage: React.FC = () => {
  const navigate = useNavigate(); 
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<{ status: string }>({ status: '' });
  const [sortBy, setSortBy] = useState('registrationDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [selectedRegistrationForStatusChange, setSelectedRegistrationForStatusChange] = useState<RegistrationDetails | null>(null);
  const [newStatus, setNewStatus] = useState<RegistrationStatus | ''>('');

  const [selectedRegistrationForEmail, setSelectedRegistrationForEmail] = useState<RegistrationDetails | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailCc, setEmailCc] = useState('');

  const debouncedSearch = useDebounce(searchInput, 500);
  const queryFilters = useMemo(() => ({ page, status: filters.status, searchQuery: debouncedSearch, sortBy, sortOrder }), [page, filters, debouncedSearch, sortBy, sortOrder]);

  const { data: eventDetails } = useQuery({ queryKey: ['event', eventId], queryFn: () => fetchEventById(eventId!), enabled: !!eventId });
  
  const { data: registrationsData, isLoading, error } = useQuery<RegistrationsApiResponse, Error>({
    queryKey: ['eventRegistrations', eventId, queryFilters],
    queryFn: () => fetchEventRegistrations(eventId!, queryFilters),
    placeholderData: keepPreviousData,
    enabled: !!eventId,
  });
  
  const { data: registrationDetails, isLoading: isLoadingDetails } = useQuery<FullRegistrationDetails, Error>({
    queryKey: ['registrationDetails', selectedRegistrationId],
    queryFn: () => fetchRegistrationDetails(selectedRegistrationId!),
    enabled: !!selectedRegistrationId,
  });

  const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: updateRegistrationStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventRegistrations', eventId] });
      handleCloseStatusModal();
    },
  });

  const { mutate: sendEmailMutation, isPending: isSendingEmail, isSuccess: isEmailSent, error: emailError } = useMutation({
    mutationFn: sendCustomEmail,
    onSuccess: () => {
      // Fecha o modal após o sucesso
      handleCloseEmailModal();
      // (Opcional) Mostra uma notificação de sucesso "toast"
    },
  });

  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortOrder(current => (current === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(columnName);
      setSortOrder('DESC');
    }
  };
  const handleStatusChangeClick = (registration: RegistrationDetails) => {
    setSelectedRegistrationForStatusChange(registration);
    setNewStatus(registration.status);
  };
  const handleCloseStatusModal = () => setSelectedRegistrationForStatusChange(null);
  const handleConfirmStatusChange = () => {
    if (!selectedRegistrationForStatusChange || !newStatus) return;
    updateStatus({ registrationId: selectedRegistrationForStatusChange.registrationId, status: newStatus });
  };

  // Abre o modal
  const handleEmailClick = (registration: RegistrationDetails) => {
    setSelectedRegistrationForEmail(registration);
  };

  // Fecha o modal
  const handleCloseEmailModal = () => {
    setSelectedRegistrationForEmail(null);
    setEmailSubject('');
    setEmailBody('');
    setEmailCc('');
  };

  // Confirma o envio e chama a mutação
  const handleSendEmail = () => {
    if (!selectedRegistrationForEmail || !emailSubject || !emailBody) return;
    
    sendEmailMutation({
      registrationId: selectedRegistrationForEmail.registrationId,
      emailData: { subject: emailSubject, body: emailBody, cc: emailCc || undefined },
    });
  };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Inscrições</CardTitle>
          <CardDescription>Evento: {eventDetails?.name || 'A carregar...'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
{/*           <div className="flex flex-col md:flex-row gap-2">
            <Input placeholder="Pesquisar por nome/email..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full md:w-1/3"/>
            <Select onValueChange={(value) => setFilters(f => ({...f, status: value === 'ALL' ? '' : value}))}>
              <SelectTrigger className="w-full md:w-auto"><SelectValue placeholder="Filtrar por Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Estados</SelectItem>
                {Object.values(RegistrationStatus).map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div> */}
          
          {isLoading && <p className="text-center py-4">A carregar inscrições...</p>}
          {error && <p className="text-red-500 text-center py-4">{(error as Error).message}</p>}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-1" colSpan={2}> {/* Ocupa as 2 primeiras colunas */}
                    <Input
                      placeholder="Pesquisar por nome/email..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="text-xs h-8"
                    />
                  </TableHead>
                  <TableHead className="p-1">
                    {/* Vazio, para a coluna 'Data' */}
                  </TableHead>
                  <TableHead className="p-1">
                    <Select onValueChange={(value) => setFilters(f => ({...f, status: value === 'ALL' ? '' : value}))}>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Filtrar Estado..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        {Object.values(RegistrationStatus).map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="p-1" colSpan={2}>
                    {/* Vazio, para as colunas 'Ficheiros' e 'Ações' */}
                  </TableHead>
                </TableRow>  
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('participantName')}>
                      Participante
                      {sortBy === 'participantName' && (sortOrder === 'ASC' ? ' ▲' : ' ▼')}
                    </Button>
                  </TableHead>
                  <TableHead>Email</TableHead> {/* Não ordenável por agora */}
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('registrationDate')}>
                      Data Inscrição
                      {sortBy === 'registrationDate' && (sortOrder === 'ASC' ? ' ▲' : ' ▼')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('status')}>
                      Estado
                      {sortBy === 'status' && (sortOrder === 'ASC' ? ' ▲' : ' ▼')}
                    </Button>
                  </TableHead>
                  <TableHead>Ficheiros</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrationsData?.data.map((reg: RegistrationDetails) => (
                  <TableRow key={reg.registrationId} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{reg.participantName}</TableCell>
                    <TableCell>{reg.participantEmail}</TableCell>
                    <TableCell>{new Date(reg.registrationDate).toLocaleString()}</TableCell>
                    <TableCell>{reg.status}</TableCell>
                    <TableCell>{reg.documents.length > 0 ? `${reg.documents.length} ficheiro(s)` : 'Nenhum'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedRegistrationId(reg.registrationId)} title="Ver Detalhes">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleStatusChangeClick(reg)} title="Alterar Estado">
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEmailClick(reg)} title="Enviar Email">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-between items-center pt-4">
            <span className="text-sm text-muted-foreground">Total: {registrationsData?.total || 0} inscrições.</span>
            <div className="space-x-2">
              <Button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isLoading}>Anterior</Button>
              <Button onClick={() => setPage(p => p + 1)} disabled={!registrationsData || registrationsData.data.length < registrationsData.limit || isLoading}>Próxima</Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Voltar à Lista de Eventos
          </Button>
        </CardFooter>
      </Card>

      {/* Modal de Detalhes da Inscrição */}
      {selectedRegistrationId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRegistrationId(null)}>
          <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Detalhes da Inscrição</CardTitle>
              <CardDescription>De: {registrationDetails?.participantDetails?.user?.email || '...'}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDetails && <p>A carregar detalhes...</p>}
              {registrationDetails && (
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Participante</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <p className="text-muted-foreground">Nome:</p><p>{registrationDetails.participantDetails?.user?.firstName} {registrationDetails.participantDetails?.user?.lastName}</p>
                      <p className="text-muted-foreground">Email:</p><p>{registrationDetails.participantDetails?.user?.email}</p>
                      <p className="text-muted-foreground">Telemóvel:</p><p>{registrationDetails.participantDetails?.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Inscrição</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <p className="text-muted-foreground">Data:</p><p>{new Date(registrationDetails.registrationDate).toLocaleString()}</p>
                      <p className="text-muted-foreground">Estado:</p><p>{registrationDetails.status}</p>
                      <p className="text-muted-foreground">Custo Final:</p><p>{registrationDetails.finalCost ? `${Number(registrationDetails.finalCost).toFixed(2)}€` : 'N/D'}</p>
                    </div>
                  </div>
                  {registrationDetails.fieldValues?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Respostas ao Formulário</h4>
                      <div className="space-y-1">
                        {registrationDetails.fieldValues.map((fieldValue: DetailFieldValue) => (
                          <div key={fieldValue.id} className="grid grid-cols-2 gap-x-4">
                            <p className="text-muted-foreground">{fieldValue.fieldDefinition.fieldName}:</p>
                            <p>{fieldValue.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {registrationDetails.documents?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Documentos</h4>
                      <div className="space-y-1">
                        {registrationDetails.documents.map((doc: DetailDocument) => (
                          <div key={doc.id}>
                            <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{doc.documentName}</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="outline" onClick={() => setSelectedRegistrationId(null)}>Fechar</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Modal de Alteração de Estado */}
      {selectedRegistrationForStatusChange && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleCloseStatusModal}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Alterar Estado da Inscrição</CardTitle>
              <CardDescription>Para: {selectedRegistrationForStatusChange.participantName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status-select">Novo Estado</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as RegistrationStatus)}>
                  <SelectTrigger id="status-select"><SelectValue placeholder="Selecione um estado..." /></SelectTrigger>
                  <SelectContent>
                    {Object.values(RegistrationStatus).map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={handleCloseStatusModal}>Cancelar</Button>
              <Button onClick={handleConfirmStatusChange} disabled={isUpdatingStatus}>
                {isUpdatingStatus ? 'A Guardar...' : 'Confirmar Alteração'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
{/* Modal de Enviar Email Personalizado */}
{selectedRegistrationForEmail && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
      <CardHeader>
        <CardTitle>Enviar Email Personalizado</CardTitle>
        <CardDescription>
          Para: {selectedRegistrationForEmail.participantEmail}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="email-cc">CC (Opcional)</Label>
            <Input type="email" id="email-cc" value={emailCc} onChange={(e) => setEmailCc(e.target.value)} placeholder="outro@email.com" />
          </div>
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="email-subject">Assunto</Label>
          <Input id="email-subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
        </div>
  <div className="grid w-full items-center gap-1.5">
    <Label>Corpo do Email</Label>
    {/* Removemos o 'htmlFor' da Label porque o editor não é um input simples */}
    
    <div className="bg-white rounded-md border"> {/* Um contentor para o estilo */}
      <RichTextEditor
        value={emailBody}
        onChange={setEmailBody} // O onChange do react-quill já passa a string HTML
      />
    </div>
  </div>
        {emailError && <p className="text-red-500 text-sm">{(emailError as Error).message}</p>}
      </CardContent>
      <CardFooter className="justify-end space-x-2">
        <Button variant="outline" onClick={handleCloseEmailModal}>Cancelar</Button>
        <Button onClick={handleSendEmail} disabled={isSendingEmail}>
          {isSendingEmail ? 'A Enviar...' : 'Enviar Email'}
        </Button>
      </CardFooter>
    </Card>
  </div>
)}      
    </>
  );
};

export default EventRegistrationsPage;