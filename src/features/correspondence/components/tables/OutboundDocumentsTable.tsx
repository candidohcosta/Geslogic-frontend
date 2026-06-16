// frontend/src/features/correspondence/components/tables/OutboundDocumentsTable.tsx

import { OutboundDocument } from '../../types/outbound-detail.types';

interface Props {
  documents: OutboundDocument[];
}

export default function OutboundDocumentsTable({ documents }: Props) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Nenhum documento associado a esta saída.
      </p>
    );
  }

  return (
    <table className="w-full text-sm border border-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="p-2 text-left border-b">Ficheiro</th>
          <th className="p-2 text-left border-b">Tipo</th>
          <th className="p-2 text-left border-b">Criado em</th>
        </tr>
      </thead>
      <tbody>
        {documents.map(doc => (
          <tr key={doc.id} className="border-t">
            <td className="p-2">{doc.originalFileName}</td>
            <td className="p-2">{doc.mimeType}</td>
            <td className="p-2">
              {new Date(doc.createdAt).toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}