// frontend/src/features/correspondence/cases/pages/CaseDetailPage.tsx

// frontend/src/features/correspondence/cases/pages/CaseDetailPage.tsx

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../../services/api';
import { useState } from 'react';

import { Button } from '../../../../components/ui/Button';
import { FileText } from 'lucide-react';

/* ================= TYPES ================= */

type Case = {
  id: string;
  number: string;
  documentType: string;
  status: string;
  direction: string;
  createdAt: string;
  updatedAt?: string;
};

/* ================= PAGE ================= */

export default function CaseDetailPage() {


const params = useParams();

console.log('RAW PARAMS:', params);


  const { companyId, caseId } = useParams<{
    companyId: string;
    caseId: string;
  }>();

  const [tab, setTab] = useState<
    'timeline' | 'inbound' | 'outbound'
  >('timeline');

  /* ✅ QUERY CORRETA (ALINHADA COM BACKEND) */

  const { data, isLoading } = useQuery<{
    case: Case;
    history: any[];
    versions: any[];
  }>({
    queryKey: ['case', caseId, companyId],
    queryFn: () =>
      apiFetch(
        `/correspondence/cases/${caseId}?companyId=${companyId}`
      ),
    enabled: !!caseId && !!companyId,
  });

  /* ✅ EXTRAÇÃO CORRETA */

  const caseData = data?.case;
  const history = data?.history ?? [];

  /* ================= STATES ================= */

  if (isLoading) {
    return <div className="p-6">A carregar...</div>;
  }

  if (!caseData) {
    return (
      <div className="p-6 text-red-500">
        Expediente não encontrado.
      </div>
    );
  }

  /* ================= RENDER ================= */

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {caseData.number}
          </h1>

          <div className="text-sm text-gray-500 mt-1">
            {caseData.documentType} · {caseData.direction}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            Estado: {caseData.status}
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm">Alterar estado</Button>
          <Button size="sm" variant="secondary">
            Criar saída
          </Button>
        </div>
      </div>

      {/* METADATA */}
      <div className="grid grid-cols-3 gap-4 text-sm border rounded p-4">
        <div>
          <span className="text-gray-500">Criado em</span>
          <div>
            {new Date(caseData.createdAt).toLocaleString()}
          </div>
        </div>

        <div>
          <span className="text-gray-500">Atualizado</span>
          <div>
            {caseData.updatedAt
              ? new Date(caseData.updatedAt).toLocaleString()
              : '—'}
          </div>
        </div>

        <div>
          <span className="text-gray-500">Direção</span>
          <div>{caseData.direction}</div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b pb-2 text-sm">
        <button
          onClick={() => setTab('timeline')}
          className={tab === 'timeline' ? 'font-semibold' : ''}
        >
          Timeline
        </button>

        <button
          onClick={() => setTab('inbound')}
          className={tab === 'inbound' ? 'font-semibold' : ''}
        >
          Entradas
        </button>

        <button
          onClick={() => setTab('outbound')}
          className={tab === 'outbound' ? 'font-semibold' : ''}
        >
          Saídas
        </button>
      </div>

      {/* TIMELINE */}
      {tab === 'timeline' && (
        <div className="space-y-3">
          {history.length === 0 && (
            <div className="text-gray-400 text-sm">
              Sem histórico
            </div>
          )}

          {history.map((h: any) => (
            <div
              key={h.id}
              className="border rounded p-3 text-sm"
            >
              <div>
                {h.fromStatus} → {h.toStatus}
              </div>

              {h.comment && (
                <div className="text-gray-600 text-xs mt-1">
                  {h.comment}
                </div>
              )}

              <div className="text-xs text-gray-400 mt-1">
                {new Date(h.changedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'inbound' && (
        <div className="text-gray-400">Em breve</div>
      )}

      {tab === 'outbound' && (
        <div className="text-gray-400">Em breve</div>
      )}

    </div>
  );
}