// frontend/src/features/correspondence/components/tables/InboxTable.tsx

import { Button } from '../../../../components/ui/Button';
import { InboxEntry } from '../../types/inbox.types';
import { useNavigate } from 'react-router-dom';
import { Paperclip } from 'lucide-react';

interface Props {
  data: InboxEntry[];
}

export default function InboxTable({ data }: Props) {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Não existem entradas pendentes.
      </p>
    );
  }

  return (
    <table className="w-full text-sm border border-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="p-2 text-left border-b">Entidade</th>
          <th className="p-2 text-left border-b">Assunto</th>
          <th className="p-2 text-left border-b">Canal</th>
          <th className="p-2 text-left border-b">Data</th>

          {/* ✅ Coluna de anexos */}
          <th className="p-2 text-center border-b w-[36px]" />

          <th className="p-2 text-left border-b">Ações</th>
        </tr>
      </thead>

      <tbody>
        {data.map(entry => (
          <tr key={entry.id} className="border-t align-middle">
            <td className="p-2 font-medium">
              {entry.origin?.name ?? '—'}
            </td>

            <td className="p-2 text-gray-700">
              {entry.subject ?? (
                <span className="italic text-gray-400">
                  Sem assunto
                </span>
              )}
            </td>

            <td className="p-2">
              {entry.channel}
            </td>

            <td className="p-2 text-gray-600">
              {new Date(
                entry.receivedAt ?? entry.createdAt,
              ).toLocaleString()}
            </td>

            {/* ✅ ÍCONE DE ANEXOS */}
{/*             <td className="p-2 text-center">
              {entry.attachmentsCount > 0 && (
                <Paperclip className="h-4 w-4 text-gray-600 inline-block">
                  <title>
                    {`${entry.attachmentsCount} anexo(s)`}
                  </title>
                </Paperclip>
              )}
            </td> */}

<td className="p-2 text-center">
  <span className="text-xs text-red-600">
    ?{entry.attachmentsCount}
  </span>
</td>


            <td className="p-2">
              <Button
                size="sm"
                onClick={() =>
                  navigate(`/correspondence/inbox/${entry.id}`)
                }
              >
                Decidir
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}