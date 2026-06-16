// frontend/src/features/correspondence/pages/InboxDecisionPage.tsx

import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Label } from '../../../components/ui/Label';
import { Input } from '../../../components/ui/Input';
import { useState } from 'react';
import { apiFetch } from '../../../services/api';

export default function InboxDecisionPage() {
  const { registryId } = useParams();
  const navigate = useNavigate();

  const [documentType, setDocumentType] = useState('');
  const [metadata, setMetadata] = useState<Record<string, any>>({});

  const handleCreateCase = async () => {
    await apiFetch('/correspondence/inbox/resolve', {
      method: 'POST',
      body: JSON.stringify({
        registryId,
        documentType,
        metadata,
      }),
    });

    navigate('/correspondence/inbox');
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-2 gap-6">
      {/* Lado esquerdo: entrada */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Entrada</h2>
        {/* Aqui entra o RegistryViewer + Uploads V2 */}
        {/* reutilizas WizardStepContent em modo read/edit */}
      </div>

      {/* Lado direito: decisão */}
      <div className="border rounded p-4 space-y-4">
        <h2 className="text-lg font-semibold">Criar novo expediente</h2>

        <div>
          <Label>Tipo de Documento</Label>
          <Input
            value={documentType}
            onChange={e => setDocumentType(e.target.value)}
          />
        </div>

        {/* Metadata dinâmica */}
        {/* renderizada a partir do JSON do catálogo */}

        <Button onClick={handleCreateCase}>
          Criar expediente
        </Button>
      </div>
    </div>
  );
}