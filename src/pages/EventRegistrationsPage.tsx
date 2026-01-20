// frontend/src/pages/EventRegistrationsPage.tsx (VERSÃO FINAL COMPLETA)

import React, { useState, useMemo } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
  fetchEventRegistrations, 
  fetchEventById, 
  fetchRegistrationDetails, 
  updateRegistrationStatus, 
  sendCustomEmail 
} from '../services/api';
import { UserRole } from '../types/user';
import { RegistrationStatus } from '../types/event';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import { useDebounce } from '../hooks/useDebounce';
import { ClipboardList, Eye, Mail } from 'lucide-react';
import RichTextEditor from '../components/ui/RichTextEditor';
import { downloadEventExport } from '../services/api';
import { FileDown, Loader2, GraduationCap } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { CertificateDocument } from '../components/events/CertificateDocument';
import { getBase64Image } from '../lib/image-utils';

// --- INTERFACES DE DADOS ---
interface RegistrationDocument { 
  id: string; 
  name: string; 
  url: string; 
}

interface DetailFieldValue { 
  id: string; 
  value: string; 
  fieldDefinition: { fieldName: string; }; 
}

interface DetailDocument { 
  id: string; 
  documentName: string; 
  documentUrl: string; 
}

interface FullRegistrationDetails { 
  id: string; 
  registrationDate: Date; 
  status: RegistrationStatus; 
  finalCost: number | null; 
  participantDetails: { 
    phone: string | null; 
    user: { 
      firstName: string; 
      lastName: string; 
      email: string; 
    }; 
  }; 
  fieldValues: DetailFieldValue[]; 
  documents: DetailDocument[];
  // Poderíamos adicionar info do tier aqui também se necessário no detalhe
}

interface RegistrationDetails { 
  registrationId: string; 
  status: RegistrationStatus; 
  registrationDate: Date; 
  participantName: string; 
  participantEmail: string; 
  firstCustomFieldValue: string | null; 
  documents: RegistrationDocument[]; 
  participantDetailsId: string;
  // --- NOVOS CAMPOS QUE VÊM DO BACKEND ---
  tierName?: string;
  finalCost?: number;
}

