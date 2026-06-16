// frontend/src/features/correspondence/pages/registerInboundPage.tsx

import { useParams, useNavigate } from 'react-router-dom';
import { UtilityPageTemplate, UtilitySection } from '../../../components/templates/UtilityPageTemplate';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import MultiFileUploadManager from '../../../components/ui/MultiFileUploadManager';
import { FilePurpose } from '../../../types/file';
import { useRegisterInboundWithUpload } from '../hooks/useRegisterInboundWithUpload';
import { useState } from 'react';

export default function RegisterInboundPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const mutation = useRegisterInboundWithUpload(caseId!);

  const [channel, setChannel] = useState('MANUAL');
  const [department, setDepartment] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = () => {
    const fd = new FormData();
    fd.append('channel', channel);
    if (department) fd.append('department', department);

    files.forEach(file => fd.append('files', file));

    mutation.mutate(fd, {
      onSuccess: () => navigate(`/correspondence/cases/${caseId}`),
    });
  };

  return (
    <UtilityPageTemplate
      header={{
        title: 'Registar Entrada Manual',
      }}
      accent={{ content: true }}
    >
      <UtilitySection className="space-y-4">
        <div>
          <Label>Canal de entrada</Label>
          <Input value={channel} onChange={e => setChannel(e.target.value)} />
        </div>

        <div>
          <Label>Departamento (opcional)</Label>
          <Input value={department} onChange={e => setDepartment(e.target.value)} />
        </div>

        <MultiFileUploadManager
          ownerType="CorrespondenceCase"
          ownerId={caseId!}
          purpose={FilePurpose.CORRESPONDENCE_DOCUMENT}
          existingFiles={[]}
          queryKeyToInvalidate={['correspondence', caseId, 'documents']}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            Registar Entrada
          </Button>
        </div>
      </UtilitySection>
    </UtilityPageTemplate>
  );
}