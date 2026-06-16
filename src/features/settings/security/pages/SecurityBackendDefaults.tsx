// frontend/src/features/settings/security/pages/SecurityBackendDefaults.tsx

import React from 'react';
import { SettingsSectionCard } from '../../../../components/templates/SettingsSectionCard';
import { Switch } from '../../../../components/ui/Switch';
import { Button } from '../../../../components/ui/Button';
import { Label } from '../../../../components/ui/Label';

import type { SecuritySettingsDto } from './types';

type Props = {
  form: SecuritySettingsDto;
  setForm: React.Dispatch<React.SetStateAction<SecuritySettingsDto | null>>;
  rolesList: string[];
  saveDefaultsMut: any;
};

export default function SecurityBackendDefaults({
  form,
  setForm,
  rolesList,
  saveDefaultsMut,
}: Props) {

    const [open, setOpen] = React.useState(false);

    const toggleDefaultAllow = (next: boolean) =>
        setForm((f) => ({
        ...(f as SecuritySettingsDto),
        defaults: { allowIfNotMatched: next },
        }));

    const setRoleAllowDefault = (role: string, next: boolean) =>
        setForm((f) => {
        const cur = f as SecuritySettingsDto;
        const roles = { ...(cur.roles ?? {}) };
        roles[role] = { ...(roles[role] ?? {}), allowIfNotMatched: next };
        return { ...cur, roles };
        });

    return (
    <SettingsSectionCard
        accent
        title={
        <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setOpen(o => !o)}
        >
            <span
            className="text-gray-600"
            style={{
                display: "inline-block",
                transform: open ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 120ms ease",
            }}
            >
            ▶
            </span>
            Defaults
        </div>
        }
        description="Fallback global e fallback por role real."
    >
        {open && (
        <div className="mt-4 space-y-6">
            {/* GLOBAL */}
            <div className="flex items-center gap-3">
            <Switch
                checked={!!form.defaults?.allowIfNotMatched}
                onCheckedChange={(v) => toggleDefaultAllow(v)}
            />
            <Label className="text-base">Permitir se não existir regra (global)</Label>
            </div>

            {/* FALLBACK POR ROLE — PILL */}
            <div className="border rounded-md p-3 space-y-3 bg-gray-50">
            <Label className="text-sm text-gray-600">
                Fallback por Role (dinâmico — baseado nos roles reais da BD)
            </Label>

            <div className="flex flex-wrap gap-2">

                {rolesList.map((roleName) => {
const cur = form.roles?.[roleName]?.allowIfNotMatched ?? false;

                return (
                    <div
                    key={roleName}
                    className="
                        inline-flex items-center gap-2 
                        px-3 py-1.5 rounded-full border 
                        bg-white hover:bg-gray-100 
                        transition-colors shadow-sm
                    "
                    >
                    <Switch
                        checked={!!cur}
                        onCheckedChange={(v) => setRoleAllowDefault(roleName, v)}
                    />

                    <span className="text-sm font-medium text-gray-800 whitespace-nowrap">
                        {roleName}
                    </span>
                    </div>
                );
                })}

            </div>
            </div>

            <div>
            <Button
                onClick={() =>
                saveDefaultsMut.mutate({
                    defaults: form.defaults,
                    roles: form.roles ?? {},
                })
                }
                disabled={saveDefaultsMut.isPending}
            >
                {saveDefaultsMut.isPending ? 'A guardar…' : 'Guardar Defaults'}
            </Button>
            </div>
        </div>
        )}
    </SettingsSectionCard>
    );
}