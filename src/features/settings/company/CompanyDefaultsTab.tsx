// frontend/src/features/settings/company/CompanyDefaultsTab.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Label } from '../../../components/ui/Label';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Loader2 } from 'lucide-react';

// 👉 usa os serviços que falámos (assumindo ficheiro src/services/api.company-settings.ts)
import {
  getCompanyDefaults,
  putCompanyDefaults,
  getCompanyOptions,
} from '../../../services/api';

type Props = { onHeaderActionsChange?: (actions: React.ReactNode) => void };

export default function CompanyDefaultsTab({ onHeaderActionsChange }: Props) {
  const qc = useQueryClient();

  const { data: defaultsData, isLoading: loadingDefaults } = useQuery({
    queryKey: ['platform-settings', 'company-defaults'],
    queryFn: getCompanyDefaults,
  });

  const { data: optionsData, isLoading: loadingOptions } = useQuery({
    queryKey: ['platform-settings', 'company-options'],
    queryFn: getCompanyOptions,
  });

  const [defaults, setDefaults] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!loadingDefaults) setDefaults(defaultsData ?? {});
  }, [loadingDefaults, defaultsData]);

  const saving = useMutation({
    mutationFn: async () => putCompanyDefaults(defaults),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings', 'company-defaults'] });
    },
  });

  const loading = loadingDefaults || loadingOptions;
  const dirty = JSON.stringify(defaults) !== JSON.stringify(defaultsData ?? {});

  useEffect(() => {
    onHeaderActionsChange?.(
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setDefaults(defaultsData ?? {})} disabled={!dirty || saving.isPending}>
          Repor
        </Button>
        <Button onClick={() => saving.mutate()} disabled={!dirty || saving.isPending}>
          {saving.isPending ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> A guardar…</>) : 'Guardar'}
        </Button>
      </div>
    );
  }, [dirty, saving.isPending, defaults, defaultsData]);

  if (loading) {
    return (
      <SettingsSectionCard accent title="Defaults de Empresa" description="Valores iniciais que serão aplicados às empresas (deep‑merge).">
        <div className="text-sm text-gray-500">A carregar…</div>
      </SettingsSectionCard>
    );
  }

  const accessModes: string[] = optionsData?.support?.accessMode ?? ['temporary', 'full'];
  const numberingSchemes: string[] = optionsData?.correspondence?.numberingSchemes ?? [];

  return (
    <div className="space-y-6">
      {/* Support */}
      <SettingsSectionCard accent title="Suporte" description="Modo de suporte por defeito aplicado às empresas.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Modo de Suporte</Label>
            <select
              className="h-9 rounded border px-2"
              value={defaults?.support?.accessMode ?? ''}
              onChange={(e) =>
                setDefaults((prev) => ({
                  ...prev,
                  support: { ...(prev.support ?? {}), accessMode: e.target.value },
                }))
              }
            >
              {accessModes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>TTL (min)</Label>
            <Input
              type="number"
              value={defaults?.support?.defaultTtlMinutes ?? 30}
              onChange={(e) =>
                setDefaults((prev) => ({
                  ...prev,
                  support: { ...(prev.support ?? {}), defaultTtlMinutes: Number(e.target.value) || 0 },
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Notificar CompanyAdmin</Label>
            <select
              className="h-9 rounded border px-2"
              value={String(defaults?.support?.notifyCompanyAdmin ?? true)}
              onChange={(e) =>
                setDefaults((prev) => ({
                  ...prev,
                  support: { ...(prev.support ?? {}), notifyCompanyAdmin: e.target.value === 'true' },
                }))
              }
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
        </div>
      </SettingsSectionCard>

      {/* Correspondence */}
      <SettingsSectionCard accent title="Correspondência" description="Defaults do DMS aplicados às empresas.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Esquema de Numeração (default)</Label>
            <select
              className="h-9 rounded border px-2"
              value={defaults?.correspondence?.defaults?.numberingScheme ?? ''}
              onChange={(e) =>
                setDefaults((prev) => ({
                  ...prev,
                  correspondence: {
                    ...(prev.correspondence ?? {}),
                    defaults: { ...((prev.correspondence ?? {}).defaults ?? {}), numberingScheme: e.target.value },
                  },
                }))
              }
            >
              <option value="" disabled>Selecionar…</option>
              {numberingSchemes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </SettingsSectionCard>
    </div>
  );
}