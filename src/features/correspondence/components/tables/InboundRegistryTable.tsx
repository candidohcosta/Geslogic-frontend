// frontend/src/features/correspondence/components/tables/InboundRegistryTable.tsx

import { useInboundRegistries } from '../../hooks/useInboundRegistries';
import { UtilitySection } from '../../../../components/templates/UtilityPageTemplate';

export default function InboundRegistryTable({ caseId }: { caseId: string }) {
  const { data, isLoading, isError } = useInboundRegistries(caseId);

  if (isLoading) return <UtilitySection>A carregar entradas…</UtilitySection>;
  if (isError) return <UtilitySection>Erro ao carregar entradas.</UtilitySection>;
  if (!data || data.length === 0)
    return <UtilitySection>Sem registos de entrada.</UtilitySection>;

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