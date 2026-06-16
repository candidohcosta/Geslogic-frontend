// frontend/src/features/correspondence/components/tables/OutboundRegistryTable.tsx

import { UtilitySection } from '../../../../components/templates/UtilityPageTemplate';
import { useOutboundRegistries } from '../../hooks/useOutboundRegistries';

export default function OutboundRegistryTable({ caseId }: { caseId: string }) {
  const { data, isLoading, isError } = useOutboundRegistries(caseId);

  if (isLoading)
    return <UtilitySection>A carregar saídas…</UtilitySection>;

  if (isError)
    return <UtilitySection>Erro ao carregar saídas.</UtilitySection>;

  if (!data || data.length === 0)
    return <UtilitySection>Sem registos de saída.</UtilitySection>;

  return (
    <UtilitySection>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Número</th>
            <th className="p-2 text-left">Canal</th>
            <th className="p-2 text-left">Data</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.registryNumber}</td>
              <td className="p-2">{r.channel ?? '—'}</td>
              <td className="p-2">
                {new Date(r.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </UtilitySection>
  );
}