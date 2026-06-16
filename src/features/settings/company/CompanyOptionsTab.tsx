import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Button } from '../../../components/ui/Button';
import { Loader2 } from 'lucide-react';
import { getCompanyOptions, putCompanyOptions } from '../../../services/api';

type Props = { onHeaderActionsChange?: (actions: React.ReactNode) => void };

/**
 * Para desenvolvimento, oferecemos uma edição em JSON (textarea).
 * Mais tarde podes substituir por editores de listas (chips, add/remove).
 */
export default function CompanyOptionsTab({ onHeaderActionsChange }: Props) {
  const qc = useQueryClient();
  const { data: optionsData, isLoading } = useQuery({
    queryKey: ['platform-settings', 'company-options'],
    queryFn: getCompanyOptions,
  });

  const [optionsJson, setOptionsJson] = useState<string>('');
  const [parseError, setParseError] = useState<string>('');

  useEffect(() => {
    if (!isLoading) setOptionsJson(JSON.stringify(optionsData ?? {}, null, 2));
  }, [isLoading, optionsData]);

  const saving = useMutation({
    mutationFn: async () => {
      // valida JSON
      try {
        const parsed = JSON.parse(optionsJson);
        setParseError('');
        return await putCompanyOptions(parsed);
      } catch (e: any) {
        setParseError(e?.message || 'JSON inválido');
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings', 'company-options'] }),
  });

  const dirty = optionsJson !== JSON.stringify(optionsData ?? {}, null, 2);

  useEffect(() => {
    onHeaderActionsChange?.(
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setOptionsJson(JSON.stringify(optionsData ?? {}, null, 2))} disabled={!dirty || saving.isPending}>
          Repor
        </Button>
        <Button onClick={() => saving.mutate()} disabled={!dirty || saving.isPending || !!parseError}>
          {saving.isPending ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> A guardar…</>) : 'Guardar'}
        </Button>
      </div>
    );
  }, [dirty, saving.isPending, optionsJson, optionsData, parseError]);

  if (isLoading) {
    return (
      <SettingsSectionCard accent title="Opções das Empresas" description="Catálogo global de opções exibidas nas páginas de settings de empresa.">
        <div className="text-sm text-gray-500">A carregar…</div>
      </SettingsSectionCard>
    );
  }

  return (
    <SettingsSectionCard
      accent
      title="Opções das Empresas (catálogo global)"
      description="Edite as opções (listas) usadas pelos CompanyAdmins. Ex.: support.accessMode, correspondence.numberingSchemes."
    >
      <textarea
        className="w-full h-80 font-mono text-sm rounded border p-3"
        value={optionsJson}
        onChange={(e) => setOptionsJson(e.target.value)}
      />
      {parseError && <p className="text-xs text-red-600 mt-1">{parseError}</p>}
      {!parseError && <p className="text-xs text-gray-500 mt-1">Dica: mantenha as chaves consistentes com os consumidores do FE/BE.</p>}
    </SettingsSectionCard>
  );
}