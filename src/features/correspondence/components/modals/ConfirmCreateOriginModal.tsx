// frontend/src/features/correspondence/components/modals/ConfirmCreateOriginModal.tsx

import { Button } from '../../../../components/ui/Button';

interface Props {
  open: boolean;
  originName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmCreateOriginModal({
  open,
  originName,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold">
          Criar nova origem
        </h3>

        <p className="text-sm text-gray-700">
          A origem <strong>{originName}</strong> não existe.
          Deseja criá‑la?
        </p>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>
            Criar origem
          </Button>
        </div>
      </div>
    </div>
  );
}