// frontend/src/features/correspondence/components/tables/DocumentsTable.tsx

import { UtilitySection } from '../../../../components/templates/UtilityPageTemplate';
import { useCaseDocuments } from '../../hooks/useCaseDocuments';

export default function DocumentsTable({ caseId }: { caseId: string }) {
  const { data, isLoading, isError } = useCaseDocuments(caseId);

  if (isLoading)
    return <UtilitySection>A carregar documentos…</UtilitySection>;

  if (isError)
    return <UtilitySection>Erro ao carregar documentos.</UtilitySection>;

  if (!data || data.length === 0)
    return <UtilitySection>Sem documentos associados.</UtilitySection>;

  return (
    <UtilitySection>
      {data.map(doc => (
        <div key={doc.document.id} className="mb-6">
          <h3 className="font-semibold text-sm mb-2">
            Documento {doc.document.id}
          </h3>

          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Versão</th>
                <th className="p-2 text-left">Ficheiro</th>
                <th className="p-2 text-left">Tipo</th>
                <th className="p-2 text-left">Criado em</th>
                <th className="p-2 text-left">Bloqueado</th>
              </tr>
            </thead>
            <tbody>
              {doc.versions.map(v => (
                <tr key={v.id} className="border-t">
                  <td className="p-2">v{v.versionNumber}</td>
                  <td className="p-2">{v.originalFileName}</td>
                  <td className="p-2">{v.mimeType}</td>
                  <td className="p-2">
                    {new Date(v.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2">
                    {v.locked ? 'Sim' : 'Não'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </UtilitySection>
  );
}