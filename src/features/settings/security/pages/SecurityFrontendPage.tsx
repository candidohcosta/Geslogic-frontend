// frontend/src/features/settings/security/pages/SecurityFrontendPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsSectionCard } from '../../../../components/templates/SettingsSectionCard';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Label } from '../../../../components/ui/Label';
import {
  getPlatformSecuritySettings,
  getPlatformSecurityCatalog,
  importSecurityFromAuthz,
  type SecurityCatalogDto,
} from '../../../../services/api';
import AutocompleteInput from '../../../../components/ui/AutocompleteInput';
import type { SecuritySettingsDto, Rule, RuleEntry } from "./types";

/* =========================================================
   Helpers — deep clone, IDs estáveis, maps ⇄ listas, diff
========================================================= */
const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

let __rid = 0;
const genId = () => `r${Date.now().toString(36)}-${(__rid++).toString(36)}`;

const recordToList = (rec?: Record<string, Rule>): RuleEntry[] => {
  if (!rec) return [];
  const out: RuleEntry[] = [];
  for (const [k, r] of Object.entries(rec)) {
    out.push({ id: genId(), key: k, rule: r });
  }
  return out;
};

const listToRecord = (list: RuleEntry[]): Record<string, Rule> => {
  const out: Record<string, Rule> = {};
  for (const it of list) out[it.key] = it.rule;
  return out;
};

/** devolve apenas chaves novas/alteradas (merge-friendly para POST /security/import) */
const diffRules = (orig: Record<string, Rule> | undefined, cur: Record<string, Rule>) => {
  const out: Record<string, Rule> = {};
  const o = orig ?? {};
  for (const [k, v] of Object.entries(cur)) {
    if (!o[k] || JSON.stringify(o[k]) !== JSON.stringify(v)) out[k] = v;
  }
  return out;
};

/* =========================================================
   ChipsInput — chips com autocomplete leve para grants
========================================================= */
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
        {/* chips */}
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

        {/* sugestões (dropdown leve) */}
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

