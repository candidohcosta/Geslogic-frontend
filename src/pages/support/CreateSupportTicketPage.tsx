// frontend/src/pages/support/CreateSupportTicketPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createSupportTicket, uploadFile } from '../../services/api';
import { SupportTicketPriority } from '../../types/support';
import { FilePurpose } from '../../types/file';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import { useAuth } from '../../context/AuthContext';

import { UtilityPageTemplate, UtilitySection } from '../../components/templates/UtilityPageTemplate';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Checkbox } from '../../components/ui/Checkbox';
import { Textarea } from '../../components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';

import { Paperclip, X, Loader2, MonitorCheck, LifeBuoy, ArrowLeft } from 'lucide-react';
import { fileFromElectronPath } from '../../utils/electron-file';

const isElectron = typeof window !== 'undefined' && !!(window as any).electron;

type TempAttachment = {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
};

const CreateSupportTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const deviceContext = useDeviceContext(); // “Caixa negra” (diagnóstico técnico)
  const queryClient = useQueryClient();

  // Estado do formulário
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<SupportTicketPriority>(SupportTicketPriority.NORMAL);
  const [isPublic, setIsPublic] = useState(false);

  // Anexos temporários
  const [attachments, setAttachments] = useState<TempAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Criar ticket
  const { mutate: createTicket, isPending } = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () => {
      // Atualiza todas as variantes da lista
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'supportTickets',
      });
      navigate('/support');
    },
    onError: (error: Error) => {
      alert(`Erro ao criar pedido: ${error.message}`);
    },
  });

  // Upload de ficheiros
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const response = await uploadFile({
          file,
          ownerType: 'SupportTicket_Temp',
          ownerId: 'temp',
          purpose: FilePurpose.SUPPORT_ATTACHMENT,
        });

        const uploaded = response.file;
        setAttachments((prev) => [
          ...prev,
          {
            fileId: uploaded.id,
            fileName: uploaded.displayName,
            fileUrl: uploaded.url,
            fileType: uploaded.mimeType,
          },
        ]);
      } catch (error) {
        console.error('Erro no upload:', error);
        alert('Falha ao carregar ficheiro.');
      } finally {
        setIsUploading(false);
        // permite voltar a escolher o mesmo ficheiro
        e.target.value = '';
      }
    }
  };


  const handleElectronPick = async () => {
    if (!('electron' in window) || !window.electron?.openSupportFiles) return false;
    try {
      const paths = await window.electron.openSupportFiles();
      if (!paths || paths.length === 0) return true; // consumido (sem seleção)

      for (const p of paths) {
        const file = await fileFromElectronPath(p);
        if (!file) continue;
        // Reutiliza o teu fluxo de uploadFile (sem mexer no backend)
        const response = await uploadFile({
          file,
          ownerType: 'SupportTicket_Temp',
          ownerId: 'temp',
          purpose: FilePurpose.SUPPORT_ATTACHMENT,
        });
        const uploaded = response.file;
        setAttachments(prev => [
          ...prev,
          {
            fileId: uploaded.id,
            fileName: uploaded.displayName,
            fileUrl: uploaded.url,
            fileType: uploaded.mimeType,
          },
        ]);
      }
      return true;
    } catch {
      return false;
    }
  };


  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    createTicket({
      subject,
      message,
      priority,
      isPublicInCompany: isPublic,
      deviceContext, // envia diagnóstico técnico
      attachments,
    });
  };

  // Header do template
  const header = {
    icon: LifeBuoy,
    title: 'Novo Pedido de Apoio',
    subtitle:
      'Descreva o problema e, se possível, anexe evidências. Os dados técnicos são adicionados automaticamente.',
    actions: (
      <Button variant="ghost" onClick={() => navigate('/support')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>
    ),
  };

  return (
    <UtilityPageTemplate header={header} accent={{ content: true }}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ASSUNTO + PRIORIDADE */}
        <UtilitySection withAccent padded>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                placeholder="Ex.: Impressora de senhas não responde"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as SupportTicketPriority)}
                disabled={isPending}
              >
                <SelectTrigger id="priority" className="h-10">
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SupportTicketPriority.LOW}>Baixa</SelectItem>
                  <SelectItem value={SupportTicketPriority.NORMAL}>Normal</SelectItem>
                  <SelectItem value={SupportTicketPriority.HIGH}>Alta</SelectItem>
                  <SelectItem value={SupportTicketPriority.CRITICAL}>Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </UtilitySection>

        {/* DESCRIÇÃO */}
        <UtilitySection withAccent padded>
          <div className="space-y-2">
            <Label htmlFor="message">Descrição do Problema</Label>
            <Textarea
              id="message"
              className="min-h-[150px]"
              placeholder="Explique o que aconteceu, o que esperava e como reproduzir (passo a passo)…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
        </UtilitySection>

        {/* ANEXOS */}
        <UtilitySection withAccent padded>
          <div className="space-y-2">
            <Label>Anexos (Screenshots, Logs)</Label>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div
                    key={file.fileId}
                    className="flex items-center bg-gray-100 px-3 py-1 rounded-md text-xs border"
                  >
                    <span className="truncate max-w-[180px]" title={file.fileName}>
                      {file.fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="ml-2 text-gray-500 hover:text-red-500"
                      aria-label={`Remover ${file.fileName}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {/* Browser: input + label htmlFor  */}
              {!isElectron && (
                <>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isUploading || isPending}
                    // accept="image/*,application/pdf,text/plain"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`inline-flex items-center rounded-md border px-3 py-2 text-sm cursor-pointer ${
                      isUploading || isPending ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4 mr-2" />
                    )}
                    Adicionar Anexo
                  </label>
                </>
              )}

              {/* Electron: botão que chama apenas IPC (sem htmlFor) */}
              {isElectron && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading || isPending}
                  onClick={async () => {
                    // Nota: usamos o teu handleElectronPick aqui
                    const usedIPC = await handleElectronPick();
                    // se quiseres, podes tratar retorno; aqui basta.
                  }}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4 mr-2" />
                  )}
                  Adicionar Anexo
                </Button>
              )}
            </div>
          </div>
        </UtilitySection>

        {/* INFO TÉCNICA (CAIXA NEGRA) */}
        <UtilitySection withAccent padded>
          <div className="flex items-start gap-3 text-sm">
            <MonitorCheck className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-blue-900">
              <strong>Diagnóstico Automático:</strong>
              <p className="mt-1 opacity-90">
                Vamos anexar informações técnicas para acelerar a resolução:
              </p>
              <div className="mt-1 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                <span className="font-mono text-xs">
                  {deviceContext?.browser} em {deviceContext?.os} ({deviceContext?.screenResolution})
                </span>
              </div>
            </div>
          </div>
        </UtilitySection>

        {/* VISIBILIDADE */}
        <UtilitySection withAccent padded>
          <div className="flex items-center gap-2">
            <Checkbox
              id="public"
              checked={isPublic}
              onCheckedChange={(c) => setIsPublic(!!c)}
              disabled={isPending}
            />
            <Label htmlFor="public" className="font-normal cursor-pointer">
              Tornar público para a minha empresa (outros colegas podem ver e aprender)
            </Label>
          </div>
        </UtilitySection>

        {/* AÇÕES */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => navigate('/support')}
            disabled={isPending || isUploading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || isUploading}>
            {isPending ? 'A Enviar…' : 'Enviar Pedido'}
          </Button>
        </div>
      </form>
    </UtilityPageTemplate>
  );
};

export default CreateSupportTicketPage;