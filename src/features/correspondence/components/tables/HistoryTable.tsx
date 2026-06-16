import { UtilitySection } from '../../../../components/templates/UtilityPageTemplate';
import { useCaseHistory } from '../../hooks/useCaseHistory';

export default function HistoryTable({ caseId }: { caseId: string }) {
  const { data, isLoading, isError } = useCaseHistory(caseId);

  if (isLoading)
    return <UtilitySection>A carregar histórico…</UtilitySection>;

  if (isError)
    return <UtilitySection>Erro ao carregar histórico.</UtilitySection>;

  if (!data || data.length === 0)
    return <UtilitySection>Sem eventos registados.</UtilitySection>;

  return (
    <UtilitySection>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Evento</th>
            <th className="p-2 text-left">Data</th>
          </tr>
        </thead>
        <tbody>
          {data.map((h, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2">
                {h.eventType ??
                  `${h.fromStatus} → ${h.toStatus}`}
              </td>
              <td className="p-2">
                {new Date(
                  h.occurredAt ?? h.changedAt!
                ).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </UtilitySection>
  );
}