import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { toJpeg } from 'html-to-image';
import { Button } from '../ui/Button';
import { Download, Smartphone } from 'lucide-react';

interface KioskQRCodeProps {
  companySlug: string;
  kioskId?: string; // Opcional (para o QR Code Global)
  kioskName: string;
}

export const KioskQRCode: React.FC<KioskQRCodeProps> = ({ companySlug, kioskId, kioskName }) => {
  const qrRef = useRef<HTMLDivElement>(null);

  // O URL que o telemóvel vai abrir
  const baseUrl = window.location.origin;
  
  // URL: /q/slug?kioskId=...
  const qrUrl = kioskId 
    ? `${baseUrl}/q/${companySlug}?kioskId=${kioskId}`
    : `${baseUrl}/q/${companySlug}`; // URL Global

  const downloadQrCode = () => {
    if (qrRef.current === null) return;

    // --- CORREÇÃO AQUI ---
    // Adicionar as opções de compatibilidade (skipFonts)
    toJpeg(qrRef.current, { 
        quality: 0.95, 
        backgroundColor: 'white',
        skipFonts: true, // <--- A LINHA CRÍTICA QUE RESOLVE O ERRO
        cacheBust: true, // Garante que não usa imagens em cache
        pixelRatio: 2 // Aumenta a resolução para impressão de cartaz
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        // Usamos PNG em vez de JPG. O PNG é melhor para QR Codes (linhas rígidas)
        link.download = `qrcode-${kioskName.replace(/\s+/g, '-').toLowerCase()}.png`; 
        link.href = dataUrl;
        link.click();
      })
      .catch((error) => {
          console.error('Erro ao exportar QR Code:', error);
          alert('Erro ao exportar imagem. Verifique a consola.');
      });
};

  return (
    <div className="flex flex-col items-center p-6 border rounded-xl bg-gray-50 space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold mb-2">
        <Smartphone className="w-5 h-5" />
        <span>{kioskId ? 'Quiosque Específico' : 'Acesso Global'}</span>
      </div>
      
      {/* Área que será exportada */}
      <div ref={qrRef} className="p-8 bg-white border shadow-sm rounded-lg flex flex-col items-center">
        <QRCode value={qrUrl} size={180} />
        <p className="mt-4 text-sm font-bold text-gray-800">{kioskName}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Digital Ticket</p>
      </div>

      <div className="flex flex-col w-full gap-2">
        <p className="text-xs text-center text-gray-500 max-w-[200px]">
          URL: {qrUrl.substring(qrUrl.indexOf('/q/'))}
        </p>
        <Button variant="outline" size="sm" onClick={downloadQrCode} className="w-full">
          <Download className="w-4 h-4 mr-2" /> Exportar JPG
        </Button>
      </div>
    </div>
  );
};