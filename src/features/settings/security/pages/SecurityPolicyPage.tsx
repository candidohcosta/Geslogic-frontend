// frontend/src/features/settings/security/pages/SecurityPolicyPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsSectionCard } from '../../../../components/templates/SettingsSectionCard';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Label } from '../../../../components/ui/Label';
import { Switch } from '../../../../components/ui/Switch';
import {
  getPlatformSecuritySettings,
  getPlatformSecurityCatalog,
  updatePlatformSecuritySettings,
  type SecurityCatalogDto,
  getAllRoles,
} from '../../../../services/api';
import type { SecuritySettingsDto, Rule, ScopeRules } from "./types";

/* =========================================================
   Helpers & UI leves
========================================================= */
const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

function ChipsInput({
  label,
  values,
  onChange,
  suggestions = [],
  placeholder,
}: {
  label?: string;
  values: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = (v: string) => {
    const val = v.trim();
    if (!val) return;
    if (!values.includes(val)) onChange([...values, val]);
    setDraft('');
  };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  const filtered = useMemo(() => {
    const t = draft.trim().toLowerCase();
    if (!t) return suggestions.slice(0, 8);
    return suggestions.filter((s) => s.toLowerCase().includes(t)).slice(0, 8);
  }, [draft, suggestions]);

  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="border rounded-md p-2">
        <div className="flex flex-wrap gap-1 mb-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 text-sm bg-gray-100 border rounded px-2 py-0.5"
            >
              {v}
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => remove(v)}
                aria-label={`Remover ${v}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="min-w-[10rem] flex-1 outline-none px-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add(draft);
              } else if (e.key === 'Backspace' && !draft && values.length > 0) {
                onChange(values.slice(0, -1));
              }
            }}
            placeholder={placeholder}
          />
        </div>
        {filtered.length > 0 && (
          <div className="border-t pt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-auto">
            {filtered.map((s) => (
              <button
                key={s}
                className="text-left text-sm px-2 py-1 rounded hover:bg-gray-50 border"
                onClick={() => add(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RuleBox({
  title,
  rule,
  onChange,
  roleSuggestions,
  grantSuggestions,
}: {
  title: string;
  rule: Rule | undefined;
  onChange: (r: Rule) => void;
  roleSuggestions: string[];
  grantSuggestions: string[];
}) {
  const r = rule ?? {};
  return (
    <div className="border rounded-md p-3 space-y-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <ChipsInput
            label="requiredRoles"
            values={r.requiredRoles ?? []}
            onChange={(vals) => onChange({ ...r, requiredRoles: vals })}
            suggestions={roleSuggestions}
            placeholder="PLATFORM_ADMIN, COMPANY_ADMIN"
          />
        </div>
        <div>
          <ChipsInput
            label="requiredGrants"
            values={r.requiredGrants ?? []}
            onChange={(vals) => onChange({ ...r, requiredGrants: vals })}
            suggestions={grantSuggestions}
            placeholder="platform:settings, companies:access"
          />
        </div>
        <div className="text-xs text-gray-500 flex items-center">
          Podes usar roles **ou** grants (ou ambos). A regra final exige o que definires aqui +
          qualquer regra específica do endpoint (se existir).
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Página Política Global (scopeRules)
========================================================= */
export default function SecurityPolicyPage() {
  const qc = useQueryClient();

  // Carregar settings
  const { data: loaded, isLoading } = useQuery({
    queryKey: ['platform-settings', 'security'],
    queryFn: getPlatformSecuritySettings,
    staleTime: 10_000,
  });

  // Catálogo (para sugestões)
  const { data: catalogData } = useQuery<SecurityCatalogDto>({
    queryKey: ['platform-settings', 'security-catalog'],
    queryFn: getPlatformSecurityCatalog,
    staleTime: 10_000,
  });

const { data: rolesData } = useQuery({
  queryKey: ['roles'],
  queryFn: getAllRoles,
  staleTime: 10000,
});

const roleSuggestions = useMemo(() => {
  if (!rolesData) return [];
  return rolesData.map(r => r.name);
}, [rolesData]);

  const grantSuggestions: string[] = useMemo(() => {
    const set = new Set<string>();
    (catalogData?.services ?? []).forEach((svc) =>
      (svc.grants ?? []).forEach((g) => set.add(g)),
    );
    return Array.from(set).sort();
  }, [catalogData]);

  const [form, setForm] = useState<SecuritySettingsDto | null>(null);

  useEffect(() => {
    if (!isLoading && loaded) setForm(deepClone(loaded));
  }, [isLoading, loaded]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error('Sem dados');
      // ⚠️ PATCH deve incluir "defaults" (DTO exige)
      const payload: Partial<SecuritySettingsDto> = {
        defaults: form.defaults,
        policy: form.policy ?? {},
      };
      return updatePlatformSecuritySettings(payload as SecuritySettingsDto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings', 'security'] });
    },
  });

  if (!form || isLoading) {
    return (
      <SettingsSectionCard
        accent
        title="Política Global (scopeRules)"
        description="A carregar…"
      >
        <p className="text-sm text-gray-500">A carregar…</p>
      </SettingsSectionCard>
    );
  }

  const sr: ScopeRules = form.policy?.scopeRules ?? {};

  const setScopeRule = (which: 'platform' | 'company', next: Rule) =>
    setForm((f) => {
      const cur = deepClone(f!);
      cur.policy = cur.policy ?? {};
      cur.policy.scopeRules = cur.policy.scopeRules ?? {};
      cur.policy.scopeRules[which] = next;
      return cur;
    });

  const setSubscriptions = (on: boolean) =>
    setForm((f) => {
      const cur = deepClone(f!);
      cur.policy = cur.policy ?? {};
      cur.policy.scopeRules = cur.policy.scopeRules ?? {};
      cur.policy.scopeRules.subscriptions = { requireSubscribedService: on };
      return cur;
    });

  return (
    <>
      <SettingsSectionCard
        accent
        title="Política Global (scopeRules)"
        description="Regras globais por scope + validação de subscrições."
      >
        {/* Estado do motor (read-only) */}
        <div className="mb-3 border rounded-md p-3 bg-gray-50">
          <div className="text-sm">
            <span className="font-medium">Motor de Políticas:</span>{' '}
            <span className="inline-block px-2 py-0.5 rounded bg-gray-200">
              {form.flags?.usePolicyEngine ? 'ON (configurado nos settings)' : 'OFF (configurado nos settings)'}
            </span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            * O guard lê primeiro a variável de ambiente <code>SECURITY_USE_POLICY_ENGINE</code>.  
            Se definida, tem prioridade (read‑only aqui). A UI mostra o estado gravado, mas a ativação é por código/ENV.
          </div>
        </div>

        {/* PLATFORM */}
        <RuleBox
          title="Regra global: scope = platform"
          rule={sr.platform}
          onChange={(next) => setScopeRule('platform', next)}
          roleSuggestions={roleSuggestions}
          grantSuggestions={grantSuggestions}
        />

        {/* COMPANY */}
        <div className="mt-4">
          <RuleBox
            title="Regra global: scope = company"
            rule={sr.company}
            onChange={(next) => setScopeRule('company', next)}
            roleSuggestions={roleSuggestions}
            grantSuggestions={grantSuggestions}
          />
        </div>

        {/* SUBSCRIÇÕES */}
        <div className="mt-4 border rounded-md p-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={!!sr.subscriptions?.requireSubscribedService}
              onCheckedChange={(v) => setSubscriptions(!!v)}
            />
            <Label>Validar subscrições (requireSubscribedService:XYZ no Catálogo)</Label>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Se ativo, endpoints de serviços com condição
            {' '}
            <code>requireSubscribedService:EVENTS|QUEUES|SCHEDULING</code>
            {' '}
            só são acessíveis a empresas com a subscrição correspondente.
          </div>
        </div>

        {/* Ações */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
          >
            {saveMut.isPending ? 'A guardar…' : 'Guardar Política Global'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setForm(deepClone(loaded!))}
            disabled={saveMut.isPending}
          >
            Repor
          </Button>
        </div>
      </SettingsSectionCard>
    </>
  );
}