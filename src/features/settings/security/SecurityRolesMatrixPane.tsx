// src/features/settings/security/SecurityRolesMatrixPane.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPlatformSecuritySettings,
  updatePlatformSecuritySettings,
  getPlatformSecurityCatalog,
  type SecurityCatalogDto,
  type SecuritySettingsDto, // garante grantsMatrix?: Record<string, string[]>
  getAllRoles,
} from '../../../services/api';

import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Switch } from '../../../components/ui/Switch';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  CheckSquare,
  MinusSquare,
  Square,
  Upload,
  Download,
} from 'lucide-react';

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
const sortAsc = (arr: string[]) => [...arr].sort((a, b) => a.localeCompare(b));

type ServiceGroup = {
  id: string;
  name: string;
  grants: string[];
};

// LocalStorage keys
const LS_COLLAPSE = 'gl_sec_matrix_collapsed_v4';
const LS_FILTERS = 'gl_sec_matrix_filters_v1';
const LS_SELECTED_ROLE = 'gl_sec_matrix_selected_role_v1';

// Paleta “Azure-like”
const brand = {
  blue: 'text-blue-600',
  blueBg: 'bg-blue-600',
  blueBorder: 'border-blue-600',
};

export default function SecurityRolesMatrixPane() {
  const qc = useQueryClient();

  // ====== Data sources ======
  const { data: security, isLoading: isLoadingSec } = useQuery<SecuritySettingsDto>({
    queryKey: ['platform-settings', 'security'],
    queryFn: getPlatformSecuritySettings,
    staleTime: 10_000,
  });

  const { data: catalog, isLoading: isLoadingCat } = useQuery<SecurityCatalogDto>({
    queryKey: ['platform-settings', 'security-catalog'],
    queryFn: getPlatformSecurityCatalog,
    staleTime: 10_000,
  });


  const { data: rolesDb } = useQuery({
    queryKey: ['roles'],
    queryFn: getAllRoles,
    staleTime: 10_000,
  });


  // ====== Roles  ======

const rolesAll = useMemo(() => {
  if (!rolesDb) return [];
  return sortAsc(rolesDb.map(r => r.name));
}, [rolesDb]);


  // ====== Catálogo → grupos por serviço ======
  const serviceGroups = useMemo<ServiceGroup[]>(() => {
    const services = catalog?.services ?? [];
    const grantOwner = new Map<string, string>();
    const idToName = new Map<string, string>();
    for (const s of services) {
      idToName.set(s.id, s.name);
      for (const g of s.grants ?? []) {
        if (!grantOwner.has(g)) grantOwner.set(g, s.id);
      }
    }
    const allGrants = uniq(services.flatMap(s => s.grants ?? []));
    const byService = new Map<string, ServiceGroup>();
    for (const g of allGrants) {
      const sid = grantOwner.get(g) ?? '__OTHER__';
      const name = sid === '__OTHER__' ? 'Outros (sem serviço definido)' : (idToName.get(sid) ?? sid);
      const group = byService.get(sid) ?? { id: sid, name, grants: [] };
      group.grants.push(g);
      byService.set(sid, group);
    }
    const arr = Array.from(byService.values());
    arr.sort((a, b) => a.name.localeCompare(b.name));
    arr.forEach(gr => (gr.grants = sortAsc(uniq(gr.grants))));
    return arr;
  }, [catalog]);

  const catalogAllGrants = useMemo(() => serviceGroups.flatMap(s => s.grants), [serviceGroups]);

  // ====== Estado local (edição) ======
  const [localGrantsMatrix, setLocalGrantsMatrix] = useState<Record<string, string[]> | null>(null);
  const grantsMatrix = useMemo(() => localGrantsMatrix ?? (security?.grantsMatrix ?? {}), [security, localGrantsMatrix]);

  // ====== Filtros / seleção / colapsos — com persistência LS ======
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [search, setSearch] = useState('');
  const [onlyDirty, setOnlyDirty] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Load persisted states
  useEffect(() => {
    try {
      const rawC = localStorage.getItem(LS_COLLAPSE);
      if (rawC) {
        const parsed = JSON.parse(rawC);
        if (parsed && typeof parsed === 'object') setCollapsedGroups(parsed);
      }
      const rawF = localStorage.getItem(LS_FILTERS);
      if (rawF) {
        const parsed = JSON.parse(rawF);
        if (parsed && typeof parsed === 'object') {
          setSearch(typeof parsed.search === 'string' ? parsed.search : '');
          setOnlyDirty(!!parsed.onlyDirty);
        }
      }
      const rawR = localStorage.getItem(LS_SELECTED_ROLE);
      if (rawR && typeof rawR === 'string') setSelectedRole(rawR);
    } catch {}
  }, []);

  // Sync persistence
  useEffect(() => {
    try {
      localStorage.setItem(LS_COLLAPSE, JSON.stringify(collapsedGroups));
    } catch {}
  }, [collapsedGroups]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_FILTERS, JSON.stringify({ search, onlyDirty }));
    } catch {}
  }, [search, onlyDirty]);

  useEffect(() => {
    if (!selectedRole) return;
    try {
      localStorage.setItem(LS_SELECTED_ROLE, selectedRole);
    } catch {}
  }, [selectedRole]);

  // Ajustar selectedRole quando lista muda
