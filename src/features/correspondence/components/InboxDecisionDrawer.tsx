import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Drawer } from '../../../components/patterns/Drawer';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Label } from '../../../components/ui/Label';
import { X } from 'lucide-react';

import { InboxEntry } from '../types/inbox.types';
import { useInboxFiles } from '../hooks/useInboxFiles';

import { useDecideInboundRegistry } from '../hooks/useDecideInboundRegistry';

type DecisionType = 'CREATE_CASE' | 'ON_HOLD' | 'REJECT';

interface Props {
  entry: InboxEntry;
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InboxDecisionDrawer({
  entry,
  companyId,
  isOpen,
  onClose,
}: Props) {
  const { data: inboxFiles = [] } = useInboxFiles(entry.id);

  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<DecisionType | null>(null);
  const [comment, setComment] = useState('');
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);

  const decideMutation = useDecideInboundRegistry(companyId);

/* const isDecisionValid =
  decision === 'CREATE_CASE'
    ? selectedAttachmentIds.length > 0
    : decision === 'REJECT'
    ? comment.trim().length > 0
    : decision === 'ON_HOLD'; */
const isDecisionValid =
  decision === 'REJECT'
    ? comment.trim().length > 0
    : decision !== null;    

const actionLabel =
  decision === 'CREATE_CASE'
    ? 'Criar expediente'
    : decision === 'ON_HOLD'
    ? 'Colocar em espera'
    : decision === 'REJECT'
    ? 'Rejeitar entrada'
    : 'Confirmar';

  // ✅ seleção automática por canal
  useEffect(() => {
    if (entry.channel === 'MANUAL') {
      setSelectedAttachmentIds(inboxFiles.map((f: any) => f.id));
    } else {
      setSelectedAttachmentIds([]);
    }
  }, [entry.channel, inboxFiles]);

  const toggleAttachment = (id: string) => {
    setSelectedAttachmentIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  /* ============================
   * HEADER (igual ao modal)
   * ============================ */
  const header = (
    <div className="flex items-start justify-between gap-4">
      <div>
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

        <h2 className="text-xl text-gray-900 mt-1">
          {entry.subject ? (
            <>
              <span className="text-sm font-medium text-gray-500 mr-2">
                Assunto
              </span>
              <span className="font-semibold">
                {entry.subject}
              </span>
            </>
          ) : (
            <span className="text-sm font-normal text-gray-400 italic">
              Entrada sem assunto
            </span>
          )}
        </h2>
      </div>

      <button
        onClick={onClose}
        title="Fechar"
        className="text-gray-400 hover:text-gray-700 transition"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      customHeader={header}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>

<Button
  disabled={!decision || !isDecisionValid || decideMutation.isPending}
  variant={decision === 'REJECT' ? 'destructive' : 'default'}
  onClick={() => {
    decideMutation.mutate(
      {
        registryId: entry.id,
        decision: decision!,
        attachmentIds: selectedAttachmentIds,
        comment,
      },
      {
        onSuccess: (result) => {

/*           queryClient.invalidateQueries({
            queryKey: ['inbox'],
          }); */

          onClose();

          if (decision === 'CREATE_CASE' && result.caseId) {
            // opcional (mais tarde)
            // navigate(`/correspondence/cases/${result.caseId}`);
          }
        },
        onError: (error: any) => {
          alert(
            error?.message ??
              'Ocorreu um erro ao processar a decisão.',
          );
        },
      },
    );
  }}
>
  {decideMutation.isPending ? 'A processar…' : actionLabel}
</Button>
        </>
      }
    >
      {/* ============================
       * DADOS DA ENTRADA
       * ============================ */}
      <div className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          <div>
            <Label>Assunto</Label>
            <Input value={entry.subject ?? ''} disabled />
          </div>

          <div>
            <Label>Departamento</Label>
            <Input value={entry.department ?? ''} disabled />
          </div>

          <div>
            <Label>Data de receção</Label>
            <Input
              value={entry.receivedAt?.slice(0, 10) ?? ''}
              disabled
            />
          </div>

          <div>
            <Label>Canal</Label>
            <Input value={entry.channel} disabled />
          </div>
        </div>

        <div className="border-t pt-4">
          <Label>Descrição / Corpo</Label>
          <Textarea
            rows={5}
            value={entry.description ?? ''}
            disabled
            className="bg-gray-100 resize-none"
          />
        </div>

        {/* ============================
         * ANEXOS
         * ============================ */}
        <div className="border rounded-lg bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-indigo-700">Anexos</Label>

            {inboxFiles.length > 0 && (
              <span className="text-xs text-gray-500">
                {inboxFiles.length} ficheiro(s)
              </span>
            )}
          </div>

          {inboxFiles.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Não existem anexos.
            </p>
          ) : (
            <>
            <ul className="space-y-2">
              {inboxFiles.map((file: any) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 border rounded px-3 py-2 bg-white"
                >
                  <input
                    type="checkbox"
                    checked={selectedAttachmentIds.includes(file.id)}
                    onChange={() => toggleAttachment(file.id)}
                  />
                  <span className="text-sm truncate">
                    {file.displayName ?? file.originalName ?? 'Documento'}
                  </span>
                </li>
              ))}
            </ul>

{decision === 'CREATE_CASE' && selectedAttachmentIds.length === 0 && (
  <p className="text-sm text-amber-600 mt-2">
    Nenhum anexo selecionado. O expediente será criado apenas com os dados da entrada.
  </p>
)}
</>
          )}
        </div>

        {/* ============================
         * DECISÃO
         * ============================ */}
        <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
          <Label className="font-medium">Decisão</Label>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="decision"
                checked={decision === 'CREATE_CASE'}
                onChange={() => setDecision('CREATE_CASE')}
              />
              Criar expediente
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="decision"
                checked={decision === 'ON_HOLD'}
                onChange={() => setDecision('ON_HOLD')}
              />
              Ficar em espera
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="decision"
                checked={decision === 'REJECT'}
                onChange={() => setDecision('REJECT')}
              />
              Rejeitar entrada
            </label>

{decision === 'CREATE_CASE' && (
  <p className="text-sm text-gray-600">
    Será criado um novo expediente.
  </p>
)}

{decision === 'ON_HOLD' && (
  <p className="text-sm text-gray-600">
    A entrada ficará na inbox sem criação de expediente.
  </p>
)}

{decision === 'REJECT' && (
  <p className="text-sm text-red-600">
    A entrada será rejeitada e não será criado qualquer expediente.
  </p>
)}

          </div>

          {(decision === 'REJECT' || decision === 'ON_HOLD') && (
            <div className="space-y-1">
              <Label>
                {decision === 'REJECT'
                  ? 'Motivo da rejeição'
                  : 'Comentário interno'}
              </Label>
{decision === 'REJECT' && comment.trim().length === 0 && (
<p className="text-xs text-red-500 mt-1">
  É obrigatório indicar um motivo para rejeitar a entrada.
</p>
)}

              <Textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}