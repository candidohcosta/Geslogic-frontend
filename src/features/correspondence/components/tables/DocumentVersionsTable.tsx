// frontend/src/features/correspondence/componenets/tables/DocumentVersionsTable.tsx

import { DocumentVersion } from '../../types/document-detail.types';

interface Props {
  versions: DocumentVersion[];
}

export default function DocumentVersionsTable({ versions }: Props) {
  if (versions.length === 0) {
    return <p className="text-sm text-gray-600">Sem versões.</p>;
  }

  return (
    <table className="w-full text-sm border border-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="p-2 text-left border-b">Versão</th>
          <th className="p-2 text-left border-b">Ficheiro</th>
          <th className="p-2 text-left border-b">Tipo</th>
          <th className="p-2 text-left border-b">Criado em</th>
          <th className="p-2 text-left border-b">Bloqueado</th>
        </tr>
      </thead>
      <tbody>
        {versions.map(v => (
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
  );
}