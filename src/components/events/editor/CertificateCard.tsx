import * as React from 'react';
import { StandardCard } from '../../ui/StandardCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select';
import { Label } from '../../ui/Label';
import { CertificateDesigner } from '../CertificateDesigner';
import { CertificateSendingMode } from '../../../types/event';

export function CertificateCard({
  eventId,
  initialConfig,
  certificateSendingMode,
  setCertificateSendingMode,
  updatePartial, // chama updatePartial({ certificateConfig })
}: {
  eventId: string;
  initialConfig: any;
  certificateSendingMode: CertificateSendingMode;
  setCertificateSendingMode: (v: CertificateSendingMode) => void;
  updatePartial: (partial: any) => void;
}) {
  return (
    <StandardCard
      title="Certificado de Participação"
      description="Configure o design do diploma e a forma de envio."
    >
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
        <Label className="mb-2 block text-blue-900 font-semibold">Automatização de Envio</Label>
        <Select value={certificateSendingMode} onValueChange={(val) => setCertificateSendingMode(val as CertificateSendingMode)}>
          <SelectTrigger className="bg-white border-blue-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CertificateSendingMode.MANUAL}>Manual (Não enviar automaticamente)</SelectItem>
            <SelectItem value={CertificateSendingMode.AFTER_EVENT_END}>Após a conclusão do evento (Recomendado)</SelectItem>
            <SelectItem value={CertificateSendingMode.ON_CHECKIN}>Imediatamente após o Check-in (Entrada)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-blue-600 mt-2">
          Nota: Os certificados só são enviados a participantes com check-in validado ("Presente").
          {certificateSendingMode === CertificateSendingMode.AFTER_EVENT_END && " O envio será processado após a data de fim do evento."}
        </p>
      </div>

      <div className="mt-4">
        <CertificateDesigner
          eventId={eventId}
          initialConfig={initialConfig}
          onSave={(newConfig) => updatePartial({ certificateConfig: newConfig })}
        />
      </div>
    </StandardCard>
  );
}