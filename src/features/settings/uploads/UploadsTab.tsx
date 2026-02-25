// src/features/settings/uploads/UploadsTab.tsx
import React, { useEffect, useState } from 'react';
import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Button } from '../../../components/ui/Button';

type Props = {
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
};

export default function UploadsTab({ onHeaderActionsChange }: Props) {
  const [maxUploadMb, setMaxUploadMb] = useState(10);
  const [byPurpose, setByPurpose] = useState(false);

  // Actions da tab
  useEffect(() => {
    onHeaderActionsChange?.(
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setMaxUploadMb(10);
            setByPurpose(false);
          }}
        >
          Repor
        </Button>
        <Button onClick={() => alert('Guardar (exemplo)')}>Guardar</Button>
      </div>
    );
  }, [maxUploadMb, byPurpose]);

  return (
    <>
      <SettingsSectionCard
        accent
        title="Limites Globais de Upload"
        description="Configurações gerais de upload (exemplo)."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">Tamanho Máximo (MB)</span>
            <input
              type="number"
              min={1}
              value={maxUploadMb}
              onChange={(e) => setMaxUploadMb(Number(e.target.value))}
              className="h-9 w-full border rounded-md px-2"
            />
          </label>

          <label className="flex items-center gap-2 text-sm mt-6">
            <input
              type="checkbox"
              checked={byPurpose}
              onChange={(e) => setByPurpose(e.target.checked)}
            />
            Limites por propósito
          </label>
        </div>
      </SettingsSectionCard>

      {byPurpose && (
        <SettingsSectionCard accent title="Limites por propósito">
          <p className="text-sm text-gray-600">Exemplo: no futuro ler da tabela Platform Settings.</p>
        </SettingsSectionCard>
      )}
    </>
  );
}