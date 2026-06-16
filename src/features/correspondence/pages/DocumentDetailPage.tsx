// frontend/src/features/correspondence/pages/DocumentsDetailPage.tsx

import { FileText } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  UtilityPageTemplate,
  UtilitySection,
} from '../../../components/templates/UtilityPageTemplate';

import { useDocument } from '../hooks/useDocument';
import DocumentVersionsTable from '../components/tables/DocumentVersionsTable';

export default function DocumentDetailPage() {
  const { caseId, documentId } = useParams<{
    caseId: string;
    documentId: string;
  }>();

  const navigate = useNavigate();

  // ✅ Hook SEMPRE chamado
  const { data, isLoading, isError } = useDocument(
    caseId ?? '',
    documentId ?? ''
  );

  if (!caseId || !documentId) {
    return <p>Documento inválido.</p>;
  }

  if (isLoading) {
    return <p>A carregar documento…</p>;
  }

  if (isError || !data) {
    return <p>Erro ao carregar documento.</p>;
  }

  const { document, versions } = data;

  return (
    <UtilityPageTemplate
      header={{
        icon: FileText,
        title: `Documento ${document.id}`,
        subtitle: `Expediente ${caseId}`,
        actions: (
          <button
            className="btn btn-secondary"
            onClick={() =>
              navigate(`/correspondence/cases/${caseId}`)
            }
          >
            Voltar ao expediente
          </button>
        ),
      }}
      accent={{ content: true }}
    >
      <UtilitySection>
        <div className="text-sm space-y-2 mb-4">
          <div>
            <strong>Conteúdo associado:</strong>{' '}
            {document.hasContent ? 'Sim' : 'Não'}
          </div>
          <div>
            <strong>Conteúdo bloqueado:</strong>{' '}
            {document.contentLocked ? 'Sim' : 'Não'}
          </div>
        </div>

        <h3 className="font-semibold text-sm mb-2">
          Versões do Documento
        </h3>

        <DocumentVersionsTable versions={versions} />
      </UtilitySection>
    </UtilityPageTemplate>
  );
}