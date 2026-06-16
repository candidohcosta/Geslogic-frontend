// frontend/src/features/settings/security/pages/SecurityBackendRules.tsx

import React, { useState } from 'react';
import { SettingsSectionCard } from '../../../../components/templates/SettingsSectionCard';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Label } from '../../../../components/ui/Label';
import AutocompleteInput from '../../../../components/ui/AutocompleteInput';

import type { Rule, RuleEntry, SecuritySettingsDto } from './types';
import { deepClone, listToRecord, genId } from './utils';
import ChipsInput from '../../../../components/ui/ChipsInputModern';

import { confirmDialog } from '../../../../components/system/confirmDialog';

type Props = {
  form: SecuritySettingsDto;
  setForm: React.Dispatch<React.SetStateAction<SecuritySettingsDto | null>>;

  backendList: RuleEntry[];
  setBackendList: React.Dispatch<React.SetStateAction<RuleEntry[]>>;

  rolesList: string[];
  catalogBackendEndpoints: string[];
  catalogGrants: string[];

  saveBackendMut: any;

  originalBackend: Record<string, Rule>;
  setOriginalBackend: (rec: Record<string, Rule>) => void;
};

function methodColor(method: string) {
  switch (method) {
    case 'GET': return '#16a34a';
    case 'POST': return '#2563eb';
    case 'PUT': return '#a855f7';
    case 'PATCH': return '#d97706';
    case 'DELETE': return '#dc2626';
    default: return '#334155';
  }
}

