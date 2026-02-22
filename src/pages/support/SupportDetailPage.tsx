// frontend/src/pages/support/SupportDetailPage.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchSupportTicketById,
  replyToSupportTicket,
  updateSupportTicketStatus,
  escalateSupportTicket,
  uploadFile,
  markTicketRead,
  markSupportSeen,
} from '../../services/api';

import {
  SupportTicket,
  SupportTicketStatus,
  SupportTicketTargetLevel,
} from '../../types/support';
import { FilePurpose } from '../../types/file';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';

import { UtilityPageTemplate, UtilitySection } from '../../components/templates/UtilityPageTemplate';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import {
  Send, Paperclip, CheckCircle2, AlertTriangle, Loader2,
  Monitor, ArrowUpCircle, X, Download, Clock, ArrowLeft, History, LifeBuoy
} from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../../lib/support-utils';
import { createSupportChannel } from '../../lib/sockets/support';

type IncomingMessage = {
  id: string;
  message: string;
  createdAt: string;
  isInternalNote?: boolean;
  attachments?: Array<{ fileUrl: string; fileName: string }>;
  sender: { id: string; firstName?: string; lastName?: string; email?: string };
};

const CHAT_HEIGHT_CLASS = 'h-[520px]';

const SupportDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const [replyText, setReplyText] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Carregar ticket
  const { data: ticket, isLoading, error } = useQuery<SupportTicket>({
    queryKey: ['supportTicket', ticketId],
    queryFn: () => fetchSupportTicketById(ticketId!),
    enabled: !!ticketId,
  });

  const scrollToBottom = (smooth = true) => {
    const el = scrollViewportRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight } = el;
    el.scrollTo({
      top: scrollHeight - clientHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  const isNearBottom = () => {
    const el = scrollViewportRef.current;
    if (!el) return false;
    const threshold = 120;
    const { scrollTop, clientHeight, scrollHeight } = el;
    return scrollHeight - (scrollTop + clientHeight) < threshold;
  };

  useEffect(() => {
    if (ticket?.messages) {
      const t = setTimeout(() => scrollToBottom(false), 100);
      return () => clearTimeout(t);
    }
  }, [ticketId, isLoading]);

  useEffect(() => {
    if (ticket?.messages?.length) {
      const t = setTimeout(() => scrollToBottom(true), 100);
      return () => clearTimeout(t);
    }
  }, [ticket?.messages?.length]);

  // Marcar visto global e “lido” por ticket ao entrar
  useEffect(() => {
    const run = async () => {
      try { await markSupportSeen(); } catch {}
      if (ticketId) {
        try { await markTicketRead(ticketId); } catch {}
      }
    };
    run();
  }, [ticketId]);

  // Marcar como lido quando volta o foco à tab
  useEffect(() => {
    const onFocus = async () => {
      if (ticketId) {
        try { await markTicketRead(ticketId); } catch {}
        queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'supportTickets',
        });
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [ticketId, queryClient]);

  // Socket: namespace /support (apenas sala do ticket)
  useEffect(() => {
    if (!ticketId) return;

    const { socket: s, joinTicket, leaveTicket } = createSupportChannel();

    const onConnect = () => {
      joinTicket(ticketId);
    };
    const onConnectError = (err: unknown) => {
      console.warn('[SupportSocket] connect_error:', (err as any)?.message || err);
    };

    const onNewMessage = async (newMessage: IncomingMessage) => {
      // Atualizar cache do detalhe
      queryClient.setQueryData(['supportTicket', ticketId], (oldData: SupportTicket | undefined) => {
        if (!oldData) return oldData;
        if (oldData.messages?.some(m => m.id === newMessage.id)) return oldData;
        return { ...oldData, messages: [...(oldData.messages || []), newMessage] };
      });

      const isFromMe = newMessage?.sender?.id && user?.id && newMessage.sender.id === user.id;
      const tabVisible = typeof document !== 'undefined' && !document.hidden;

      if (!isFromMe && (isNearBottom() || tabVisible)) {
        try { await markTicketRead(ticketId); } catch {}
        queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'supportTickets',
        });
      }

      const t = setTimeout(() => scrollToBottom(true), 100);
      setTimeout(() => clearTimeout(t), 200);
    };

    const onStatusChange = (newStatus: string) => {
      queryClient.setQueryData(['supportTicket', ticketId], (oldData: SupportTicket | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, status: newStatus as SupportTicketStatus };
      });
      queryClient.invalidateQueries({ queryKey: ['supportTicket', ticketId] });
    };

    s.on('connect', onConnect);
    s.on('connect_error', onConnectError);
    s.on('newMessage', onNewMessage);
    s.on('statusChange', onStatusChange);

    return () => {
      try { leaveTicket(ticketId); } catch {}
      s.off('connect', onConnect);
      s.off('connect_error', onConnectError);
      s.off('newMessage', onNewMessage);
      s.off('statusChange', onStatusChange);
    };
  }, [ticketId, user?.id, queryClient]);

  // Mutations
  const replyMutation = useMutation({
    mutationFn: (data: any) => replyToSupportTicket(ticketId!, data),
    onSuccess: () => {
      setReplyText('');
      setAttachments([]);
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ['supportTicket', ticketId] });
      const t = setTimeout(() => scrollToBottom(true), 100);
      setTimeout(() => clearTimeout(t), 200);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: SupportTicketStatus) => updateSupportTicketStatus(ticketId!, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supportTicket', ticketId] }),
  });

  const escalateMutation = useMutation({
    mutationFn: () => escalateSupportTicket(ticketId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supportTicket', ticketId] }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const response = await uploadFile({
          file,
          ownerType: 'SupportMessage_Temp',
          ownerId: 'temp',
          purpose: FilePurpose.SUPPORT_ATTACHMENT,
        });
        const uploaded = response.file;
        setAttachments(prev => [...prev, {
          fileId: uploaded.id,
          fileName: uploaded.displayName,
          fileUrl: uploaded.url,
          fileType: uploaded.mimeType,
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
      isInternalNote: isInternal,
    });
  };

  const canManage = useMemo(
    () =>
      user?.role === UserRole.PLATFORM_ADMIN ||
      (user?.role === UserRole.COMPANY_ADMIN &&
        ticket?.targetLevel === SupportTicketTargetLevel.COMPANY),
    [user, ticket?.targetLevel],
  );

  const header = {
    icon: LifeBuoy,
    title: ticket
      ? (
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-gray-500 font-mono text-sm">#{ticket.sequentialId}</span>
          <span className="truncate">{ticket.subject}</span>
        </span>
      )
      : 'Pedido de Suporte',
    subtitle: ticket
      ? (
        <span className="flex items-center gap-2 text-sm">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {ticket.targetLevel === 'PLATFORM' && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Plataforma</span>
          )}
        </span>
      )
      : undefined,
    actions: ticket ? (
      <div className="flex items-center gap-2">
        {/* Selector de estado */}
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

        {/* Fechar / Reabrir */}
        {canManage && ticket.status !== SupportTicketStatus.CLOSED && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => statusMutation.mutate(SupportTicketStatus.CLOSED)}
            title="Fechar definitivamente"
          >
            <CheckCircle2 className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Fechar</span>
          </Button>
        )}
        {ticket.status === SupportTicketStatus.CLOSED && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => statusMutation.mutate(SupportTicketStatus.IN_PROGRESS)}
          >
            Reabrir
          </Button>
        )}

        {/* Escalonar */}
        {user?.role === UserRole.COMPANY_ADMIN &&
          ticket.targetLevel === 'COMPANY' &&
          ticket.status !== 'CLOSED' && (
            <Button
              variant="secondary"
              size="sm"
              className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200"
              onClick={() => {
                if (window.confirm('Transferir para a Plataforma?')) escalateMutation.mutate();
              }}
            >
              <ArrowUpCircle className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Escalonar</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Voltar
          </Button>
      </div>
    ) : undefined,
  };

  if (isLoading) {
    return (
      <UtilityPageTemplate header={header} accent={{ content: true }}>
        <div className="p-8 text-center">A carregar detalhes…</div>
      </UtilityPageTemplate>
    );
  }
  if (error || !ticket) {
    return (
      <UtilityPageTemplate header={header} accent={{ content: true }}>
        <div className="p-8 text-center text-red-500">Ticket não encontrado.</div>
        <div className="p-4">
          <Button variant="ghost" onClick={() => navigate('/support')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar à lista
          </Button>
        </div>
      </UtilityPageTemplate>
    );
  }

  const isCreator = user?.id === ticket.creator.id;
  const showActionRequired = isCreator && ticket.status === SupportTicketStatus.WAITING_RESPONSE;

  return (
    <UtilityPageTemplate header={header} accent={{ content: false }}>
      {/* Botão voltar */}
      <div className="mb-2">
        <Button
          variant="ghost"
          className="pl-0 hover:bg-transparent hover:text-blue-600"
          onClick={() => navigate('/support')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar à lista de pedidos
        </Button>
      </div>

      {/* Banner “Ação necessária” */}
      {showActionRequired && (
        <UtilitySection withAccent padded className="mb-3">
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Clock className="w-4 h-4" />
            <strong>Ação Necessária:</strong> A equipa de suporte aguarda a sua resposta.
          </div>
        </UtilitySection>
      )}

      {/* Layout 2 colunas */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Chat */}
        <UtilitySection withAccent className="flex-1">
          <div
            ref={scrollViewportRef}
            className={`overflow-y-auto rounded-lg bg-gray-50/50 p-4 space-y-4 ${CHAT_HEIGHT_CLASS}`}
          >
            {ticket.messages?.map((msg) => {
              const isMe = msg.sender.id === user?.id;
              const isInternal = (msg as any).isInternalNote;

              if (isInternal && !(user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.COMPANY_ADMIN)) {
                return null;
              }

              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg p-3 shadow-sm border ${
                      isInternal
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                        : isMe
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-800 border-gray-200'
                    }`}
                  >
                    <div
                      className={`flex justify-between items-center gap-4 text-xs mb-1 ${
                        isMe ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      <span className="font-bold">
                        {isInternal ? '🔒 NOTA INTERNA - ' : ''}
                        {msg.sender?.firstName} {msg.sender?.lastName}
                      </span>
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="whitespace-pre-wrap text-sm">{(msg as any).message}</div>

                    {(msg as any).attachments && (msg as any).attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(msg as any).attachments.map((att: any, idx: number) => (
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
          </div>

          {/* Caixa de resposta */}
          {ticket.status !== SupportTicketStatus.CLOSED && (
            <div className="pt-3">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded border">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border shadow-sm"
                    >
                      <span className="max-w-[100px] truncate">{att.fileName}</span>
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:bg-red-50 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSend} className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-gray-700">
                    <input
                      type="file"
                      id="chat-file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="chat-file"
                      className={`inline-flex items-center gap-2 text-gray-700 cursor-pointer select-none ${
                        isUploading ? 'pointer-events-none opacity-60' : ''
                      }`}
                      title="Anexar ficheiro"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span>Anexar</span>
                    </label>

                    {(user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.COMPANY_ADMIN) && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="internal"
                          checked={isInternal}
                          onCheckedChange={(c) => setIsInternal(c as boolean)}
                        />
                        <Label htmlFor="internal" className="text-sm font-normal cursor-pointer">
                          Nota Interna
                        </Label>
                      </div>
                    )}
                  </div>

                  <Textarea
                    placeholder="Escreva uma resposta..."
                    className="min-h-[120px] resize-none"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={replyMutation.isPending || isUploading}
                    className="h-[48px] px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
                    title="Enviar resposta"
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <path d="M4 12L20 4L12 20L11 13L4 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </UtilitySection>


        {/* Coluna direita */}
        <div className="w-full lg:w-80 space-y-4">
          <UtilitySection withAccent>
            <div className="text-sm space-y-3">
              <div>
                <span className="text-gray-500 block text-xs">Criado por</span>
                <div className="font-medium">
                  {ticket.creator.firstName} {ticket.creator.lastName}
                </div>
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
            </div>
          </UtilitySection>

          {ticket.messages?.some((m) => m.attachments && m.attachments.length > 0) && (
            <UtilitySection withAccent>
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <Paperclip className="w-4 h-4" /> Anexos da Conversa
                </div>
                {ticket.messages
                  ?.flatMap((msg) =>
                    (msg.attachments || []).map((att) => ({
                      ...att,
                      sender: msg.sender,
                      date: msg.createdAt,
                    })),
                  )
                  .map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex flex-col overflow-hidden">
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-blue-600 truncate hover:underline"
                          title={file.fileName}
                        >
                          {file.fileName}
                        </a>
                        <span className="text-[10px] text-gray-400">
                          {new Date(file.date).toLocaleDateString()} • {file.sender.firstName}
                        </span>
                      </div>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
              </div>
            </UtilitySection>
          )}

          {ticket.deviceContext && (
            <UtilitySection withAccent>
              <div className="text-sm space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Monitor className="w-4 h-4" /> Contexto Técnico
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Browser</span>
                    <div className="font-mono">{(ticket.deviceContext as any).browser}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block">OS</span>
                    <div className="font-mono">{(ticket.deviceContext as any).os}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Ecrã</span>
                    <div className="font-mono">{(ticket.deviceContext as any).screenResolution}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Janela</span>
                    <div className="font-mono">{(ticket.deviceContext as any).viewport || '-'}</div>
                  </div>
                </div>

                {(ticket.deviceContext as any).history &&
                  (ticket.deviceContext as any).history.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <div className="flex items-center gap-1 text-slate-500 mb-1 font-semibold">
                        <History className="w-3 h-3" /> Rastro de Navegação:
                      </div>
                      <div className="bg-white rounded border border-slate-200 overflow-hidden">
                        {(ticket.deviceContext as any).history.map((path: string, idx: number) => (
                          <div
                            key={idx}
                            className="px-2 py-1 text-[10px] font-mono border-b border-slate-100 last:border-0 truncate hover:bg-slate-50"
                            title={path}
                          >
                            <span className="text-slate-300 mr-2">{idx + 1}.</span>
                            <span
                              className={
                                path.includes('/support')
                                  ? 'text-slate-400'
                                  : 'text-blue-600 font-medium'
                              }
                            >
                              {path}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {!((ticket.deviceContext as any).history) &&
                  (ticket.deviceContext as any).url && (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <span className="text-slate-400 block mb-1">Último URL:</span>
                      <a
                        href={(ticket.deviceContext as any).url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {(ticket.deviceContext as any).url}
                      </a>
                    </div>
                  )}

                {(ticket.deviceContext as any).lastErrors &&
                  (ticket.deviceContext as any).lastErrors.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-1 text-red-600 mb-1 font-bold">
                        <AlertTriangle className="w-3 h-3" /> Erros Detetados:
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded p-2 space-y-1 max-h-32 overflow-y-auto">
                        {(ticket.deviceContext as any).lastErrors.map((err: string, i: number) => (
                          <div
                            key={i}
                            className="font-mono text-[10px] text-red-800 border-b border-red-100 last:border-0 pb-1 last:pb-0"
                          >
                            {err}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </UtilitySection>
          )}
        </div>
      </div>
    </UtilityPageTemplate>
  );
};

export default SupportDetailPage;