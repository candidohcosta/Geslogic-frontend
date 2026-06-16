// frontend/src/features/correspondence/components/WizardStepConfirm.tsx

import { Button } from '../../../components/ui/Button';

export default function WizardStepConfirm({
  companyId,
  onFinish,
}: {
  companyId?: string;
  onFinish: (companyId?: string) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-gray-700">
        A entrada foi registada com sucesso e encontra-se agora na Inbox à espera de decisão.
      </p>

      <div className="flex justify-end">
        <Button onClick={() => onFinish(companyId)}>
          Voltar à Inbox
        </Button>
      </div>
    </div>
  );
}
