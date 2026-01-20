// frontend/src/pages/KioskPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchKioskConfig, createTicket } from '../services/api';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Label } from '../components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../components/ui/Card';
import { Loader2, AlertTriangle, Printer, CalendarCheck } from 'lucide-react';
import { TicketReceipt } from '../components/kiosk/TicketReceipt';
import { KioskIdentificationModal } from '../components/kiosk/KioskIdentificationModal';
import { QzService } from '../utils/qz-service';
import { useDeviceHeartbeat } from '../hooks/useDeviceHeartbeat';
import { CheckInModal } from '../components/kiosk/CheckInModal';

// --- DECLARAÇÃO DE TIPOS GLOBAIS ---
// Para o TypeScript não reclamar do window.fully
declare global {
  interface Window {
    fully?: {
      printHtml: (html: string) => void;
    };
  }
}

// ... (Interfaces existentes mantêm-se iguais) ...
interface IdentificationField { id: string; label: string; type: string; }
interface KioskService { id: string; name: string; ticketPrefix: string; requiresIdentification?: boolean; identificationFields?: IdentificationField[]; }
interface KioskConfig { id: string; name: string; printerName?: string | null; printServerIp?: string | null; company: { name: string; slug: string; }; services: KioskService[]; uiConfig?: { primaryColor?: string; buttonTextColor?: string; cardBackgroundColor?: string; pageBackgroundColor?: string; }; logo?: { url: string; } | null; hasScheduling?: boolean;}
interface NewTicketData { id: string; ticketNumber: string; issuedAt: string; estimatedWaitTime?: number; service: { id: string; name: string; }; customUserData?: { fieldValues: Array<{ value: string; fieldDefinition: { isDisplayName: boolean; isIdentifier: boolean; fieldName: string; } }> } }
interface CreateTicketPayload { serviceId: string; customUserDataId?: string; }

