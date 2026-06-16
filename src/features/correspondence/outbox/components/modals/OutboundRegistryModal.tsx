// frontend/src/features/correspondence/outbox/components/modals/OutboundRegistryModal.tsx

import { useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { Textarea } from '../../../../../components/ui/Textarea';
import { Label } from '../../../../../components/ui/Label';

import { OutboundRegistry } from '../../../types/registry.types';
import { useUpdateOutboundRegistry } from '../../hooks/useUpdateOutboundRegistry';
import { useOutboundRegistryFiles } from '../../hooks/useOutboundRegistryFiles';

//import OutboundAttachmentsViewer from '../attachments/OutboundAttachmentsViewer';
import MultiFileUploadManagerV2 from '../../../../../components/ui/MultiFileUploadManagerV2';
import { FilePurpose } from '../../../../../types/file';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../../../services/api';
import { useRevertOutboundCancellation } from '../../hooks/useRevertOutboundCancellation';
import { useRegistryStatusHistory } from '../../../hooks/useRegistryStatusHistory';
import RegistryStatusTimeline from '../../../components/RegistryStatusTimeline';

interface Props {
  registry: OutboundRegistry;
  onClose: () => void;
}

export default function OutboundRegistryModal({
  registry,
  onClose,
}: Props) {
  const isDraft = registry.status === 'DRAFT';

  const updateRegistry = useUpdateOutboundRegistry();

  const [subject, setSubject] = useState(registry.subject ?? '');
  const [description, setDescription] = useState(registry.description ?? '');
  const [department, setDepartment] = useState(registry.department ?? '');
  const [channel, setChannel] = useState(registry.channel);

  const isCancelled = registry.status === 'CANCELLED';
  const [showRevert, setShowRevert] = useState(false);
  const [revertComment, setRevertComment] = useState('');
  const revertMutation = useRevertOutboundCancellation(registry.companyId);

  const { data: files = [] } = useOutboundRegistryFiles(registry.id);

  const [view, setView] = useState<'form' | 'history'>('form');
  const { data: history = [] } =
    useRegistryStatusHistory(registry.id);

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', 'OUT'],
    queryFn: () =>
      apiFetch('/correspondence/settings/channels?direction=OUT'),
  });

  const handleSave = () => {
    const handleSave = console.log('CLICK GUARDAR');

    updateRegistry.mutate(
      {
        id: registry.id,
        subject,
        description,
        department,
      },
      {
        onSuccess: () => {
          console.log('SUCCESS');
          onClose();
        },
        onError: (err) => {
          console.error('ERROR', err);
        }
      },
    );
  };

  async function handleRevert() {
    if (!revertComment.trim()) return;

    try {
      await revertMutation.mutateAsync({
        registryId: registry.id,
        comment: revertComment.trim(),
      });

      setShowRevert(false);
      setRevertComment('');
      onClose();
    } catch (err) {
      console.error('Erro ao reverter cancelamento:', err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden">

        {/* Barra de identidade */}
        <div className="h-1.5 bg-brand" />

        <div className="p-6 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">
                <span className="text-gray-500">Número:</span>{' '}
                <span className="font-semibold text-gray-800">
                  {registry.registryNumber ?? '—'}
                </span>

                <span className="mx-2 text-gray-400">·</span>

                <span className="text-gray-500">Canal:</span>{' '}
                <span className="font-semibold text-gray-800">
                  {registry.channel}
                </span>
              </p>

              <h2 className="text-xl text-gray-900 mt-1">
                {subject ? (
                  <>
                    <span className="text-sm font-medium text-gray-500 mr-2">
                      Assunto
                    </span>
                    <span className="font-semibold">
                      {subject}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-normal text-gray-400 italic">
                    Saída sem assunto
                  </span>
                )}
              </h2>
            </div>


            <div className="flex items-center gap-2">
              <Button
                variant={view === 'history' ? 'default' : 'ghost'}
                onClick={() =>
                  setView(view === 'form' ? 'history' : 'form')
                }
              >
                Histórico
              </Button>

              <button
                onClick={onClose}
                title="Fechar"
                className="text-gray-400 hover:text-gray-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>


          <div className="mt-4 transition-opacity duration-200">
            {view === 'form' ? (
              <div key="form" className="opacity-100">


              {/* Formulário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">

                <div>
                  <Label>Assunto</Label>
                  <Input
                    disabled={!isDraft}
                    className={!isDraft ? 'bg-gray-100 cursor-not-allowed' : ''}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Departamento</Label>
                  <Input
                    disabled={!isDraft}
                    className={!isDraft ? 'bg-gray-100 cursor-not-allowed' : ''}
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Estado</Label>
                  <Input value={registry.status} disabled />
                </div>

                <div>
                  <Label>Canal</Label>
                  <select
                    disabled={!isDraft}
                    className={`w-full border rounded px-3 py-2 ${!isDraft ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  >
                    {channels.map((c: string) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div className="border-t pt-4">
                <Label>Descrição / Corpo</Label>
                <Textarea
                  disabled={!isDraft}
                  className={!isDraft ? 'bg-gray-100 cursor-not-allowed' : ''}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Documentos */}
              <div className="border rounded-lg bg-gray-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-indigo-700">
                    Documentos associados
                  </Label>

                  {files.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {files.length} ficheiro(s)
                    </span>
                  )}
                </div>

                <MultiFileUploadManagerV2
                  ownerType="OutboundRegistry"
                  ownerId={registry.id}
                  purpose={FilePurpose.CORRESPONDENCE_OUTBOX}
                  existingFiles={files.map((f: any) => ({
                    id: f.id,
                    url: f.url,
                    displayName:
                      f.displayName ??
                      f.originalName ??
                      'Documento',
                  }))}
                  queryKeyToInvalidate={[
                    'correspondence',
                    'outbound',
                    registry.id,
                    'files',
                  ]}
                  showThumbnails
                />

              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="ghost" onClick={onClose}>
                  Fechar
                </Button>

                {isDraft && (
                  <Button
                    onClick={handleSave}
                    disabled={updateRegistry.isPending}
                  >
                    Guardar
                  </Button>
                )}

                {isCancelled && !showRevert && (
                  <Button
                    variant="outline"
                    onClick={() => setShowRevert(true)}
                  >
                    Reverter cancelamento
                  </Button>
                )}

                {showRevert && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Motivo da reversão (obrigatório)"
                      value={revertComment}
                      onChange={(e) => setRevertComment(e.target.value)}
                    />

                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setShowRevert(false)}>
                        Cancelar
                      </Button>
                      <Button
                        disabled={!revertComment.trim()}
                        onClick={handleRevert}
                      >
                        Confirmar reversão
                      </Button>
                    </div>
                  </div>
                )}

              </div>

              </div>
            ) : (
              <div key="history" className="opacity-100">
                <RegistryStatusTimeline items={history} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}