/* =========================================================
   RuleEditor — agora com CHIPS + autocomplete em requiredGrants
========================================================= */
function RuleEditor({
  rule,
  onChange,
  grantSuggestions,
}: {
  rule: Rule;
  onChange: (n: Rule) => void;
  grantSuggestions?: string[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* scope */}
      <div>
        <Label>Scope</Label>
        <select
          className="border rounded-md h-9 px-2 w-full"
          value={rule.scope ?? 'platform'}
          onChange={(e) => onChange({ ...rule, scope: e.target.value as any })}
        >
          <option value="platform">platform</option>
          <option value="company">company</option>
        </select>
      </div>

      {/* requiredRoles */}
      <div>
        <Label>requiredRoles (CSV)</Label>
        <Input
          value={(rule.requiredRoles ?? []).join(',')}
          onChange={(e) =>
            onChange({
              ...rule,
              requiredRoles: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="PLATFORM_ADMIN,COMPANY_ADMIN"
        />
      </div>

      {/* requiredGrants — CHIPS + autocomplete */}
      <div className="md:col-span-1">
        <ChipsInput
          label="requiredGrants"
          values={rule.requiredGrants ?? []}
          onChange={(vals) => onChange({ ...rule, requiredGrants: vals })}
          suggestions={grantSuggestions ?? []}
          placeholder="system:logs, queues:admin"
        />
      </div>

      {/* requireSubscribedService */}
      <div>
        <Label>requireSubscribedService</Label>
        <select
          className="border rounded-md h-9 px-2 w-full"
          value={rule.requireSubscribedService ?? ''}
          onChange={(e) =>
            onChange({
              ...rule,
              requireSubscribedService: (e.target.value || undefined) as any,
            })
          }
        >
          <option value="">(nenhum)</option>
          <option value="EVENTS">EVENTS</option>
          <option value="QUEUES">QUEUES</option>
          <option value="SCHEDULING">SCHEDULING</option>
        </select>
      </div>

      {/* deny */}
      <div className="md:col-span-2">
        <Label>deny (CSV)</Label>
        <Input
          value={(rule.deny ?? []).join(',')}
          onChange={(e) =>
            onChange({
              ...rule,
              deny: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="opcional"
        />
      </div>
    </div>
  );
}

/* =========================================================
   RuleItem — card colapsável (duplo‑clique) com AUTOCOMPLETE no Path
========================================================= */
function RuleItem({
  entryKey,
  value,
  onKeyChange,
  onChange,
  onRemove,
  defaultCollapsed = true,
  grantSuggestions,
  pathSuggestions,
}: {
  entryKey: string;
  value: Rule;
  onKeyChange: (k: string) => void;
  onChange: (r: Rule) => void;
  onRemove: () => void;
  defaultCollapsed?: boolean;
  grantSuggestions?: string[];
  pathSuggestions?: string[];
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const toggle = () => setCollapsed((c) => !c);

  return (
    <div className="border rounded-xl bg-white" onDoubleClick={toggle}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={toggle}
      >
        <span
          style={{
            display: 'inline-block',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 120ms ease',
          }}
        >
          ▶
        </span>
        <code className="text-sm text-gray-900 font-mono">{entryKey}</code>

        <div className="ml-auto">
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            Remover
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 pb-3 border-t">
          <div className="flex items-center gap-2 mb-3 w-full">
            <Label className="min-w-24">Path</Label>

            {/* 🔽 Autocomplete controlado a ocupar a linha toda */}
            <AutocompleteInput
              className="flex-1 w-full border rounded-md h-9 px-2"
              value={entryKey}
              onChange={onKeyChange}
              options={pathSuggestions ?? []}
              placeholder="/events/*"
            />
          </div>

          <RuleEditor
            rule={value}
            onChange={onChange}
            grantSuggestions={grantSuggestions}
          />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Página de Regras — Frontend
========================================================= */
export default function SecurityFrontendPage() {
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

  const catalogGrants = useMemo(() => {
    const set = new Set<string>();
    (catalogData?.services ?? []).forEach((svc) =>
      (svc.grants ?? []).forEach((g) => set.add(g)),
    );
    return Array.from(set).sort();
  }, [catalogData]);

  const catalogFrontendRoutes = useMemo(() => {
    const set = new Set<string>();
    (catalogData?.services ?? []).forEach((svc) =>
      (svc.frontendRoutes ?? []).forEach((p) => set.add(p)),
    );
    return Array.from(set).sort();
  }, [catalogData]);

  // Estado local
  const [form, setForm] = useState<SecuritySettingsDto | null>(null);
  const [frontendList, setFrontendList] = useState<RuleEntry[]>([]);
  const original = loaded;

  // Inicialização única (carrega form + lista com IDs estáveis)
  useEffect(() => {
    if (!isLoading && loaded) {
      const cloned = deepClone(loaded);
      setForm(cloned);
      setFrontendList(recordToList(cloned.frontend));
    }
  }, [isLoading, loaded]);

  const [frontendFilter, setFrontendFilter] = useState('');

  // Guardar apenas difs (POST /platform-settings/security/import)
  const saveFrontendMut = useMutation({
    mutationFn: async (diff: Record<string, Rule>) =>
      importSecurityFromAuthz({ frontend: diff }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings', 'security'] });
    },
  });

  // CRUD Frontend (atualiza form e lista preservando IDs)
  const addFrontendRule = () =>
    setForm((f) => {
      const cur = deepClone(f as SecuritySettingsDto);
      cur.frontend = cur.frontend ?? {};
      // cria uma nova key única
      let key = '/nova/rota';
      let i = 1;
      while (cur.frontend[key]) {
        i++;
        key = `/nova/rota-${i}`;
      }
      // atualiza form
      cur.frontend[key] = {
        scope: 'platform',
        requiredRoles: [],
        requiredGrants: [],
      };
      // atualiza lista mantendo IDs
      setFrontendList((prev) => [
        ...prev,
        {
          id: genId(),
          key,
          rule: { scope: 'platform', requiredRoles: [], requiredGrants: [] },
        },
      ]);
      return cur;
    });

  const updateFrontendKey = (oldKey: string, newKeyRaw: string) =>
    setForm((f) => {
      const newKey = newKeyRaw.trim() || oldKey;
      return setForm((f2) => {
        const cur = deepClone((f2 ?? f) as SecuritySettingsDto);
        const map = cur.frontend ?? {};
        if (newKey === oldKey) return cur;
        if (map[newKey]) return cur; // evita overwrite
        // move a regra
        map[newKey] = map[oldKey];
        delete map[oldKey];
        cur.frontend = map;
        // reflete na lista preservando id
        setFrontendList((prev) =>
          prev.map((it) => (it.key === oldKey ? { ...it, key: newKey } : it)),
        );
        return cur;
      }) as any;
    });

  const updateFrontendRule = (key: string, nextRule: Rule) =>
    setForm((f) => {
      const cur = deepClone(f as SecuritySettingsDto);
      const map = cur.frontend ?? {};
      map[key] = nextRule;
      cur.frontend = map;
      // reflete na lista preservando id
      setFrontendList((prev) =>
        prev.map((it) => (it.key === key ? { ...it, rule: nextRule } : it)),
      );
      return cur;
    });

  const removeFrontendRule = (key: string) =>
    setForm((f) => {
      const cur = deepClone(f as SecuritySettingsDto);
      const map = cur.frontend ?? {};
      delete map[key];
      cur.frontend = map;
      // remove da lista
      setFrontendList((prev) => prev.filter((x) => x.key !== key));
      return cur;
    });

  if (!form || isLoading) {
    return (
      <SettingsSectionCard
        accent
        title="Segurança — Frontend"
        description="A carregar políticas…"
      >
        <p className="text-sm text-gray-500">A carregar…</p>
      </SettingsSectionCard>
    );
  }

  return (
    <>
      <SettingsSectionCard
        accent
        title="Regras — Frontend (Paths)"
        description="Controla acesso a páginas/rotas (ex.: /logs, /events/*)."
      >
        {/* Barra de ações */}
        <div className="flex flex-wrap gap-2 justify-between mb-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filtrar por path (ex.: /logs)"
              value={frontendFilter}
              onChange={(e) => setFrontendFilter(e.target.value)}
              className="min-w-[18rem]"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Sugestões rápidas de adicionar a partir do catálogo */}
            <select
              className="border rounded-md h-9 px-2"
              value=""
              onChange={(e) => {
                const sel = e.target.value;
                if (!sel) return;
                setForm((f) => {
                  const cur = deepClone(f as SecuritySettingsDto);
                  const map = (cur.frontend = cur.frontend ?? {});
                  if (!map[sel]) {
                    map[sel] = {
                      scope: 'platform',
                      requiredRoles: [],
                      requiredGrants: [],
                    };
                    // reflete na lista preservando IDs dos já existentes
                    setFrontendList((prev) => {
                      if (prev.some((x) => x.key === sel)) return prev;
                      return [
                        ...prev,
                        {
                          id: genId(),
                          key: sel,
                          rule: {
                            scope: 'platform',
                            requiredRoles: [],
                            requiredGrants: [],
                          },
                        },
                      ];
                    });
                  }
                  return cur;
                });
              }}
            >
              <option value="">Sugestões (Catálogo)…</option>
              {catalogFrontendRoutes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <Button variant="outline" onClick={addFrontendRule}>
              + Adicionar
            </Button>
            <Button
              onClick={() => {
                const orig = original?.frontend ?? {};
                const cur = listToRecord(frontendList);
                const diff = diffRules(orig, cur);
                if (!Object.keys(diff).length) return;
                saveFrontendMut.mutate(diff);
              }}
              disabled={saveFrontendMut.isPending}
            >
              {saveFrontendMut.isPending ? 'A guardar…' : 'Guardar Frontend'}
            </Button>
          </div>
        </div>

        {/* Lista de regras (cards colapsáveis com AUTOCOMPLETE no Path) */}
        <div className="space-y-3">
          {frontendList
            .filter((e) =>
              e.key.toLowerCase().includes(frontendFilter.toLowerCase()),
            )
            .map((e) => (
              <RuleItem
                key={e.id}                      
                entryKey={e.key}
                value={e.rule}
                onKeyChange={(nextKey) => updateFrontendKey(e.key, nextKey)}
                onChange={(nextRule) => updateFrontendRule(e.key, nextRule)}
                onRemove={() => removeFrontendRule(e.key)}
                defaultCollapsed
                grantSuggestions={catalogGrants}
                pathSuggestions={catalogFrontendRoutes}
              />
            ))}

          {(!frontendList || frontendList.length === 0) && (
            <p className="text-sm text-gray-500">
              Ainda não existem regras para o frontend.
            </p>
          )}
        </div>
      </SettingsSectionCard>
    </>
  );
}