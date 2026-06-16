// frontend/src/features/correspondence/components/modals/InboxCommentModal.tsx

import { X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useInboxComments } from '../../hooks/useInboxComments';

export function InboxCommentModal({
  registryId,
  onClose,
}: {
  registryId: string;
  onClose: () => void;
}) {
  const { data: comments = [] } = useInboxComments(registryId);

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4 space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            Histórico de Comentários
          </h3>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Sem comentários registados.
          </p>
        ) : (
          <ul className="space-y-3 max-h-64 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="text-sm">
                <div className="text-xs text-gray-500">
                  {c.status === 'ON_HOLD'
                    ? 'Em espera'
                    : 'Rejeitada'}

      {' · '}
      {c.createdBy.label}
      {' · '}

                  {new Date(c.createdAt).toLocaleString()}
                </div>
                <div className="text-gray-800 whitespace-pre-wrap">
                  {c.comment}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}