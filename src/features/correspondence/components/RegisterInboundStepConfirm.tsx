// frontend/src/features/correspondence/components/RegisterInboundStepConfirm.tsx

import { Button } from '../../../components/ui/Button';

interface Props {
  channel: string;
  department: string;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export default function RegisterInboundStepConfirm({
  channel,
  department,
  isSubmitting,
  onBack,
  onConfirm,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded border p-4 bg-gray-50 space-y-2">
        <p><strong>Canal:</strong> {channel}</p>
        <p><strong>Departamento:</strong> {department || '—'}</p>
      </div>

      <p className="text-sm text-gray-600">
        Ao confirmar, esta entrada será registada na Inbox e ficará a aguardar decisão.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onConfirm} disabled={isSubmitting}>
          Registar Entrada
        </Button>
      </div>
    </div>
  );
}