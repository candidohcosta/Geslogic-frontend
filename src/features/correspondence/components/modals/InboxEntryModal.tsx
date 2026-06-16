// frontend/src/features/correspondence/components/modals/InboxEntryModal.tsx

import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Label } from '../../../../components/ui/Label';
import { ArrowRight, FileText, X } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { InboxEntry } from '../../types/inbox.types';
import { useUpdateInboxEntry } from '../../hooks/useUpdateInboxEntry';
import { useInboxFiles } from '../../hooks/useInboxFiles';

import InboxAttachmentsViewer from '../attachments/InboxAttachmentsViewer';
import { useRevertInboxRejection } from '../../hooks/useRevertInboxRejection';
import { FilePurpose } from '../../../../types/file';
import MultiFileUploadManagerV2 from '../../../../components/ui/MultiFileUploadManagerV2';
import { useRegistryStatusHistory } from '../../hooks/useRegistryStatusHistory';
import RegistryStatusTimeline from '../RegistryStatusTimeline';

interface Props {
  entry: InboxEntry;
  onClose: () => void;
}

export default function InboxEntryModal({ entry, onClose }: Props) {
  const updateEntry = useUpdateInboxEntry();

  const isEditable =
    entry.status === 'PENDING' ||
    entry.status === 'ON_HOLD';

  const isFromEmail = entry.channel === 'EMAIL';

  const canEdit = isEditable && !isFromEmail;

  const [subject, setSubject] = useState(entry.subject ?? '');
  const [description, setDescription] = useState(entry.description ?? '');
  const [department, setDepartment] = useState(entry.department ?? '');
  const [receivedAt, setReceivedAt] = useState(
    entry.receivedAt?.slice(0, 10) ?? '',
  );

  const isRejected = entry.status === 'REJECTED';
  const navigate = useNavigate();
  const [showRevert, setShowRevert] = useState(false);
  const [revertComment, setRevertComment] = useState('');

  const { data: inboxFiles = [] } = useInboxFiles(entry.id);

  const revertMutation = useRevertInboxRejection(entry.companyId);

  const isSave = entry.status === 'ASSOCIATED' || entry.status === 'REJECTED';

  const [view, setView] = useState<'form' | 'history'>('form');
  const { data: history = [] } =
    useRegistryStatusHistory(entry.id);

  async function handleRevert() {
    if (!revertComment.trim()) return;

    try {
      await revertMutation.mutateAsync({
        registryId: entry.id,
        comment: revertComment.trim(),
      });

      setShowRevert(false);
      setRevertComment('');
      onClose();
    } catch (err) {
      console.error('Erro ao reverter rejeição:', err);
    }
  }

  const handleSave = () => {
    updateEntry.mutate(
      {
        id: entry.id,
        subject,
        description,
        department,
        receivedAt,
      },
      {
        onSuccess: onClose,
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden">

        {/* Barra de identidade */}
        <div className="h-1.5 bg-brand" />

        <div className="p-6 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="w-full">
              <p className="text-sm text-gray-600">
                <span className="text-gray-500">De:</span>{' '}
                <span className="font-semibold text-gray-800">
                  {entry.origin?.name ?? '—'}
                </span>

                <span className="mx-2 text-gray-400">·</span>

                <span className="text-gray-500">Canal:</span>{' '}
                <span className="font-semibold text-gray-800">
                  {entry.channel}
                </span>
              </p>

              <h2 className="text-xl text-gray-900">
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
                    Entrada sem assunto
                  </span>
                )}
              </h2>

            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={view === 'history' ? 'default' : 'outline'}
                onClick={() =>
                  setView(view === 'form' ? 'history' : 'form')
                }
              >
                {view === 'form' ? 'Histórico' : 'Voltar'}
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

          {entry.caseNumber && (
            <div className="bg-green-50 border border-green-200 rounded px-3 py-2 w-full mt-3">

              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-sm text-green-700 min-w-0">
                  <FileText className="w-4 h-4" />
                  <span className="truncate">
                    Associado ao expediente{' '}
                    <span className="font-semibold">
                      #{entry.caseNumber}
                    </span>
                  </span>
                </div>
                <button
                  className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 hover:underline whitespace-nowrap"
                  onClick={() => {
                    if (entry.caseId) {
                      navigate(`/correspondence/case/${entry.caseId}`);
                    }
                  }}
                >
                  <span>Abrir</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 transition-opacity duration-200">
            {view === 'form' ? (
              <div key="form" className="opacity-100">



                {/* Formulário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <Label>Assunto</Label>
                    <Input
                      disabled={!canEdit}
                      className={isRejected ? 'bg-gray-100 cursor-not-allowed' : ''}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Departamento</Label>
                    <Input
                      disabled={!canEdit}
                      className={isRejected ? 'bg-gray-100 cursor-not-allowed' : ''}
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Data de receção</Label>
                    <Input
                      type="date"
                      disabled={!canEdit}
                      className={isRejected ? 'bg-gray-100 cursor-not-allowed' : ''}
                      value={receivedAt}
                      onChange={(e) => setReceivedAt(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Canal</Label>
                    <Input value={entry.channel} disabled />
                  </div>
                </div>

                {/* Descrição */}
                <div className="border-t pt-4">
                  <Label>Descrição / Corpo</Label>
                  <Textarea
                    disabled={!canEdit}
                    className={isRejected ? 'bg-gray-100 cursor-not-allowed' : ''}
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Anexos */}
                <div className="border rounded-lg bg-gray-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-indigo-700">Anexos</Label>

                    {inboxFiles.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {inboxFiles.length} ficheiro(s)
                      </span>
                    )}
                  </div>

                  {!isEditable && (
                    <p className="text-xs text-amber-600">
                      Os anexos não podem ser alterados neste estado
                    </p>
                  )}
                  {isFromEmail && (
                    <p className="text-xs text-amber-600">
                      Os anexos não podem ser alterados quando a entrada é proveniente de um email
                    </p>
                  )}

                  <MultiFileUploadManagerV2
                    ownerType="CorrespondenceRegistry"
                    ownerId={entry.id}
                    purpose={FilePurpose.CORRESPONDENCE_INBOX}
                    existingFiles={inboxFiles.map((f: any) => ({
                      id: f.id,
                      url: f.url,
                      displayName:
                        f.displayName ?? f.originalName ?? 'Documento',
                    }))}
                    queryKeyToInvalidate={[
                      'files',
                      'CorrespondenceRegistry',
                      entry.id,
                      FilePurpose.CORRESPONDENCE_INBOX,
                    ]}
                    showThumbnails
                    readOnly={!canEdit}
                  />

                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t ">
                  {!showRevert && (
                    <Button variant="ghost" onClick={onClose}>
                      Fechar
                    </Button>
                  )}
                  {!isSave && (
                    <Button
                      onClick={handleSave}
                      disabled={!canEdit}
                    >
                      Guardar
                    </Button>
                  )}
                  {isRejected && !showRevert && (
                    <Button
                      variant="outline"
                      onClick={() => setShowRevert(true)}
                    >
                      Reverter rejeição
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
