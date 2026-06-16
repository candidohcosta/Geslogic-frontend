// frontend/src/features/correspondence/components/StatusBadge.tsx

const STATUS_CONFIG: Record<string, any> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  RECEIVED: { label: 'Recebido', color: 'bg-blue-100 text-blue-700' },
  IN_REVIEW: { label: 'Em revisão', color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
  PUBLISHED: { label: 'Publicado', color: 'bg-indigo-100 text-indigo-700' },
  ARCHIVED: { label: 'Arquivado', color: 'bg-gray-200 text-gray-600' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-600' },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {};

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>
      {config.label ?? status}
    </span>
  );
}