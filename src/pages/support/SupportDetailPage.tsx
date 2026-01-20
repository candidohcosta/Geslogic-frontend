// frontend/src/pages/support/SupportDetailPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { 
  fetchSupportTicketById, 
  replyToSupportTicket, 
  updateSupportTicketStatus, 
  escalateSupportTicket, 
  uploadFile 
} from '../../services/api';
import { 
  SupportTicket, 
  SupportTicketStatus, 
  SupportTicketTargetLevel 
} from '../../types/support';
import { FilePurpose } from '../../types/file';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';
import { StatusBadge, PriorityBadge, getStatusLabel } from '../../lib/support-utils';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { 
  Send, Paperclip, CheckCircle2, AlertTriangle, Loader2,
  Monitor, Globe, Cpu, ArrowUpCircle, X, Download, Clock, ArrowLeft, History,
} from 'lucide-react';

const SupportDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  //const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Ref para o Socket
  const socketRef = useRef<Socket | null>(null);

  const [replyText, setReplyText] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 1. BUSCAR DADOS COM POLLING (ATUALIZAÇÃO AUTOMÁTICA)
  const { data: ticket, isLoading, error } = useQuery<SupportTicket>({
    queryKey: ['supportTicket', ticketId],
    queryFn: () => fetchSupportTicketById(ticketId!),
    enabled: !!ticketId,
  });

  // Função de Scroll Suave e Contido
  const scrollToBottom = (smooth = true) => {
    if (scrollViewportRef.current) {
      const { scrollHeight, clientHeight } = scrollViewportRef.current;
      // Define a posição do scroll para o máximo (fundo)
      scrollViewportRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  // Scroll inicial (sem animação para ser instantâneo)
  useEffect(() => {
    if (ticket?.messages) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [ticketId, isLoading]); // Apenas na carga inicial ou mudança de ID

  // Scroll quando chega nova mensagem (com animação)
  useEffect(() => {
    if (ticket?.messages?.length) {
       // Só faz scroll se o user já estiver perto do fundo ou se foi ele a enviar
       // (Para simplificar, fazemos sempre por agora, mas com a função certa já não salta a página)
       setTimeout(() => scrollToBottom(true), 100);
    }
  }, [ticket?.messages?.length]);

// 2. CONFIGURAR WEBSOCKET (ROBUSTO)
  useEffect(() => {
    if (!ticketId) return;

    // Conectar ao namespace /support
    const socket = io(`${process.env.REACT_APP_API_BASE_URL || ''}/support`, { 
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
    });

    // Só entramos na sala quando a conexão estiver GARANTIDA
    socket.on('connect', () => {
        console.log("Socket Connected:", socket.id);
        socket.emit('joinTicket', ticketId);
    });

    socket.on('connect_error', (err) => {
        console.warn("Socket Error:", err.message);
    });

    socket.on('newMessage', (newMessage: any) => {
      console.log("Mensagem recebida via Socket:", newMessage);
      queryClient.setQueryData(['supportTicket', ticketId], (oldData: SupportTicket | undefined) => {
        if (!oldData) return oldData;
        
        // Evitar duplicados
        if (oldData.messages?.some(m => m.id === newMessage.id)) return oldData;

        return {
          ...oldData,
          messages: [...(oldData.messages || []), newMessage]
        };
      });
      
      // Scroll suave
      //setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    socket.on('statusChange', (newStatus: string) => {
       queryClient.setQueryData(['supportTicket', ticketId], (oldData: SupportTicket | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, status: newStatus };
      });
      queryClient.invalidateQueries({ queryKey: ['supportTicket', ticketId] });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [ticketId, queryClient]);

  useEffect(() => {
    // Se o ticket deixou de estar fechado (ou seja, a caixa de texto apareceu),
    // vamos ao fundo para ver as últimas mensagens e o input.
    if (ticket && ticket.status !== SupportTicketStatus.CLOSED) {
        setTimeout(() => scrollToBottom(true), 200); // 200ms para dar tempo à caixa de texto de renderizar
    }
  }, [ticket?.status]); // <--- Dispara apenas quando o status muda

/*   // Scroll inteligente: Só faz scroll no load inicial ou se eu enviar msg
  useEffect(() => {
    if (ticket && !replyText) { // Se replyText tiver texto, o user está a escrever, não fazemos scroll forçado
       // Pequeno timeout para garantir que o DOM renderizou
       setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [ticket?.messages?.length]); // Só corre se o nº de mensagens mudar */

  // MUTAÇÕES
  const replyMutation = useMutation({
    mutationFn: (data: any) => replyToSupportTicket(ticketId!, data),
    onSuccess: () => {
      setReplyText('');
      setAttachments([]);
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ['supportTicket', ticketId] });
      // Scroll forçado após envio
      setTimeout(() => scrollToBottom(true), 100);      
    }
  });

  const statusMutation = useMutation({
    mutationFn: (status: SupportTicketStatus) => updateSupportTicketStatus(ticketId!, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supportTicket', ticketId] })
  });

  const escalateMutation = useMutation({
    mutationFn: () => escalateSupportTicket(ticketId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supportTicket', ticketId] })
  });

  // HANDLERS (Mantidos iguais)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const response = await uploadFile({
          file,
          ownerType: 'SupportMessage_Temp',
          ownerId: 'temp',
          purpose: FilePurpose.SUPPORT_ATTACHMENT
        });
        const uploaded = response.file;
        setAttachments(prev => [...prev, {
          fileId: uploaded.id,
          fileName: uploaded.displayName,
          fileUrl: uploaded.url,
          fileType: uploaded.mimeType
        }]);
      } catch (err) {
        alert('Erro no upload.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && attachments.length === 0) return;
    replyMutation.mutate({
      message: replyText,
      attachments,
      isInternalNote: isInternal
    });
  };

  if (isLoading) return <div className="p-8 text-center">A carregar detalhes...</div>;
  if (error || !ticket) return <div className="p-8 text-center text-red-500">Ticket não encontrado.</div>;

  const canManage = user?.role === UserRole.PLATFORM_ADMIN || 
                   (user?.role === UserRole.COMPANY_ADMIN && ticket.targetLevel === SupportTicketTargetLevel.COMPANY);

  const isCreator = user?.id === ticket.creator.id;

  // Lógica de "Quem tem a bola?"
  const showActionRequired = isCreator && ticket.status === SupportTicketStatus.WAITING_RESPONSE;

  return (
    <div className="container mx-auto p-4 max-w-6xl h-[calc(100vh-80px)] flex flex-col gap-4">

      {/* BOTÃO VOLTAR */}
      <div>
        <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-blue-600" onClick={() => navigate('/support')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar à lista de pedidos
        </Button>
      </div>

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-mono text-sm">#{ticket.sequentialId}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {ticket.targetLevel === 'PLATFORM' && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Plataforma</span>}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
          
          {/* AVISO DE AÇÃO NECESSÁRIA PARA O CLIENTE */}
          {showActionRequired && (
             <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                <Clock className="w-4 h-4" />
                <strong>Ação Necessária:</strong> A equipa de suporte aguarda a sua resposta.
             </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          
          {/* SELECTOR DE ESTADO (Apenas para quem gere) */}
          {canManage && ticket.status !== SupportTicketStatus.CLOSED && (
            <div className="w-[180px]">
                <Select 
                    onValueChange={(val) => statusMutation.mutate(val as SupportTicketStatus)} 
                    value={ticket.status}
                >
                    <SelectTrigger className="h-9">
                        <SelectValue placeholder="Alterar Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={SupportTicketStatus.OPEN}>Aberto</SelectItem>
                        <SelectItem value={SupportTicketStatus.IN_PROGRESS}>Em Análise</SelectItem>
                        <SelectItem value={SupportTicketStatus.WAITING_RESPONSE}>Aguarda Cliente</SelectItem>
                        <SelectItem value={SupportTicketStatus.RESOLVED}>Resolvido</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          )}

          {/* BOTÃO FECHAR */}
          {canManage && ticket.status !== SupportTicketStatus.CLOSED && (
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => statusMutation.mutate(SupportTicketStatus.CLOSED)}
                title="Fechar Definitivamente"
            >
                <CheckCircle2 className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Fechar</span>
            </Button>
          )}
          
          {/* REABRIR */}
          {ticket.status === SupportTicketStatus.CLOSED && (
             <Button variant="outline" size="sm" onClick={() => statusMutation.mutate(SupportTicketStatus.IN_PROGRESS)}>
                Reabrir Pedido
             </Button>
          )}

          {/* ESCALONAR */}
          {user?.role === UserRole.COMPANY_ADMIN && ticket.targetLevel === 'COMPANY' && ticket.status !== 'CLOSED' && (
            <Button 
                variant="secondary" 
                size="sm"
                className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200"
                onClick={() => {
                    if(window.confirm('Transferir para a Plataforma?')) escalateMutation.mutate();
                }}
            >
                <ArrowUpCircle className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Escalonar</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
        
        {/* COLUNA ESQUERDA: CHAT */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardContent ref={scrollViewportRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scroll-smooth">
            {ticket.messages?.map((msg) => {
              const isMe = msg.sender.id === user?.id;
              
              if (msg.isInternalNote && !canManage) return null; 

              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 shadow-sm border ${
                    msg.isInternalNote 
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-900' 
                        : isMe 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-800 border-gray-200' 
                  }`}>
                    
                    <div className={`flex justify-between items-center gap-4 text-xs mb-1 ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                        <span className="font-bold">
                            {msg.isInternalNote ? '🔒 NOTA INTERNA - ' : ''}
                            {msg.sender?.firstName} {msg.sender?.lastName}
                        </span>
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="whitespace-pre-wrap text-sm">{msg.message}</div>

                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {msg.attachments.map((att, idx) => (
                                <a 
                                    key={idx} 
                                    href={att.fileUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded text-xs transition-colors ${
                                        isMe ? 'bg-blue-500/50 hover:bg-blue-500' : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                >
                                    <Paperclip className="w-3 h-3" />
                                    <span className="truncate max-w-[200px]">{att.fileName}</span>
                                    <Download className="w-3 h-3 ml-auto opacity-50" />
                                </a>
                            ))}
                        </div>
                    )}
                  </div>
                </div>
              );
            })}
{/*             <div ref={messagesEndRef} /> */}
          </CardContent>

          {/* CAIXA DE RESPOSTA */}
          {ticket.status !== SupportTicketStatus.CLOSED && (
            <div className="p-4 bg-white border-t">
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded border">
                        {attachments.map((att, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border shadow-sm">
                                <span className="max-w-[100px] truncate">{att.fileName}</span>
                                <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:bg-red-50 rounded p-0.5"><X className="w-3 h-3"/></button>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSend} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                        <Textarea 
                            placeholder="Escreva uma resposta..." 
                            className="min-h-[80px] resize-none"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                        />
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <input type="file" id="chat-file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                <Button 
                                    type="button" variant="ghost" size="sm" disabled={isUploading}
                                    onClick={() => document.getElementById('chat-file')?.click()}
                                    className="text-gray-500 h-8"
                                >
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Paperclip className="w-4 h-4 mr-1"/>}
                                    Anexar
                                </Button>

                                {canManage && (
                                    <div className="flex items-center gap-2">
                                        <Checkbox id="internal" checked={isInternal} onCheckedChange={(c) => setIsInternal(c as boolean)} />
                                        <Label htmlFor="internal" className="text-xs text-gray-600 font-normal cursor-pointer">Nota Interna</Label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button type="submit" disabled={replyMutation.isPending || isUploading} className="h-[80px] w-24">
                        {replyMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                    </Button>
                </form>
            </div>
          )}
        </Card>

        {/* COLUNA DIREITA: INFO TÉCNICA (Mantém igual) */}
        <div className="w-full lg:w-80 space-y-4">
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Detalhes</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-3">
                    <div>
                        <span className="text-gray-500 block text-xs">Criado por</span>
                        <div className="font-medium">{ticket.creator.firstName} {ticket.creator.lastName}</div>
                        <div className="text-xs text-gray-400">{ticket.creator.email}</div>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs">Empresa</span>
                        <div className="font-medium">{ticket.company?.name || 'Plataforma'}</div>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs">Data</span>
                        <div>{new Date(ticket.createdAt).toLocaleString()}</div>
                    </div>
                </CardContent>
            </Card>

{/* NOVO CARTÃO: REPOSITÓRIO DE ANEXOS */}
            {ticket.messages?.some(m => m.attachments && m.attachments.length > 0) && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Paperclip className="w-4 h-4" /> Anexos da Conversa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        {ticket.messages?.flatMap(msg => 
                            (msg.attachments || []).map(att => ({ ...att, sender: msg.sender, date: msg.createdAt }))
                        ).map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors group">
                                <div className="flex flex-col overflow-hidden">
                                    <a href={file.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-600 truncate hover:underline" title={file.fileName}>
                                        {file.fileName}
                                    </a>
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(file.date).toLocaleDateString()} • {file.sender.firstName}
                                    </span>
                                </div>
                                <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600">
                                    <Download className="w-4 h-4" />
                                </a>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

{/* CARD: CAIXA NEGRA (Device Context Melhorado) */}
            {ticket.deviceContext && (
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-700">
                            <Monitor className="w-4 h-4" /> Contexto Técnico
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-3">
                        {/* Info Básica */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-slate-400 block">Browser</span>
                                <div className="font-mono">{ticket.deviceContext.browser}</div>
                            </div>
                            <div>
                                <span className="text-slate-400 block">OS</span>
                                <div className="font-mono">{ticket.deviceContext.os}</div>
                            </div>
                            <div>
                                <span className="text-slate-400 block">Ecrã</span>
                                <div className="font-mono">{ticket.deviceContext.screenResolution}</div>
                            </div>
                            <div>
                                <span className="text-slate-400 block">Janela (Viewport)</span>
                                <div className="font-mono">{ticket.deviceContext.viewport || '-'}</div>
                            </div>
                        </div>

                        {/* HISTÓRICO DE NAVEGAÇÃO (NOVO) */}
                        {ticket.deviceContext.history && ticket.deviceContext.history.length > 0 && (
                            <div className="pt-2 border-t border-slate-200 mt-2">
                                <div className="flex items-center gap-1 text-slate-500 mb-1 font-semibold">
                                    <History className="w-3 h-3" /> Rastro de Navegação:
                                </div>
                                <div className="bg-white rounded border border-slate-200 overflow-hidden">
                                    {ticket.deviceContext.history.map((path, idx) => (
                                        <div key={idx} className="px-2 py-1 text-[10px] font-mono border-b border-slate-100 last:border-0 truncate hover:bg-slate-50" title={path}>
                                            <span className="text-slate-300 mr-2">{idx + 1}.</span>
                                            <span className={path.includes('/support') ? 'text-slate-400' : 'text-blue-600 font-medium'}>
                                                {path}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* MANTÉM O CAMPO URL ANTIGO COMO FALLBACK SE O HISTORY FALHAR */}
                        {!ticket.deviceContext.history && ticket.deviceContext.url && (
                            <div className="pt-2 border-t border-slate-200 mt-2">
                                <span className="text-slate-400 block mb-1">Último URL:</span>
                                <a href={ticket.deviceContext.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                                    {ticket.deviceContext.url}
                                </a>
                            </div>
                        )}

                        {/* Erros Recentes (Ouro!) */}
                        {ticket.deviceContext.lastErrors && ticket.deviceContext.lastErrors.length > 0 && (
                            <div className="pt-2 border-t border-slate-200">
                                <div className="flex items-center gap-1 text-red-600 mb-1 font-bold">
                                    <AlertTriangle className="w-3 h-3" /> Erros Detetados:
                                </div>
                                <div className="bg-red-50 border border-red-100 rounded p-2 space-y-1 max-h-32 overflow-y-auto">
                                    {ticket.deviceContext.lastErrors.map((err, i) => (
                                        <div key={i} className="font-mono text-[10px] text-red-800 border-b border-red-100 last:border-0 pb-1 last:pb-0">
                                            {err}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>

      </div>
    </div>
  );
};

export default SupportDetailPage;