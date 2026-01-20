// frontend/src/pages/support/CreateSupportTicketPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupportTicket, uploadFile } from '../../services/api';
import { SupportTicketPriority } from '../../types/support';
import { FilePurpose } from '../../types/file';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Checkbox } from '../../components/ui/Checkbox';
import { Textarea } from '../../components/ui/Textarea'; // Precisas deste componente ou usa <textarea className... />
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select'; 
import { Paperclip, X, Loader2, Info, MonitorCheck } from 'lucide-react';

const CreateSupportTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const deviceContext = useDeviceContext(); // <--- A CAIXA NEGRA A TRABALHAR
  const queryClient = useQueryClient();

  // Estados do Formulário
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<SupportTicketPriority>(SupportTicketPriority.NORMAL);
  const [isPublic, setIsPublic] = useState(false);
  
  // Estado dos Anexos
  const [attachments, setAttachments] = useState<{ fileId: string, fileName: string, fileUrl: string, fileType: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Mutação para criar ticket
  const { mutate: createTicket, isPending } = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      navigate('/support');
    },
    onError: (error: Error) => {
      alert(`Erro ao criar pedido: ${error.message}`);
    }
  });

  // Handler de Upload de Ficheiros
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        // Faz o upload imediato
        const response = await uploadFile({
          file: file,
          ownerType: 'SupportTicket_Temp', 
          ownerId: 'temp', 
          purpose: FilePurpose.SUPPORT_ATTACHMENT 
        });

        // O Backend devolve o objeto do ficheiro dentro de 'response.file'
        // E as propriedades corretas são 'displayName', 'url', 'mimeType'
        const uploadedFile = response.file; 

        // Adiciona à lista visual
        setAttachments(prev => [...prev, {
          fileId: uploadedFile.id,
          fileName: uploadedFile.displayName, 
          fileUrl: uploadedFile.url,
          fileType: uploadedFile.mimeType
        }]);
      } catch (error) {
        console.error("Erro no upload:", error);
        alert("Falha ao carregar ficheiro.");
      } finally {
        setIsUploading(false);
        // Limpa o input para permitir carregar o mesmo ficheiro de novo se necessário
        e.target.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    createTicket({
      subject,
      message,
      priority,
      isPublicInCompany: isPublic,
      deviceContext: deviceContext, // <--- Envia os dados técnicos
      attachments: attachments
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl flex items-center justify-center min-h-[80vh]">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Novo Pedido de Apoio</CardTitle>
          <CardDescription>
            Descreva o problema detalhadamente. A nossa equipa técnica receberá os dados do seu ambiente automaticamente.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* ASSUNTO E PRIORIDADE */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="subject">Assunto</Label>
                    <Input 
                        id="subject" 
                        placeholder="Ex: Impressora de senhas não responde" 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <select
                        id="priority"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                    >
                        <option value={SupportTicketPriority.LOW}>Baixa</option>
                        <option value={SupportTicketPriority.NORMAL}>Normal</option>
                        <option value={SupportTicketPriority.HIGH}>Alta</option>
                        <option value={SupportTicketPriority.CRITICAL}>Crítica</option>
                    </select>
                </div>
            </div>

            {/* MENSAGEM */}
            <div className="space-y-2">
                <Label htmlFor="message">Descrição do Problema</Label>
                <textarea
                    id="message"
                    className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Descreva o que aconteceu, o que esperava que acontecesse e passos para reproduzir..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                />
            </div>

            {/* ANEXOS */}
            <div className="space-y-2">
                <Label>Anexos (Screenshots, Logs)</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((file, idx) => (
                        <div key={file.fileId} className="flex items-center bg-gray-100 px-3 py-1 rounded-md text-sm">
                            <span className="truncate max-w-[150px]">{file.fileName}</span>
                            <button 
                                type="button" 
                                onClick={() => removeAttachment(idx)}
                                className="ml-2 text-gray-500 hover:text-red-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                    />
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        disabled={isUploading}
                        onClick={() => document.getElementById('file-upload')?.click()}
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Paperclip className="w-4 h-4 mr-2"/>}
                        Adicionar Anexo
                    </Button>
                </div>
            </div>

            {/* INFO TÉCNICA (CAIXA NEGRA) */}
            <div className="rounded-md bg-blue-50 p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                    <MonitorCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                        <strong>Diagnóstico Automático:</strong>
                        <p className="mt-1 opacity-90">
                            Estamos a anexar informações técnicas para acelerar a resolução:
                            <br/>
                            <span className="font-mono text-xs bg-blue-100 px-1 rounded">
                                {deviceContext?.browser} em {deviceContext?.os} ({deviceContext?.screenResolution})
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* VISIBILIDADE (Apenas para empresas) */}
            <div className="flex items-center space-x-2">
                <Checkbox 
                    id="public" 
                    checked={isPublic}
                    onCheckedChange={(c) => setIsPublic(c as boolean)}
                />
                <Label htmlFor="public" className="font-normal cursor-pointer">
                    Tornar público para a minha empresa (outros colegas podem ver e aprender)
                </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => navigate('/support')}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isPending || isUploading}>
                    {isPending ? 'A Enviar...' : 'Enviar Pedido'}
                </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateSupportTicketPage;