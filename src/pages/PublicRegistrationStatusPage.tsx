// frontend/src/pages/PublicRegistrationStatusPage.tsx
import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPublicRegistrationStatus, submitPublicPaymentProof, uploadFile, cancelPublicRegistration } from '../services/api';
import { FilePurpose } from '../types/file';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loader2, CheckCircle2, AlertCircle, Upload, FileText, Download, FileDown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import { EventTicketPDF } from '../components/events/EventTicketPDF';

const PublicRegistrationStatusPage: React.FC = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const queryClient = useQueryClient();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // 1. Buscar Dados da Inscrição
  const { data: registration, isLoading, error } = useQuery({
    queryKey: ['publicRegistration', registrationId, token],
    queryFn: () => fetchPublicRegistrationStatus(registrationId!, token!),
    enabled: !!registrationId && !!token,
  });

  // 2. Mutação para enviar comprovativo (Associa o ficheiro à inscrição)
  const proofMutation = useMutation({
    mutationFn: (fileId: string) => submitPublicPaymentProof(registrationId!, token!, fileId),
    onSuccess: () => {
      setUploadSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['publicRegistration'] });
      alert("Comprovativo enviado com sucesso!");
    },
    onError: (err: any) => alert('Erro ao enviar: ' + err.message)
  });

// 3. Mutação para Cancelar
  const cancelMutation = useMutation({
    mutationFn: () => cancelPublicRegistration(registrationId!, token!),
    onSuccess: () => {
      alert("Inscrição cancelada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ['publicRegistration'] });
    },
    onError: (err: any) => alert('Erro ao cancelar: ' + err.message)
  });  

  // Handler de Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        // 1. Fazer Upload do Ficheiro Físico
        const response = await uploadFile({
          file: file,
          ownerType: 'PaymentProof_Temp', // Temporário até associar
          ownerId: 'temp',
          purpose: FilePurpose.EVENT_DOCUMENT
        });

        // 2. Associar à Inscrição usando o método seguro
        proofMutation.mutate(response.id);

      } catch (err) {
        console.error(err);
        alert("Erro no upload. Certifique-se que o ficheiro é válido (PDF ou Imagem).");
      } finally {
        setIsUploading(false);
        e.target.value = ''; // Limpar input
      }
    }
  };

  // --- FUNÇÃO PARA GERAR E BAIXAR PDF ---
  const handleDownloadTicket = async () => {
    if (!registration) return;
    setIsGeneratingPdf(true);

    try {
      // 1. Gerar a imagem do QR Code em Base64
      const qrDataUrl = await QRCode.toDataURL(registration.id, {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
      });

      // 2. Gerar o Blob do PDF
      const blob = await pdf(
        <EventTicketPDF 
          event={registration.event}
          registration={registration}
          qrCodeDataUrl={qrDataUrl}
        />
      ).toBlob();

      // 3. Salvar ficheiro
      saveAs(blob, `Bilhete-${registration.event.name.replace(/\s+/g, '-')}.pdf`);

    } catch (error) {
      console.error("Erro ao gerar bilhete:", error);
      alert("Não foi possível gerar o bilhete PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  // -------------------------------------

  if (!token) return <div className="p-8 text-center text-red-500">Link inválido (Token em falta).</div>;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">A carregar detalhes...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">Inscrição não encontrada ou expirada.</div>;

  const statusColors: Record<string, string> = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'AWAITING_PAYMENT': 'bg-orange-100 text-orange-800',
    'APPROVED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-red-100 text-red-800',
    'CANCELLED': 'bg-gray-100 text-gray-800',
    'COMPLETED': 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center border-b bg-white rounded-t-xl pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
            {registration.participantDetails.user.firstName.charAt(0)}
          </div>
          <CardTitle className="text-2xl">{registration.event.name}</CardTitle>
          <CardDescription>
            {new Date(registration.event.startDate).toLocaleDateString('pt-PT')} • {registration.event.location}
          </CardDescription>
          
          <div className="mt-4">
             <span className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide ${statusColors[registration.status] || 'bg-gray-100'}`}>
                {registration.status.replace('_', ' ')}
             </span>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-8 bg-white">
          
          {/* RESUMO FINANCEIRO */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase font-semibold">Participante</p>
                <p className="font-medium text-gray-900">{registration.participantDetails.user.firstName} {registration.participantDetails.user.lastName}</p>
                <p className="text-sm text-gray-500">{registration.participantDetails.user.email}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase font-semibold">Valor a Pagar</p>
                <p className="text-2xl font-bold text-blue-700">{Number(registration.finalCost || 0).toFixed(2)}€</p>
                <p className="text-xs text-gray-500">{registration.selectedPricingTier?.name || 'Tarifa Base'}</p>
            </div>
          </div>

          {/* ÁREA DE PAGAMENTO (Apenas se estiver Aguardando Pagamento) */}
          {registration.status === 'AWAITING_PAYMENT' && (
            <div className="border-2 border-orange-100 bg-orange-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5"/> Pagamento Pendente
                </h3>
                
                {/* A. FATURA PARA DOWNLOAD */}
                {registration.invoiceFile && (
                    <div className="mb-6 pb-6 border-b border-orange-200">
                        <p className="text-sm text-orange-800 mb-2">A entidade emitiu um documento para pagamento:</p>
                        <a 
                            href={registration.invoiceFile.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-3 bg-white p-3 rounded border border-orange-200 hover:shadow-sm transition-all text-orange-900 font-medium"
                        >
                            <FileText className="w-5 h-5 text-orange-500" />
                            <span>Descarregar Fatura / Guia</span>
                            <Download className="w-4 h-4 ml-auto opacity-50" />
                        </a>
                    </div>
                )}

                {/* B. DADOS MULTIBANCO (Se existirem) */}
                {registration.paymentData?.entity && (
                     <div className="mb-6 pb-6 border-b border-orange-200 text-center">
                        <p className="text-sm text-orange-800 mb-2 font-bold">DADOS PAGAMENTO</p>
                        <div className="bg-white p-4 rounded border font-mono text-lg">
                            <p>Ent: {registration.paymentData.entity}</p>
                            <p>Ref: {registration.paymentData.reference}</p>
                            <p>Val: {registration.paymentData.amount}€</p>
                        </div>
                     </div>
                )}

                {/* C. UPLOAD COMPROVATIVO */}
                <div>
                    <p className="text-sm text-orange-800 mb-3 font-semibold">Já pagou? Envie o comprovativo:</p>
                    
                    {registration.paymentProofFile || uploadSuccess ? (
                        <div className="flex items-center gap-2 text-green-700 bg-green-100 p-3 rounded border border-green-200">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Comprovativo enviado e em análise.</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input 
                                type="file" 
                                id="proof-upload" 
                                className="hidden" 
                                accept="image/*,.pdf"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                            <Button 
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white border-none"
                                onClick={() => document.getElementById('proof-upload')?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                {isUploading ? 'A enviar...' : 'Carregar Comprovativo'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
          )}

          {/* BILHETE / APROVADO */}
          {registration.status === 'APPROVED' && (
             <div className="text-center p-8 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center">
                <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-900">Inscrição Confirmada!</h3>
                <p className="text-green-700 mt-2 mb-6">Apresente este código à entrada do evento.</p>
                
                {/* --- O QR CODE --- */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <QRCodeSVG 
                        value={registration.id} // O valor que o scanner vai ler (o UUID da inscrição)
                        size={180}
                        level={"H"} // Nível de correção de erro alto (bom para leitura rápida)
                        includeMargin={true}
                    />
                </div>
                {/* ----------------- */}

                <div className="mt-4">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">ID da Inscrição</p>
                    <p className="font-mono text-lg font-bold text-gray-700">{registration.id.substring(0, 8).toUpperCase()}</p>
                </div>

                {/* Botão de Download PDF */}
                <div className="mt-8 pt-6 border-t border-green-200 w-full">
                    <Button 
                        onClick={handleDownloadTicket} 
                        disabled={isGeneratingPdf}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isGeneratingPdf ? <Loader2 className="animate-spin mr-2"/> : <FileDown className="mr-2"/>}
                        Descarregar Bilhete (PDF)
                    </Button>
                </div>
             </div>
          )}

          {registration.status !== 'CANCELLED' && registration.status !== 'COMPLETED' && (
              <div className="mt-8 pt-6 border-t text-center">
                  <p className="text-xs text-gray-500 mb-2">Não pode comparecer?</p>
                  <Button 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                    onClick={() => {
                        if(window.confirm('Tem a certeza que deseja cancelar a sua inscrição?')) {
                             // Chamar API de cancelamento
                             // Podes fazer a mutation aqui mesmo ou redirecionar
                             cancelMutation.mutate();
                        }
                    }}
                  >
                    Cancelar Inscrição
                  </Button>
              </div>
          )}

        </CardContent>
        <CardFooter className="bg-gray-50 rounded-b-xl justify-center p-4">
             <p className="text-xs text-gray-400">GesLogic Eventos • Link Seguro</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PublicRegistrationStatusPage;