export default function SecurityBackendRules({
  form,
  setForm,
  backendList,
  setBackendList,
  rolesList,
  catalogBackendEndpoints,
  catalogGrants,
  saveBackendMut,
  originalBackend,
  setOriginalBackend,
}: Props) {

  const [backendFilter, setBackendFilter] = useState('');

  /* ----------------------------------------------------------
     Sync backendList → form.backend
  ----------------------------------------------------------- */
  const syncFormBackend = (updated: RuleEntry[]) => {
    setBackendList(updated);
    setForm((f) => {
      const cur = deepClone(f!);
      cur.backend = listToRecord(updated);
      return cur;
    });
  };

  /* ----------------------------------------------------------
     ADICIONAR REGRA (aberta + scroll)
  ----------------------------------------------------------- */
  const addBackendRule = () => {
    const key = `GET /nova-rota-${Date.now()}`;
    const id = genId();

    const newRule: Rule = {
      scope: 'platform',
      requiredRoles: [],
      requiredGrants: [],
    };

    const newEntry: RuleEntry = {
      id,
      key,
      rule: newRule,
      __collapsed: false,
      __isNew: true,
    };

    const updated = [...backendList, newEntry];
    syncFormBackend(updated);

    setTimeout(() => {
      const el = document.getElementById(`rule-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  /* ----------------------------------------------------------
     REMOVER REGRA (com ConfirmModalPortal)
  ----------------------------------------------------------- */
  const removeRule = async (key: string) => {

    const ok = await confirmDialog({
      title: "Remover Regra",
      message: `Tem a certeza que deseja remover a regra "${key}"?`,
      confirmText: "Remover",
      cancelText: "Cancelar",
    });

    if (!ok) return;

    const updated = backendList.filter((e) => e.key !== key);
    syncFormBackend(updated);

    const fullRecord = listToRecord(updated);

    // 🔥 MUTATE FINAL: sempre envia backend completo
    saveBackendMut.mutate({ backend: fullRecord }, {
      onSuccess() {
        setOriginalBackend(fullRecord);
      }
    });
  };

  /* ----------------------------------------------------------
     CANCELAR (repor valores originais)
  ----------------------------------------------------------- */
  const cancelRule = (entry: RuleEntry) => {

    if (entry.__isNew) {
      syncFormBackend(backendList.filter((e) => e.id !== entry.id));
      return;
    }

    const orig = originalBackend[entry.key];
    if (!orig) return;

    const updated = backendList.map((e) =>
      e.id === entry.id
        ? {
            ...e,
            rule: deepClone(orig),
            __collapsed: true,
            __isNew: false,
          }
        : e
    );

    syncFormBackend(updated);
  };

  /* ----------------------------------------------------------
     GUARDAR REGRA (modelo B → sempre guarda o backend todo)
  ----------------------------------------------------------- */
  const saveSingleRule = (entry: RuleEntry) => {
    const fullRecord = listToRecord(backendList);

    saveBackendMut.mutate({ backend: fullRecord }, {
      onSuccess() {
        setOriginalBackend(fullRecord);

        entry.__isNew = false;
        entry.__collapsed = true;

        setBackendList([...backendList]);
      }
    });
  };

  /* ----------------------------------------------------------
     UPDATE RULE FIELDS
  ----------------------------------------------------------- */
  const updateRule = (key: string, updatedRule: Rule) => {
    const updated = backendList.map((e) =>
      e.key === key ? { ...e, rule: updatedRule } : e
    );

    syncFormBackend(updated);
  };

  /* ==========================================================
     RENDER
  ========================================================== */
  return (
    <SettingsSectionCard
      accent
      title="Regras — Backend"
      description="Cada regra controla um conjunto de endpoints."
    >
      {/* HEADER */}
      <div className="flex flex-wrap gap-2 justify-between mb-4">
        <Input
          placeholder="Filtrar assinatura (ex: GET /logs)"
          value={backendFilter}
          onChange={(e) => setBackendFilter(e.target.value)}
          className="min-w-[18rem]"
        />

        <Button variant="outline" onClick={addBackendRule}>
          + Adicionar Regra
        </Button>
      </div>

      {/* LISTA */}
      <div className="space-y-4">
        {backendList
          .filter((e) => e.key.toLowerCase().includes(backendFilter.toLowerCase()))
          .sort((a, b) => a.key.localeCompare(b.key))
          .map((entry) => {
            const { id, key, rule, __collapsed } = entry;

            const method = key.split(' ')[0]?.toUpperCase();
            const color = methodColor(method);

            return (
              <div
                key={id}
                id={`rule-${id}`}
                className="border bg-white rounded-xl shadow-sm" style={{ padding: 0, paddingLeft: 10, paddingRight: 10 }}> 
                              {/* p-3 padding do card colapsado */}

                {/* CARD HEADER */}
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => {
                    entry.__collapsed = !entry.__collapsed;
                    setBackendList([...backendList]);
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      transform: __collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                      transition: 'transform 100ms ease',
                    }}
                  >
                    ▶
                  </span>

                  <span
                    style={{
                      minWidth: 40,
                      padding: '2px 8px',
                      color: '#fff',
                      background: color,
                      borderRadius: 8,
                      fontFamily: 'ui-monospace',
                      fontSize: 12,
                    }}
                  >
                    {method}
                  </span>

                  <code className="font-mono text-gray-900" style={{ paddingLeft: 5 }}>
                    {key}
                  </code>

                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRule(key);
                    }}
                  >
                    Remover
                  </Button>
                </div>

                {/* CARD BODY */}
                {!__collapsed && (
                  <div className="pt-4 mt-3 border-t space-y-4">

                    {/* Assinatura */}
                    <div>
                      <Label>Assinatura</Label>
                      <AutocompleteInput
                        className="border rounded-md h-9 px-2 w-full"
                        value={key}
                        options={catalogBackendEndpoints}
                        onChange={(v) => {
                          const trimmed = v.trim();
                          if (!trimmed) return;

                          syncFormBackend(
                            backendList.map((e) =>
                              e.id === id ? { ...e, key: trimmed } : e
                            )
                          );
                        }}
                      />
                    </div>

                    {/* Scope + Serviço */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      <div>
                        <Label>Scope</Label>
                        <select
                          className="border rounded-md h-9 px-2 w-full"
                          value={rule.scope ?? 'platform'}
                          onChange={(e) =>
                            updateRule(key, { ...rule, scope: e.target.value as any })
                          }
                        >
                          <option value="platform">platform</option>
                          <option value="company">company</option>
                        </select>
                      </div>

                      <div>
                        <Label>Serviço (subscrição)</Label>
                        <select
                          className="border rounded-md h-9 px-2 w-full"
                          value={rule.requireSubscribedService ?? ''}
                          onChange={(e) =>
                            updateRule(key, {
                              ...rule,
                              requireSubscribedService:
                                (e.target.value || undefined) as any,
                            })
                          }
                        >
                          <option value="">(nenhum)</option>
                          <option value="EVENTS">EVENTS</option>
                          <option value="QUEUES">QUEUES</option>
                          <option value="SCHEDULING">SCHEDULING</option>
                        </select>
                      </div>
                    </div>

                    {/* Roles */}
                    <ChipsInput
                      label="requiredRoles"
                      values={rule.requiredRoles ?? []}
                      onChange={(vals) =>
                        updateRule(key, { ...rule, requiredRoles: vals })
                      }
                      suggestions={rolesList}
                    />

                    {/* Grants */}
                    <ChipsInput
                      label="requiredGrants"
                      values={rule.requiredGrants ?? []}
                      onChange={(vals) =>
                        updateRule(key, { ...rule, requiredGrants: vals })
                      }
                      suggestions={catalogGrants}
                    />

                    {/* Deny */}
                    <ChipsInput
                      label="deny"
                      values={rule.deny ?? []}
                      onChange={(vals) =>
                        updateRule(key, { ...rule, deny: vals })
                      }
                    />

                    {/* BUTTONS */}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => saveSingleRule(entry)}>
                        {saveBackendMut.isPending ? "A guardar…" : "Guardar Regra"}
                      </Button>

                      <Button variant="outline" onClick={() => cancelRule(entry)}>
                        Cancelar
                      </Button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}

        {backendList.length === 0 && (
          <p className="text-sm text-gray-500">Ainda não existem regras.</p>
        )}
      </div>
    </SettingsSectionCard>
  );
}