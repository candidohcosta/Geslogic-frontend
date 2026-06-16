// frontend/src/features/correspondence/components/RegisterInboundStepContext.tsx

import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';

interface Props {
  channel: string;
  department: string;
  onChannelChange: (v: string) => void;
  onDepartmentChange: (v: string) => void;
  onContinue: () => void;
  onCancel: () => void;
}

export default function RegisterInboundStepContext({
  channel,
  department,
  onChannelChange,
  onDepartmentChange,
  onContinue,
  onCancel,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Canal de Entrada</Label>
        <Input
          value={channel}
          onChange={(e) => onChannelChange(e.target.value)}
          placeholder="MANUAL / POSTAL / EMAIL"
        />
      </div>

      <div>
        <Label>Departamento (opcional)</Label>
        <Input
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
          placeholder="Ex: Financeiro, RH, Jurídico"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onContinue}>
          Continuar
        </Button>
      </div>
    </div>
  );
}