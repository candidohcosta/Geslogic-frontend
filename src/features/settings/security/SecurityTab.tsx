// frontend/src/features/settings/security/SecurityTab.tsx
import React, { useEffect, useState, useCallback } from 'react';
import SecurityIndex from './SecurityIndex';
import { Button } from '../../../components/ui/Button';
import SecurityUndoModal from './components/SecurityUndoModal';
import { exportServicesRegistryConfig, exportSecurityBackup } from '../../../services/api';

type Props = {
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
};

export default function SecurityTab({ onHeaderActionsChange }: Props) {
  const [undoOpen, setUndoOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleDownloadBackup = useCallback(async () => {
    try {
      await exportSecurityBackup();
    } catch (e: any) {
      alert(e?.message ?? 'Falha ao descarregar o backup de segurança.');
    }
  }, []);

  const handleExportRegistry = useCallback(async () => {
    try {
      setExporting(true);
      const res: { ok: boolean; path?: string; count?: number } = await exportServicesRegistryConfig();

      if (res?.ok) {
        const pathInfo = res.path ? `: ${res.path}` : '';
        const countInfo = typeof res.count === 'number' ? ` (${res.count} serviços)` : '';
        alert(`Exportado no servidor${pathInfo}${countInfo}`);
      } else {
        // Não assumimos `message` aqui porque o tipo não a expõe
        alert('Falha na exportação do Services Registry.');
      }
    } catch (e: any) {
      alert(e?.message ?? 'Falha na exportação do Services Registry.');
    } finally {
      setExporting(false);
    }
  }, []);

  useEffect(() => {
    if (!onHeaderActionsChange) return;

    onHeaderActionsChange(
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleDownloadBackup}>
          Download Security JSON
        </Button>

        <Button
          variant="outline"
          onClick={handleExportRegistry}
          disabled={exporting}
          title="Escreve generated/services.registry.json para o scanner"
        >
          {exporting ? 'A exportar…' : 'Exportar Services Registry'}
        </Button>

        <Button onClick={() => setUndoOpen(true)}>
          Undo / Repor
        </Button>
      </div>
    );

    return () => onHeaderActionsChange(null);
  }, [onHeaderActionsChange, handleDownloadBackup, handleExportRegistry, exporting]);

  return (
    <>
      <SecurityIndex />
      <SecurityUndoModal open={undoOpen} onClose={() => setUndoOpen(false)} />
    </>
  );
}