const KioskPage: React.FC = () => {
  const [deviceSecret] = useState(() => localStorage.getItem('kioskDeviceSecret'));
  const [isPriority, setIsPriority] = useState(false);
  const [newTicket, setNewTicket] = useState<NewTicketData | null>(null);
  const [selectedServiceForId, setSelectedServiceForId] = useState<KioskService | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const [showCheckIn, setShowCheckIn] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);
  const savedSecret = deviceSecret || localStorage.getItem('kioskDeviceSecret');

  const { data: kioskConfig, isLoading, error } = useQuery<KioskConfig, Error>({
    queryKey: ['kioskConfig', savedSecret],
    queryFn: () => fetchKioskConfig(savedSecret!),
    enabled: !!savedSecret,
  });

  // Isto liga o "motor" de monitorização assim que tivermos o ID do quiosque
  useDeviceHeartbeat('KIOSK', kioskConfig?.id);

  const { mutate: createTicketMutate, isPending, error: ticketError, reset } = useMutation<NewTicketData, Error, CreateTicketPayload>({
    mutationFn: (payload) => createTicket({ 
      serviceId: payload.serviceId, 
      isPriority, 
      customUserDataId: payload.customUserDataId 
    }, savedSecret!),
    onSuccess: (data) => {
      setNewTicket(data);
      setSelectedServiceForId(null);
    },
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  // --- LÓGICA DE IMPRESSÃO HÍBRIDA ---
  const handlePrint = async () => {
    const node = receiptRef.current;
    if (!node) return;
    const htmlContent = node.innerHTML;

    // Cenário 1: Android Tablet (App Fully Kiosk)
    if (window.fully) {
        console.log("Imprimindo via Fully Kiosk...");
        // A app Fully Kiosk trata de enviar para a impressora configurada na App
        window.fully.printHtml(htmlContent);
        return; 
    }

    // Cenário 2: PC Windows/Linux (QZ Tray)
    const targetPrinter = kioskConfig?.printerName;
    const targetHost = kioskConfig?.printServerIp || 'localhost';

    if (targetPrinter) {
        try {
            setIsPrinting(true);
            await QzService.printHTML(targetPrinter, htmlContent, targetHost);
        } catch (err: any) {
            console.error(err);
            alert("Erro ao imprimir: " + err.message);
        } finally {
            setIsPrinting(false);
        }
    } 
    // Cenário 3: Fallback (Nenhum dos anteriores)
    else {
        const printWindow = window.open('', '_blank', 'width=300,height=400');
        if (printWindow) {
            printWindow.document.write(`<html><head><title>Senha</title><style>body{margin:0;font-family:monospace;text-align:center}h2{font-size:1.2rem;margin:0}hr{border:none;border-top:1px dashed black}p{margin:0.5rem 0}</style></head><body>${htmlContent}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    }
  };

  const handleServiceClick = (service: KioskService) => {
    reset();
    if (service.requiresIdentification && service.identificationFields && service.identificationFields.length > 0) {
      setSelectedServiceForId(service);
    } else {
      createTicketMutate({ serviceId: service.id });
    }
  };

  const handleIdentificationConfirmed = (customUserDataId: string) => {
    if (selectedServiceForId) {
      createTicketMutate({ 
        serviceId: selectedServiceForId.id, 
        customUserDataId 
      });
    }
  };

  const handleIdentificationCancelled = () => setSelectedServiceForId(null);

  // Função auxiliar para processar um ticket vindo do Check-in
  const handleCheckInSuccess = (result: any) => {
    // 1. Fechar o Modal
    setShowCheckIn(false);
    
    // 2. Verificar o tipo de resposta
    if (result.type === 'TICKET') {
        // CORREÇÃO: Extrair o objeto 'ticket' de dentro do resultado
        const realTicket = result.ticket; 
        
        // Guardar no estado para mostrar o recibo
        setNewTicket(realTicket);
        
        // (Opcional) Auto-imprimir após renderizar
        // setTimeout(() => handlePrint(), 500); 
    } else {
        // Se for apenas uma reunião (MEETING), mostra mensagem
        alert(result.message || "Chegada registada com sucesso.");
    }
  };

  const getCustomerDetails = (ticket: NewTicketData | null) => {
    if (!ticket?.customUserData?.fieldValues) return { name: null, ref: null };
    const values = ticket.customUserData.fieldValues;
    const nameField = values.find(v => v.fieldDefinition.isDisplayName);
    const refField = values.find(v => v.fieldDefinition.isIdentifier);
    return {
      name: nameField?.value || null,
      ref: refField ? `${refField.fieldDefinition.fieldName}: ${refField.value}` : null
    };
  };

  if (!savedSecret) return <div className="p-6 text-center text-red-500">Erro: Chave secreta em falta.</div>;
  if (isLoading) return <div className="p-6 text-center">A configurar quiosque...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Erro: {(error as Error).message}</div>;

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 transition-colors"
      style={{ backgroundColor: kioskConfig?.uiConfig?.pageBackgroundColor || '#f3f4f6' }}
    >
      {selectedServiceForId && (
        <KioskIdentificationModal
          serviceId={selectedServiceForId.id}
          serviceName={selectedServiceForId.name}
          fields={selectedServiceForId.identificationFields || []}
          deviceSecret={savedSecret}
          onConfirm={handleIdentificationConfirmed}
          onCancel={handleIdentificationCancelled}
          uiConfig={kioskConfig?.uiConfig}
        />
      )}

      {newTicket && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <Card 
            className="w-full max-w-2xl" 
            style={{ backgroundColor: kioskConfig?.uiConfig?.cardBackgroundColor || '#ffffff' }}
          >
            <div className="hidden">
              <TicketReceipt 
                ref={receiptRef}
                companyName={kioskConfig?.company.name || ''}
                companySlug={kioskConfig?.company.slug || ''}
                ticketId={newTicket.id}
                ticketNumber={newTicket.ticketNumber}
                serviceName={newTicket.service.name}
                issuedAt={new Date(newTicket.issuedAt)}
                estimatedWaitTime={newTicket.estimatedWaitTime} 
                customerName={getCustomerDetails(newTicket).name}
                customerReference={getCustomerDetails(newTicket).ref}
              />
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">A sua senha é:</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-8xl font-bold my-4">{newTicket.ticketNumber}</p>
              {getCustomerDetails(newTicket).name && (
                 <p className="text-xl text-gray-600 mt-2">Bem-vindo(a), {getCustomerDetails(newTicket).name}</p>
              )}
            </CardContent>
            <CardFooter className="flex-col space-y-2">
              <Button 
                size="lg" 
                className="w-full h-16 text-xl" 
                onClick={handlePrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                    <><Loader2 className="animate-spin mr-2" /> A Imprimir...</>
                ) : (
                    <><Printer className="mr-2" /> Imprimir Senha</>
                )}
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => { setNewTicket(null); reset(); }}>
                Fechar
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          {kioskConfig?.logo?.url && (
            <div className="mb-4">
              <img 
                src={kioskConfig.logo.url} 
                alt={`Logótipo de ${kioskConfig.company.name}`}
                className="mx-auto h-24 w-auto" 
              />
            </div>
          )}
          {!kioskConfig?.logo?.url && (
            <CardTitle className="text-3xl">{kioskConfig?.company.name}</CardTitle>
          )}
          <CardDescription className="text-lg">{kioskConfig?.name}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">

          {/* BOTÃO DE CHECK-IN (NOVO) */}
          {kioskConfig?.hasScheduling && (
            <div className="mb-6 pb-6 border-b border-gray-100">
                <button 
                    onClick={() => setShowCheckIn(true)}
                    className="w-full bg-white border-2 border-dashed border-blue-300 text-blue-700 p-4 rounded-xl shadow-sm hover:bg-blue-50 hover:border-blue-500 active:scale-95 transition-all flex items-center justify-center gap-4 group"
                >
                    <div className="bg-blue-100 p-2 rounded-full group-hover:bg-blue-200 transition-colors">
                        <CalendarCheck className="w-6 h-6 text-blue-700" />
                    </div>
                    <div className="text-left">
                        <div className="text-xl font-bold">Tenho Marcação</div>
                        <div className="text-sm opacity-80">Toque aqui para confirmar chegada</div>
                    </div>
                </button>
            </div>
          )}


          <div className="space-y-4">
            {kioskConfig?.services.map(service => (
              <Button
                key={service.id}
                onClick={() => handleServiceClick(service)}
                className="w-full h-20 text-2xl px-4 flex items-center justify-start gap-4" 
                disabled={isPending}
                style={{ 
                  backgroundColor: kioskConfig?.uiConfig?.primaryColor || '#4f46e5',
                  color: kioskConfig?.uiConfig?.buttonTextColor || '#ffffff'
                }}
              >
                {isPending ? (
                  <div className="w-full flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
                ) : (
                  <>
                    <div 
                      className="h-14 w-14 flex-shrink-0 flex items-center justify-center bg-white rounded-md"
                      style={{ color: kioskConfig?.uiConfig?.primaryColor || '#4f46e5' }}
                    >
                      <span className="text-3xl font-bold">{service.ticketPrefix}</span>
                    </div>
                    <span className="font-semibold text-left flex-grow">
                      {service.name}
                    </span>
                  </>
                )}
              </Button>              
            ))}
          </div>

          <div className="flex items-center justify-center space-x-2 pt-4 border-t">
            <Checkbox id="isPriority" checked={isPriority} onCheckedChange={(checked) => setIsPriority(Boolean(checked))} />
            <Label htmlFor="isPriority" className="text-lg">Atendimento Prioritário (Manual)</Label>
          </div>

          {ticketError && (
            <div className="flex items-center justify-center text-red-600 bg-red-100 p-3 rounded-md">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{(ticketError as Error).message}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center pt-4 border-t">
          <p className="text-xl font-semibold text-muted-foreground">
            {currentTime.toLocaleString('pt-PT')}
          </p>
        </CardFooter>
      </Card>

      {/* --- VERIFICA SE TENS ISTO AQUI EM BAIXO --- */}
      {showCheckIn && (
        <CheckInModal 
            deviceSecret={savedSecret!} 
            onClose={() => setShowCheckIn(false)}
            onSuccess={handleCheckInSuccess}
        />
      )}
      {/* ------------------------------------------- */}

    </div>
  );
};
export default KioskPage;