// frontend/src/features/correspondence/components/forms/CreateOutboundForm.tsx

import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { CreateOutboundInput } from '../../types/outbound.types';

interface Props {
  onSubmit: (input: CreateOutboundInput) => void;
  loading: boolean;
}

export default function CreateOutboundForm({ onSubmit, loading }: Props) {
  const [channel, setChannel] = useState<string>('');
  const [department, setDepartment] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel) return;

    onSubmit({
      channel,
      department: department || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div>
        <label className="block font-medium mb-1">
          Canal de Saída
        </label>
        <select
          className="w-full border rounded px-2 py-1"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          required
        >
          <option value="">— Selecionar —</option>
          <option value="EMAIL">Email</option>
          <option value="POSTAL">Postal</option>
          <option value="MANUAL">Manual</option>
        </select>
      </div>

      <div>
        <label className="block font-medium mb-1">
          Departamento (opcional)
        </label>
        <input
          className="w-full border rounded px-2 py-1"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Ex.: Jurídico"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          Criar Saída
        </Button>
      </div>
    </form>
  );
}