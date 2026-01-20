// src/components/kiosk/TicketReceipt.tsx

import React, { forwardRef } from 'react';
import QRCode from 'react-qr-code';

interface TicketReceiptProps {
  companyName: string;
  companySlug: string;
  ticketId: string;
  ticketNumber: string;
  serviceName: string;
  issuedAt: Date;
  customerName?: string | null;
  customerReference?: string | null;
  estimatedWaitTime?: number; 
}

// Usamos React.forwardRef para que o 'react-to-print' possa aceder ao DOM do componente
export const TicketReceipt = forwardRef<HTMLDivElement, TicketReceiptProps>((props, ref) => {
  // O URL aponta para a nossa página mobile com o ID da senha para "claim" (reclamar)
  const mainHost = window.location.host.replace('kiosk.', '').replace('display.', '');
  const protocol = window.location.protocol;
  
  // O URL correto deve ser: http://geslogic.local:3001/q/aeac?ticketId=...
  const trackUrl = `${protocol}//${mainHost}/q/${props.companySlug}?ticketId=${props.ticketId}`;

  return (
    <div ref={ref} className="p-4 bg-white text-black" style={{ width: '300px', fontFamily: 'monospace', textAlign: 'center' }}>
      
      {/* Cabeçalho */}
      <h2 className="text-xl font-bold mb-2">{props.companyName}</h2>
      <p className="text-sm text-gray-600 mb-4">{props.issuedAt.toLocaleString('pt-PT')}</p>
      
      <hr className="border-dashed border-gray-400 my-4" />
      
      {/* A Senha */}
      <div className="my-6">
        <p className="text-lg font-semibold">A sua senha:</p>
        <p className="text-6xl font-bold my-2" style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0.5rem 0', lineHeight: '1' }}>
          {props.ticketNumber}
        </p>
        <p className="text-lg">{props.serviceName}</p>
      </div>

      {/* Tempo de espera estimado */}
      {props.estimatedWaitTime !== undefined && (
          <p style={{ fontSize: '0.8rem', marginTop: '10px' }}>
              Tempo de espera estimado: ~{props.estimatedWaitTime} min
          </p>
      )}

      {/* --- QR CODE DE ACOMPANHAMENTO --- */}
      <div className="flex flex-col items-center my-4">
        <div className="p-2 border border-gray-200 rounded">
          <QRCode value={trackUrl} size={120} />
        </div>
        <p className="text-[10px] mt-2 italic text-gray-500">Leia para acompanhar a fila no seu telemóvel</p>
      </div>

      {/* --- DADOS DO UTENTE (Só aparece se existirem) --- */}
      {(props.customerName || props.customerReference) && (
        <>
          <hr className="border-dashed border-gray-400 my-4" />
          <div className="text-left px-2">
            {props.customerName && (
              <p className="text-sm">
                <span className="font-bold">Utente:</span><br/>
                {props.customerName}
              </p>
            )}
            {props.customerReference && (
              <p className="text-sm mt-1">
                <span className="font-bold">Ref:</span> {props.customerReference}
              </p>
            )}
          </div>
        </>
      )}

      <hr className="border-dashed border-gray-400 my-4" />
      
      {/* Rodapé */}
      <p className="text-xs mt-4">Por favor aguarde a sua vez.</p>
      <p className="text-xs">Obrigado pela preferência.</p>
    </div>
  );
});

TicketReceipt.displayName = 'TicketReceipt';