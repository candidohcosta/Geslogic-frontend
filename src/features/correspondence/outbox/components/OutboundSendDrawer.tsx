// frontend/src/features/correspondence/outbox/components/OutboundSendDrawer.tsx

import { useState } from 'react';
import { Drawer } from '../../../../components/patterns/Drawer';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Label } from '../../../../components/ui/Label';
import { X } from 'lucide-react';

import { OutboundRegistry } from '../../types/registry.types';
import { useOutboundRegistryFiles } from '../hooks/useOutboundRegistryFiles';
import { useSendOutboundRegistry } from '../hooks/useSendOutboundRegistry';
import { useCorrespondenceCatalog } from '../../hooks/useCorrespondenceCatalog';
import { useDocumentTypesCatalog } from '../hooks/useDocumentTypesCatalog'; // ✅ NOVO

type DecisionType = 'SEND' | 'ON_HOLD' | 'CANCEL';
type CaseMode = 'NONE' | 'CREATE' | 'LINK'; // 🔥 NOVO

interface Props {
  registry: OutboundRegistry;
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function OutboundSendDrawer({
  registry,
  companyId,
  isOpen,
  onClose,
}: Props) {
  const { data: files = [] } = useOutboundRegistryFiles(registry.id);

const { data: catalog, isLoading: isCatalogLoading } =  useCorrespondenceCatalog();

const { data: documentTypes = [], isLoading: isLoadingTypes } = 
  useDocumentTypesCatalog(companyId, 'OUT');  // ✅ NOVO

console.log('CATALOG:', catalog);

  const [decision, setDecision] = useState<DecisionType | null>(null);
  const [comment, setComment] = useState('');

  // 🔥 NOVO (gestão de Case)
  const [caseMode, setCaseMode] = useState<CaseMode>('NONE');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

const [selectedDocumentType, setSelectedDocumentType] = useState('');
const [searchTerm, setSearchTerm] = useState('');



const availableTypes =
  catalog?.defaults?.enabledDocumentTypes?.filter((type: string) => {
    const def = catalog?.documentTypes?.[type];

    return def?.allowedDirections?.includes('OUT');
  }) ?? [];

  const sendMutation = useSendOutboundRegistry();

  const isDecisionValid =
    decision === 'CANCEL'
      ? comment.trim().length > 0
      : decision !== null;

  const actionLabel =
    decision === 'SEND'
      ? 'Expedir'
      : decision === 'ON_HOLD'
      ? 'Colocar em espera'
      : decision === 'CANCEL'
      ? 'Cancelar registo'
      : 'Confirmar';

  /* ================= HEADER ================= */

  const header = (
    <div className="flex items-start justify-between gap-4">
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
          {registry.subject ? (
            <>
              <span className="text-sm font-medium text-gray-500 mr-2">
                Assunto
              </span>
              <span className="font-semibold">{registry.subject}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 italic">
              Saída sem assunto
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
            disabled={
              !decision ||
              !isDecisionValid ||
              sendMutation.isPending ||
              // 🔥 validação adicional
(
  decision === 'SEND' &&
  caseMode === 'CREATE' &&
  !selectedDocumentType
) ||
(
  decision === 'SEND' &&
  caseMode === 'LINK' &&
  !selectedCaseId
)
            }
            variant={decision === 'CANCEL' ? 'destructive' : 'default'}
            onClick={() => {
sendMutation.mutate(
  {
    registryId: registry.id,
    decision: decision!,
    comment,

    caseMode,

    caseId:
      caseMode === 'LINK' ? selectedCaseId : undefined,

    documentType:
      caseMode === 'CREATE'
        ? selectedDocumentType
        : undefined,
  },
                {
                  onSuccess: () => {
                    onClose();
                  },
                  onError: (error: any) => {
                    alert(
                      error?.message ??
                        'Erro ao processar decisão.',
                    );
                  },
                },
              );
            }}
          >
            {sendMutation.isPending ? 'A processar…' : actionLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-6">

        {/* ================= DADOS ================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          <div>
            <Label>Assunto</Label>
            <Input value={registry.subject ?? ''} disabled />
          </div>

          <div>
            <Label>Departamento</Label>
            <Input value={registry.department ?? ''} disabled />
          </div>

          <div>
            <Label>Estado</Label>
            <Input value={registry.status} disabled />
          </div>

          <div>
            <Label>Canal</Label>
            <Input value={registry.channel} disabled />
          </div>
        </div>

        <div className="border-t pt-4">
          <Label>Descrição / Corpo</Label>
          <Textarea
            rows={5}
            value={registry.description ?? ''}
            disabled
            className="bg-gray-100 resize-none"
          />
        </div>

        {/* ================= ANEXOS ================= */}

        <div className="border rounded-lg bg-gray-50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-indigo-700">Anexos</Label>

            {files.length > 0 && (
              <span className="text-xs text-gray-500">
                {files.length} ficheiro(s)
              </span>
            )}
          </div>

          {files.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Não existem anexos.
            </p>
          ) : (
            <ul className="space-y-2">
              {files.map((file: any) => (
                <li
                  key={file.id}
                  className="border rounded px-3 py-2 bg-white text-sm truncate"
                >
                  {file.displayName ??
                    file.originalName ??
                    'Documento'}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ================= DECISÃO ================= */}

        <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
          <Label className="font-medium">Ação</Label>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={decision === 'SEND'}
                onChange={() => setDecision('SEND')}
              />
              Expedir
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={decision === 'ON_HOLD'}
                onChange={() => setDecision('ON_HOLD')}
              />
              Ficar em espera
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={decision === 'CANCEL'}
                onChange={() => setDecision('CANCEL')}
              />
              Cancelar registo
            </label>
          </div>

          {/* 🔥 NOVO: SÓ MOSTRAR PARA SEND */}
{decision === 'SEND' && (
  <div className="border-t pt-4 space-y-3">

    <Label className="font-medium">
      Expediente (opcional)
    </Label>

    {/* ================= SELECT MODE ================= */}

    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={caseMode === 'NONE'}
          onChange={() => setCaseMode('NONE')}
        />
        Nenhum (independente)
      </label>

      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={caseMode === 'CREATE'}
          onChange={() => setCaseMode('CREATE')}
        />
        Criar novo expediente
      </label>

      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={caseMode === 'LINK'}
          onChange={() => setCaseMode('LINK')}
        />
        Associar a expediente existente
      </label>
    </div>

    {/* ================= CREATE ================= */}

    {caseMode === 'CREATE' && (
      <div className="space-y-2">
        <Label>Tipo de expediente *</Label>

        {isLoadingTypes ? (
          <p className="text-sm text-gray-500">A carregar tipos...</p>
        ) : documentTypes.length === 0 ? (
          <p className="text-sm text-red-500">
            Nenhum tipo de expediente disponível para esta empresa.
          </p>
        ) : (
          <select
            value={selectedDocumentType}
            onChange={(e) => setSelectedDocumentType(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Selecionar tipo...</option>
            {documentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
                {type.description ? ` — ${type.description}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>
    )}

    {/* ================= LINK ================= */}

    {caseMode === 'LINK' && (
      <div className="space-y-2">
        <Label>Procurar expediente</Label>

        <Input
          placeholder="Número ou assunto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* 🔥 MOCK (depois substituis por API) */}
        <div className="border rounded max-h-40 overflow-y-auto">
          {[
            { id: '1', number: 'CE-00001/2026', subject: 'Teste' },
            { id: '2', number: 'CE-00002/2026', subject: 'Contrato XPTO' },
          ]
            .filter(
              (c) =>
                c.number
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase()) ||
                c.subject
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase()),
            )
            .map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  selectedCaseId === c.id
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
              >
                {c.number} — {c.subject}
              </div>
            ))}
        </div>
      </div>
    )}
  </div>
)}

          {(decision === 'ON_HOLD' || decision === 'CANCEL') && (
            <div className="space-y-1">
              <Label>
                {decision === 'CANCEL'
                  ? 'Motivo do cancelamento'
                  : 'Comentário interno'}
              </Label>

              {decision === 'CANCEL' &&
                comment.trim().length === 0 && (
                  <p className="text-xs text-red-500">
                    É obrigatório indicar um motivo.
                  </p>
                )}

              <Textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}