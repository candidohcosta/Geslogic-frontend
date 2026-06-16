// frontend/src/features/correspondence/components/WizardStepContent.tsx

import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Label } from '../../../components/ui/Label';
import { Button } from '../../../components/ui/Button';
import MultiFileUploadManagerV2 from '../../../components/ui/MultiFileUploadManagerV2';
import { FilePurpose } from '../../../types/file';
import { useInboxFiles } from '../hooks/useInboxFiles';

interface Props {
  registryId: string;
  data: {
    subject?: string;
    description?: string;
  };
  onChange: (data: Props['data']) => void;
  onBack: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

export default function WizardStepContent({
  registryId,
  data,
  onChange,
  onBack,
  onContinue,
  onCancel,
}: Props) {
  const { data: inboxFiles = [] } = useInboxFiles(registryId);

const isValid =
  (data.subject ?? '').trim().length > 0 &&
  (data.description ?? '').trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Assunto */}
      <div>
        <Label>Assunto <span className="text-red-500">*</span></Label>
        <Input
          value={data.subject ?? ''}
          onChange={(e) =>
            onChange({ ...data, subject: e.target.value })
          }
        />

        {!(data.subject ?? '').trim() && (
          <p className="text-sm text-red-600 mt-1">
            O assunto é obrigatório.
          </p>
        )}

      </div>

      {/* Conteúdo */}
      <div>
        <Label>Descrição <span className="text-red-500">*</span></Label>
        <Textarea
          rows={5}
          value={data.description ?? ''}
          onChange={(e) =>
            onChange({ ...data, description: e.target.value })
          }
        />

        {!(data.description ?? '').trim() && (
          <p className="text-sm text-red-600 mt-1">
            A descrição é obrigatória.
          </p>
        )}

      </div>

      {/* Upload */}
      <div>
        <Label>Anexos</Label>
        <MultiFileUploadManagerV2
          ownerType="CorrespondenceRegistry"
          ownerId={registryId}
          purpose={FilePurpose.CORRESPONDENCE_INBOX}
          existingFiles={inboxFiles.map((f: any) => ({
            id: f.id,
            url: f.url,
            displayName: f.displayName ?? f.originalName ?? 'Documento',
          }))}
          queryKeyToInvalidate={[
            'files',
            'CorrespondenceRegistry',
            registryId,
            FilePurpose.CORRESPONDENCE_INBOX,
          ]}
          showThumbnails
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">

  <Button variant="outline" onClick={onCancel}>
    Cancelar
  </Button>

        <Button variant="ghost" onClick={onBack}>
          Voltar
        </Button>

<Button onClick={onContinue} disabled={!isValid}>
  Continuar
</Button>

      </div>
    </div>
  );
}