interface RegistrationsApiResponse { 
  data: RegistrationDetails[]; 
  total: number; 
  page: number; 
  limit: number; 
}

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

  const [isExporting, setIsExporting] = useState(false);

  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchInput, 500);
  const queryFilters = useMemo(() => ({ 
    page, 
    status: filters.status, 
    searchQuery: debouncedSearch, 
    sortBy, 
    sortOrder 
  }), [page, filters, debouncedSearch, sortBy, sortOrder]);

  const { data: eventDetails } = useQuery({ 
    queryKey: ['event', eventId], 
    queryFn: () => fetchEventById(eventId!), 
    enabled: !!eventId 
  });
  
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

  const { mutate: sendEmailMutation, isPending: isSendingEmail, error: emailError } = useMutation({
    mutationFn: sendCustomEmail,
    onSuccess: () => {
      handleCloseEmailModal();
      alert("Email enviado com sucesso.");
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

  const handleEmailClick = (registration: RegistrationDetails) => setSelectedRegistrationForEmail(registration);
  
  const handleCloseEmailModal = () => {
    setSelectedRegistrationForEmail(null); 
    setEmailSubject(''); 
    setEmailBody(''); 
    setEmailCc('');
  };
  
  const handleSendEmail = () => {
    if (!selectedRegistrationForEmail || !emailSubject || !emailBody) return;
    sendEmailMutation({
      registrationId: selectedRegistrationForEmail.registrationId,
      emailData: { subject: emailSubject, body: emailBody, cc: emailCc || undefined },
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
        await downloadEventExport(eventId!);
    } catch (e) {
        alert("Erro ao exportar dados.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleDownloadCertificate = async (reg: RegistrationDetails) => {
      // 1. Validações
      if (!eventDetails?.certificateConfig?.enabled || !eventDetails.certificateConfig.backgroundUrl) {
          alert("Este evento não tem certificado configurado.");
          return;
      }

      setGeneratingPdfId(reg.registrationId);

      try {
          // 2. Preparar Imagem (Converter URL para Base64 para evitar CORS no PDF)
          const bgUrl = eventDetails.certificateConfig.backgroundUrl;
          const bgBase64 = await getBase64Image(bgUrl);

          // 3. Gerar PDF
          const blob = await pdf(
              <CertificateDocument 
                  participantName={reg.participantName}
                  config={eventDetails.certificateConfig}
                  backgroundBase64={bgBase64}
              />
          ).toBlob();

          // 4. Salvar
          saveAs(blob, `Certificado-${reg.participantName}.pdf`);

      } catch (error) {
          console.error(error);
          alert("Erro ao gerar certificado.");
      } finally {
          setGeneratingPdfId(null);
      }
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
          
          {isLoading && <p className="text-center py-4">A carregar inscrições...</p>}
          {error && <p className="text-red-500 text-center py-4">{(error as Error).message}</p>}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-1" colSpan={2}> 
                    <Input 
                      placeholder="Pesquisar por nome/email..." 
                      value={searchInput} 
                      onChange={(e) => setSearchInput(e.target.value)} 
                      className="text-xs h-8" 
                    />
                  </TableHead>
                  <TableHead className="p-1" colSpan={2}></TableHead>
                  <TableHead className="p-1">
                    <Select onValueChange={(value) => setFilters(f => ({...f, status: value === 'ALL' ? '' : value}))}>
                      <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Estado..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        {Object.values(RegistrationStatus).map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="p-1" colSpan={2}></TableHead>
                </TableRow>  
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('participantName')}>
                      Participante {sortBy === 'participantName' && (sortOrder === 'ASC' ? '▲' : '▼')}
                    </Button>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  
                  {/* NOVAS COLUNAS */}
                  <TableHead>Tarifa</TableHead>
                  <TableHead>Valor</TableHead>
                  {/* ------------- */}

                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('registrationDate')}>
                      Data {sortBy === 'registrationDate' && (sortOrder === 'ASC' ? '▲' : '▼')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('status')}>
                      Estado {sortBy === 'status' && (sortOrder === 'ASC' ? '▲' : '▼')}
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
                    
                    {/* DADOS DE PREÇO */}
                    <TableCell>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                            {reg.tierName || 'Base'}
                        </span>
                    </TableCell>
                    <TableCell>{reg.finalCost !== null && reg.finalCost !== undefined ? `${Number(reg.finalCost).toFixed(2)}€` : '-'}</TableCell>
                    {/* -------------- */}

                    <TableCell>{new Date(reg.registrationDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold 
                            ${reg.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                              reg.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {reg.status}
                        </span>
                    </TableCell>
                    <TableCell>{reg.documents.length > 0 ? `${reg.documents.length} anexo(s)` : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedRegistrationId(reg.registrationId)} title="Ver Detalhes"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleStatusChangeClick(reg)} title="Alterar Estado"><ClipboardList className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEmailClick(reg)} title="Enviar Email"><Mail className="h-4 w-4" /></Button>
                        {/* Só mostra se o evento tiver certificado ativo e a inscrição estiver COMPLETED ou APPROVED */}
                        {eventDetails?.certificateConfig?.enabled && 
                        (reg.status === 'APPROVED' || reg.status === 'COMPLETED') && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Descarregar Certificado"
                                onClick={() => handleDownloadCertificate(reg)}
                                disabled={generatingPdfId === reg.registrationId}
                            >
                                {generatingPdfId === reg.registrationId ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                ) : (
                                    <GraduationCap className="h-4 w-4 text-purple-600" />
                                )}
                            </Button>
                        )}                        
                        <Button variant="ghost" size="icon" onClick={handleExport} disabled={isExporting} className="ml-auto">
                          {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <FileDown className="w-4 h-4 mr-2"/>}
                          Exportar Excel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-between items-center pt-4">
            <span className="text-sm text-muted-foreground">Total: {registrationsData?.total || 0}</span>
            <div className="space-x-2">
              <Button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isLoading}>Ant.</Button>
              <Button onClick={() => setPage(p => p + 1)} disabled={!registrationsData || registrationsData.data.length < registrationsData.limit || isLoading}>Prox.</Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        </CardFooter>
      </Card>

      {/* Modal de Detalhes da Inscrição */}
      {selectedRegistrationId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRegistrationId(null)}>
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
             <CardHeader><CardTitle>Detalhes da Inscrição</CardTitle></CardHeader>
             <CardContent>
                {isLoadingDetails ? <p className="text-center py-4">A carregar detalhes...</p> : (
                  registrationDetails && (
                    <div className="space-y-6 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Participante</h4>
                            <p><span className="text-gray-500">Nome:</span> {registrationDetails.participantDetails.user.firstName} {registrationDetails.participantDetails.user.lastName}</p>
                            <p><span className="text-gray-500">Email:</span> {registrationDetails.participantDetails.user.email}</p>
                            <p><span className="text-gray-500">Telefone:</span> {registrationDetails.participantDetails.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Inscrição</h4>
                            <p><span className="text-gray-500">Data:</span> {new Date(registrationDetails.registrationDate).toLocaleString()}</p>
                            <p><span className="text-gray-500">Estado:</span> <span className="font-bold">{registrationDetails.status}</span></p>
                            <p><span className="text-gray-500">Valor a Pagar:</span> <span className="text-lg font-bold text-green-700">{registrationDetails.finalCost}€</span></p>
                        </div>
                      </div>

                      {registrationDetails.fieldValues?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Respostas ao Formulário</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {registrationDetails.fieldValues.map((fv) => (
                              <div key={fv.id} className="flex justify-between border-b border-gray-100 pb-1 last:border-0">
                                <span className="text-gray-500">{fv.fieldDefinition.fieldName}:</span>
                                <span className="font-medium">{fv.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {registrationDetails.documents?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Documentos Anexados</h4>
                          <div className="flex flex-col gap-2">
                            {registrationDetails.documents.map((doc) => (
                              <a 
                                key={doc.id} 
                                href={doc.documentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline flex items-center gap-2"
                              >
                                <ClipboardList className="w-4 h-4"/> {doc.documentName}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
             </CardContent>
             <CardFooter className="justify-end"><Button onClick={() => setSelectedRegistrationId(null)}>Fechar</Button></CardFooter>
          </Card>
        </div>
      )}
      
      {/* Modal de Alteração de Estado */}
      {selectedRegistrationForStatusChange && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleCloseStatusModal}>
            <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <CardHeader><CardTitle>Alterar Estado</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Alterar estado para <strong>{selectedRegistrationForStatusChange.participantName}</strong>.
                            Isto enviará um email automático de notificação.
                        </p>
                        <Select value={newStatus} onValueChange={(val) => setNewStatus(val as RegistrationStatus)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>{Object.values(RegistrationStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    <Button variant="outline" onClick={handleCloseStatusModal}>Cancelar</Button>
                    <Button onClick={handleConfirmStatusChange} disabled={isUpdatingStatus}>Guardar</Button>
                </CardFooter>
            </Card>
        </div>
      )}
      
      {/* Modal de Email */}
      {selectedRegistrationForEmail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleCloseEmailModal}>
            <Card className="w-full max-w-xl" onClick={e => e.stopPropagation()}>
                <CardHeader><CardTitle>Enviar Email</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>CC (Opcional)</Label>
                        <Input value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="outro@email.com" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Assunto</Label>
                        <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Mensagem</Label>
                        <div className="border rounded-md bg-white">
                            <RichTextEditor value={emailBody} onChange={setEmailBody} />
                        </div>
                    </div>
                    {emailError && <p className="text-red-500 text-sm">{(emailError as Error).message}</p>}
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    <Button variant="outline" onClick={handleCloseEmailModal}>Cancelar</Button>
                    <Button onClick={handleSendEmail} disabled={isSendingEmail}>Enviar</Button>
                </CardFooter>
            </Card>
        </div>
      )}
    </>
  );
};

export default EventRegistrationsPage;