useEffect(() => {
  if (!rolesAll.length) return;
  if (!selectedRole || !rolesAll.includes(selectedRole)) {
    setSelectedRole(rolesAll[0]);
  }
}, [rolesAll]);

  // ====== Dirty check ======
  const dirty = useMemo(() => {
    if (!security) return false;
    const a = JSON.stringify(security.grantsMatrix ?? {});
    const b = JSON.stringify(localGrantsMatrix ?? security.grantsMatrix ?? {});
    return a !== b;
  }, [security, localGrantsMatrix]);

  // ====== Helpers (mutação) ======
  const toggleOne = useCallback((grant: string) => {
    if (!selectedRole) return;
    setLocalGrantsMatrix(prev => {
      const m = { ...(prev ?? grantsMatrix) };
      const set = new Set<string>(m[selectedRole] ?? []);
      if (set.has(grant)) set.delete(grant); else set.add(grant);
      m[selectedRole] = Array.from(set);
      return m;
    });
  }, [grantsMatrix, selectedRole]);

  const setMany = useCallback((grants: string[], next: boolean) => {
    if (!selectedRole) return;
    setLocalGrantsMatrix(prev => {
      const m = { ...(prev ?? grantsMatrix) };
      const set = new Set<string>(m[selectedRole] ?? []);
      for (const g of grants) { if (next) set.add(g); else set.delete(g); }
      m[selectedRole] = Array.from(set);
      return m;
    });
  }, [grantsMatrix, selectedRole]);

  // ====== Visible grants calculados (respeita filtros) ======
  const visibleByService = useMemo(() => {
    const out: Record<string, string[]> = {};
    if (!selectedRole) return out;

    const matchesSearch = (g: string) => !search.trim() || g.toLowerCase().includes(search.trim().toLowerCase());

    const isDirtyGrant = (g: string) => {
      if (!security) return false;
      const prevHas = new Set(security.grantsMatrix?.[selectedRole] ?? []).has(g);
      const curHas = new Set(grantsMatrix[selectedRole] ?? []).has(g);
      return prevHas !== curHas;
    };

    for (const svc of serviceGroups) {
      if (collapsedGroups[svc.id]) continue;
      const filtered = svc.grants.filter(matchesSearch).filter(g => (onlyDirty ? isDirtyGrant(g) : true));
      if (filtered.length > 0) out[svc.id] = filtered;
    }
    return out;
  }, [serviceGroups, collapsedGroups, search, onlyDirty, selectedRole, security, grantsMatrix]);

  const allVisibleGrantsFlat = useMemo(
    () => Object.values(visibleByService).flat(),
    [visibleByService]
  );

  const allVisibleSelected = useMemo(() => {
    if (!selectedRole || allVisibleGrantsFlat.length === 0) return false;
    const set = new Set(grantsMatrix[selectedRole] ?? []);
    return allVisibleGrantsFlat.every(g => set.has(g));
  }, [selectedRole, allVisibleGrantsFlat, grantsMatrix]);

  // ====== Contadores (global e por serviço) ======
  const globalCounts = useMemo(() => {
    const total = catalogAllGrants.length;
    const active = new Set(grantsMatrix[selectedRole] ?? []).size;
    return { active, total };
  }, [catalogAllGrants.length, grantsMatrix, selectedRole]);

  const svcCounts = useCallback((svc: ServiceGroup) => {
    const set = new Set(grantsMatrix[selectedRole] ?? []);
    const a = svc.grants.filter(g => set.has(g)).length;
    const b = svc.grants.length;
    return { active: a, total: b };
  }, [grantsMatrix, selectedRole]);

  // ====== Export / Import JSON ======
  const exportMatrix = () => {
    const data = localGrantsMatrix ?? (security?.grantsMatrix ?? {});
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `grantsMatrix-${new Date().toISOString().slice(0,19)}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importMatrix = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result) || '{}');
        if (json && typeof json === 'object') {
          const ok = Object.entries(json).every(([k,v]) => Array.isArray(v) && (v as any[]).every(x => typeof x === 'string'));
          if (!ok) {
            alert('JSON inválido: grantsMatrix deve ser { [role: string]: string[] }');
            return;
          }
          setLocalGrantsMatrix(json as Record<string, string[]>);
        }
      } catch {
        alert('Falha a importar JSON.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // ====== Persistência ======
  const saveMut = useMutation({
    mutationFn: async () => {
      const current = security ?? {
        version: 1,
        defaults: { allowIfNotMatched: false },
        roles: {},
        frontend: {},
        backend: {},
        overrides: {},
        grantsMatrix: {},
      } as SecuritySettingsDto;

      const next: SecuritySettingsDto = {
        ...current,
        grantsMatrix: localGrantsMatrix ?? current.grantsMatrix ?? {},
      };

      return updatePlatformSecuritySettings(next);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings', 'security'] });
      setLocalGrantsMatrix(null);
    },
  });

  const onRevert = () => setLocalGrantsMatrix(null);

  // ====== Gestão de roles (na sidebar) ======
  const [newRoleName, setNewRoleName] = useState('');
  const [renTo, setRenTo] = useState('');

  const addRole = () => {
    const name = newRoleName.trim();
    if (!name) return;
    setLocalGrantsMatrix(prev => {
      const m = { ...(prev ?? grantsMatrix) };
      if (!m[name]) m[name] = [];
      return m;
    });
    setSelectedRole(name);
    setNewRoleName('');
  };

  const removeRole = () => {
    if (!selectedRole) return;
    const count = (grantsMatrix[selectedRole] ?? []).length;
    const ok = window.confirm(
      count > 0
        ? `O role "${selectedRole}" tem ${count} grants ativos. Remover mesmo assim?`
        : `Remover role "${selectedRole}"?`
    );
    if (!ok) return;
    setLocalGrantsMatrix(prev => {
      const m = { ...(prev ?? grantsMatrix) };
      delete m[selectedRole];
      return m;
    });
    const next = rolesAll.filter(r => r !== selectedRole);
    setSelectedRole(next[0] ?? '');
  };

  const renameRole = () => {
    const to = renTo.trim();
    const from = selectedRole.trim();
    if (!from || !to || from === to) return;
    setLocalGrantsMatrix(prev => {
      const m = { ...(prev ?? grantsMatrix) };
      const cur = new Set<string>(m[from] ?? []);
      const dst = new Set<string>(m[to] ?? []);
      cur.forEach(g => dst.add(g));
      m[to] = Array.from(dst);
      delete m[from];
      return m;
    });
    setSelectedRole(to);
    setRenTo('');
  };

  // ====== Guards carregamento ======
  if (isLoadingSec || isLoadingCat) {
    return (
      <SettingsSectionCard accent title="Matriz por Roles" description="A carregar matriz e catálogo…">
        <p className="text-sm text-gray-500">A carregar…</p>
      </SettingsSectionCard>
    );
  }

  // ====== UI: Layout Enterprise (Azure-like) ======
  return (
    <SettingsSectionCard
      accent
      title="Matriz por Roles"
      description="Seleciona um role e ativa/desativa grants. Guardado em JSON (grantsMatrix)."
    >
      <div className="flex gap-6 min-w-0">
        {/* SIDEBAR — Azure AD style */}
<aside className="w-64 shrink-0 rounded-md border border-gray-200 bg-gray-50">
  <div className="px-3 py-2 border-b bg-white rounded-t-md">
    <div className="text-[13px] font-semibold text-gray-700 tracking-wide">ROLES</div>
  </div>

  <div className="py-2">
    {rolesAll.map((r) => {
      const active = r === selectedRole;
      return (
        <button
          key={r}
          className={[
            'w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-100',
            active ? `border-l-4 ${brand.blueBorder} bg-white` : 'border-l-4 border-transparent',
          ].join(' ')}
          onClick={() => setSelectedRole(r)}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${active ? brand.blueBg : 'bg-gray-400'}`} />
          <span className={`truncate ${active ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {r}
          </span>
        </button>
      );
    })}
  </div>
</aside>

        {/* PAINEL PRINCIPAL — min-w-0 para nunca esticar horizontalmente */}
        <section className="flex-1 min-w-0">
          {/* ACTION BAR fixa (Azure-like) */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b rounded-t-md">
            <div className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Role</div>
                  <div className="font-semibold text-sm text-gray-900 truncate">{selectedRole || '(nenhum)'}</div>
                </div>

                {/* Contador global (ativos/total) */}
                <div className="text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Ativos:</span>{' '}
                  {globalCounts.active} <span className="text-gray-400">/</span> {globalCounts.total}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Export/Import JSON */}
                <Button variant="outline" size="sm" onClick={exportMatrix} title="Exportar grantsMatrix">
                  <Download className="w-4 h-4 mr-1" /> Exportar
                </Button>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importMatrix(file);
                      e.currentTarget.value = '';
                    }}
                  />
                  <span className="inline-flex items-center text-sm border rounded-md px-3 py-1.5 hover:bg-gray-50">
                    <Upload className="w-4 h-4 mr-1" /> Importar
                  </span>
                </label>

                <Button variant="outline" onClick={onRevert} disabled={!dirty || saveMut.isPending}>
                  Repor
                </Button>
                <Button onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
                  {saveMut.isPending ? 'A guardar…' : 'Guardar matriz'}
                </Button>
              </div>
            </div>

            {/* Filtros sob a action bar (também “fixos”) */}
            <div className="px-3 pb-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Pesquisar grants</Label>
                <Input
                  className="h-8 w-72"
                  placeholder="ex.: system:logs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyDirty}
                  onChange={(e) => setOnlyDirty(e.target.checked)}
                />
                <span>Só alterados</span>
              </label>

              <div className="ml-auto">
                {!allVisibleSelected ? (
                  <Button size="sm" variant="outline" onClick={() => setMany(allVisibleGrantsFlat, true)} disabled={!selectedRole || allVisibleGrantsFlat.length === 0}>
                    Selecionar visíveis
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setMany(allVisibleGrantsFlat, false)} disabled={!selectedRole || allVisibleGrantsFlat.length === 0}>
                    Limpar visíveis
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* LISTA por Serviço (SCROLL VERTICAL LOCAL) */}
          <div
            className="relative w-full max-w-full min-w-0 overflow-y-auto"
            style={{ maxHeight: '60vh' }}
          >
            <div className="divide-y divide-gray-200">
              {serviceGroups.map((svc) => {
                const collapsed = !!collapsedGroups[svc.id];
                const visible = visibleByService[svc.id] ?? [];

                // Contagem por serviço (todo o serviço, não apenas visíveis)
                const { active, total } = svcCounts(svc);

                // Tri-state nos visíveis: none/partial/full
                const set = new Set(grantsMatrix[selectedRole] ?? []);
                const visSelected = visible.filter(g => set.has(g)).length;
                const tri: 'none' | 'partial' | 'full' =
                  visible.length === 0 ? 'none' :
                  visSelected === 0 ? 'none' :
                  visSelected === visible.length ? 'full' : 'partial';

                return (
                  <div key={svc.id}>
                    {/* Header do Serviço (Azure, chevron à esquerda) */}
                    <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          className="flex items-center gap-2 text-sm font-medium text-gray-800 hover:underline"
                          onClick={() => setCollapsedGroups(prev => ({ ...prev, [svc.id]: !prev[svc.id] }))}
                          title={collapsed ? 'Expandir' : 'Colapsar'}
                        >
                          {collapsed ? <ChevronRight className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                          <span>{svc.name}</span>
                          <span className="text-xs text-gray-500">{total} grants</span>
                          <span className="text-xs text-gray-500">• Ativos: {active}/{total}</span>
                        </button>

                        {/* Tri‑state de visíveis (□/◐/☑) com toggle rápido */}
                        <button
                          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
                          onClick={() => {
                            if (tri === 'full') setMany(visible, false);
                            else setMany(visible, true);
                          }}
                          title={tri === 'full' ? 'Limpar visíveis' : 'Selecionar visíveis'}
                        >
                          {tri === 'full' ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : tri === 'partial' ? (
                            <MinusSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          {tri === 'full' ? 'Tudo visível ativo' : tri === 'partial' ? 'Parcial' : 'Nenhum visível ativo'}
                        </button>
                      </div>

                      {/* Ações por serviço (VERTICAL no desktop, discreto) */}
                      <div className="hidden md:flex flex-col items-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setMany(visible, true)} disabled={collapsed || visible.length === 0 || !selectedRole}>
                          <span className="text-xs">Ativar visíveis</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setMany(visible, false)} disabled={collapsed || visible.length === 0 || !selectedRole}>
                          <span className="text-xs">Desativar visíveis</span>
                        </Button>
                      </div>
                    </div>

                    {/* Linhas de grants */}
                    {!collapsed && visible.map((grant) => {
                      const enabled = set.has(grant);
                      return (
                        <div key={grant} className="px-3 py-2 flex items-center justify-between odd:bg-white even:bg-gray-50">
                          {/* Label com ícone (Azure-like) */}
                          <button
                            className="flex items-center gap-2 text-left"
                            onClick={() => toggleOne(grant)}
                            title="Clique para alternar"
                          >
                            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${brand.blueBg}`} />
                            <span className={`font-mono ${enabled ? 'text-gray-900' : 'text-gray-600'}`}>{grant}</span>
                          </button>

                          <Switch checked={enabled} onCheckedChange={() => toggleOne(grant)} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {Object.values(visibleByService).flat().length === 0 && (
                <div className="px-3 py-6 text-sm text-gray-500">
                  Nenhum grant visível com os filtros atuais.
                </div>
              )}
            </div>
          </div>

          {/* Rodapé informativo */}
          <p className="mt-3 text-xs text-gray-500">
            Dica: clique no nome do grant para alternar rapidamente. A barra fixa mantém ações e filtros sempre à vista.
            Os contadores mostram quantos grants estão ativos por serviço e no total para o role selecionado.
          </p>
        </section>
      </div>
    </SettingsSectionCard>
  );
}