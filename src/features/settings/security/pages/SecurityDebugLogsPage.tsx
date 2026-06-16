// frontend/src/features/settings/security/pages/SecurityDebugLogsPage.tsx

import React, { useEffect, useState } from 'react';
import { Switch } from '../../../../components/ui/Switch';
import { Button } from '../../../../components/ui/Button';
import { Label } from '../../../../components/ui/Label';
import { SettingsSectionCard } from '../../../../components/templates/SettingsSectionCard';

import {
  getPlatformSecuritySettings,
  updatePlatformSecuritySettings,
} from '../../../../services/api';
import type { SecuritySettingsDto, DebugFlags } from './types';

 export default function SecurityDebugLogsPage() {
  const [debug, setDebug] = useState<DebugFlags>({
    match: false,
    rules: false,
    grants: false,
    deny: false,
    defaults: false,
    scope: false,
    service: false,
    finalDecision: false,
  }); 

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const settings: SecuritySettingsDto = await getPlatformSecuritySettings();
      const flags = settings.flags?.debugSecurity ?? {};
      setDebug({
        match: !!flags.match,
        rules: !!flags.rules,
        grants: !!flags.grants,
        deny: !!flags.deny,
        defaults: !!flags.defaults,
        scope: !!flags.scope,
        service: !!flags.service,
        finalDecision: !!flags.finalDecision,
      });
      setLoading(false);
    })();
  }, []);

  const updateField = (key: keyof DebugFlags, val: boolean) => {
    setDebug((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    const current: SecuritySettingsDto = await getPlatformSecuritySettings();

    const next = {
      ...current,
      flags: {
        ...(current.flags ?? {}),
        debugSecurity: debug,
      },
    };

    await updatePlatformSecuritySettings(next);
    setSaving(false);
  };

  if (loading) {
    return (
      <SettingsSectionCard title="Debug" description="Carregando definições…">
        <p className="text-sm text-gray-500">A carregar…</p>
      </SettingsSectionCard>
    );
  }

  return (
    <SettingsSectionCard
      accent
      title="Security Debug Logs"
      description="Controla categorias de logs do motor de segurança."
    >
      <div className="space-y-4">

        {Object.entries(debug).map(([key, val]) => (
          <div
            key={key}
            className="flex items-center justify-between border rounded-md bg-gray-50 p-2 px-3"
          >
            <span className="font-medium text-gray-700">
              {key}
            </span>

            <Switch
              checked={val}
              onCheckedChange={(v) => updateField(key as keyof DebugFlags, v)}
            />
          </div>
        ))}

        <div className="mt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "A guardar…" : "Guardar Definições"}
          </Button>
        </div>
      </div>
    </SettingsSectionCard>
  );
}