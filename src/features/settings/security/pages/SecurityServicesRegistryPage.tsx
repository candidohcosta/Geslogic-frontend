// frontend/src/features/settings/security/pages/SecurityServicesRegistryPage.tsx
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { SettingsSectionCard } from '../../../../components/templates/SettingsSectionCard';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Label } from '../../../../components/ui/Label';

import {
  getServicesRegistry,
  upsertServiceRegistry,
  patchServiceRegistry,
  deleteServiceRegistry,
  exportServicesRegistryConfig,
  detectFrontendPrefixes, // 👈 para o botão sugerir
  // (Opcional) se já estiveres a usar o bloco de Scan do Catálogo e quiseres tê-lo aqui também:
  scanSecurityCatalog,
  getSecurityCatalogDiff,
  applySecurityCatalogScan,
  type ServiceRegistryItem,
  type ServiceRegistryUpsert,
  type ServiceRegistryPatch,
  type CatalogScanResponse,
  type CatalogDiffResponse,
} from '../../../../services/api';

import SecurityServicesWizard from '../components/SecurityServicesWizard';

// ====================== Helpers de strings ======================
const split = (s: string) =>
  s.split(/[\n,]/g).map(x => x.trim()).filter(Boolean);

const join = (arr?: string[]) => (arr ?? []).join(', ');

// ====================== Bloco opcional: Scan → Diff → Apply ======================
function CatalogScannerBlock() {
  const qc = useQueryClient();

  const [includeFrontend, setIncludeFrontend] = useState(true);
  const [includeLegacy, setIncludeLegacy] = useState(false);

  const [lastResult, setLastResult] = useState<CatalogScanResponse | null>(null);
  const diffQ = useQuery({
    queryKey: ['platform-settings', 'security-catalog', 'diff'],
    queryFn: getSecurityCatalogDiff,
    staleTime: 5_000,
  });

  const scanMut = useMutation({
    mutationFn: (vars: { mode: 'dry' | 'merge' | 'replace' }) =>
      scanSecurityCatalog({ ...vars, includeFrontend, includeLegacy }),
    onSuccess: (res) => {
      setLastResult(res);
      if (res?.applied) {
        qc.invalidateQueries({ queryKey: ['platform-settings', 'security-catalog'] });
      }
      qc.invalidateQueries({ queryKey: ['platform-settings', 'security-catalog', 'diff'] });
    },
  });

  const applyMut = useMutation({
    mutationFn: (mode: 'merge' | 'replace') => applySecurityCatalogScan(mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings', 'security-catalog', 'diff'] });
      qc.invalidateQueries({ queryKey: ['platform-settings', 'security-catalog'] });
    },
  });

  const summary = lastResult?.summary ?? diffQ.data?.diff?.summary;
  const added = lastResult?.added ?? diffQ.data?.diff?.added;
  const removed = lastResult?.removed ?? diffQ.data?.diff?.removed;
  const changed = lastResult?.changed ?? diffQ.data?.diff?.changed;

  return (
    <div className="border rounded-md p-3 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">Atualizar Catálogo a partir do Código</div>
          <div className="text-xs text-gray-600">
            Executa o scanner (backend{includeFrontend ? ' + frontend' : ''}{includeLegacy ? ' + legacy grants' : ''}), mostra o diff e permite aplicar <strong>merge</strong> ou <strong>replace</strong>.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={includeFrontend}
              onChange={(e) => setIncludeFrontend(e.target.checked)}
            />
            Incluir Frontend
          </label>
          <label className="text-xs inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={includeLegacy}
              onChange={(e) => setIncludeLegacy(e.target.checked)}
            />
            Incluir Legacy grants
          </label>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => scanMut.mutate({ mode: 'dry' })}
          disabled={scanMut.isPending}
        >
          {scanMut.isPending ? 'A executar scan…' : 'Scan (dry‑run)'}
        </Button>
        <Button
          onClick={() => scanMut.mutate({ mode: 'merge' })}
          disabled={scanMut.isPending}
        >
          {scanMut.isPending ? 'A aplicar (merge)…' : 'Aplicar (merge)'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => scanMut.mutate({ mode: 'replace' })}
          disabled={scanMut.isPending}
        >
          {scanMut.isPending ? 'A substituir…' : 'Substituir (replace)'}
        </Button>

        <div className="ml-auto">
          <Button
            variant="outline"
            onClick={() => diffQ.refetch()}
            disabled={diffQ.isFetching}
          >
            {diffQ.isFetching ? 'A atualizar diff…' : 'Recarregar Diff'}
          </Button>
        </div>
      </div>

      <div className="mt-3">
        {(scanMut.isError || diffQ.isError) && (
          <div className="text-sm text-rose-700">
            {(scanMut.error as Error)?.message || (diffQ.error as Error)?.message || 'Falha no scan/diff.'}
          </div>
        )}

        {(summary || added || removed || changed) ? (
          <div className="space-y-2 text-sm">
            <div className="text-gray-900 font-medium">Resumo</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Serviços</div>
                <div className="text-gray-900">
                  +{summary?.services.added ?? 0} / −{summary?.services.removed ?? 0}{' '}
                  <span className="text-xs text-gray-500"> (changed: {summary?.services.changed ?? 0})</span>
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Grants</div>
                <div className="text-gray-900">+{summary?.grants.added ?? 0} / −{summary?.grants.removed ?? 0}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Frontend</div>
                <div className="text-gray-900">+{summary?.frontend.added ?? 0} / −{summary?.frontend.removed ?? 0}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Backend</div>
                <div className="text-gray-900">+{summary?.backend.added ?? 0} / −{summary?.backend.removed ?? 0}</div>
              </div>
            </div>

            <details className="rounded-md border p-2 bg-gray-50">
              <summary className="cursor-pointer font-medium text-gray-800">Adicionados</summary>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-500">Serviços</div>
                  <ul className="list-disc pl-4">
                    {(added?.services ?? []).map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Grants</div>
                  <ul className="list-disc pl-4">
                    {(added?.grants ?? []).map((g) => <li key={g}>{g}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Frontend Routes</div>
                  <ul className="list-disc pl-4">
                    {(added?.frontendRoutes ?? []).map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Backend Endpoints</div>
                  <ul className="list-disc pl-4">
                    {(added?.backendEndpoints ?? []).map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              </div>
            </details>

            <details className="rounded-md border p-2 bg-gray-50">
              <summary className="cursor-pointer font-medium text-gray-800">Removidos</summary>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-500">Serviços</div>
                  <ul className="list-disc pl-4">
                    {(removed?.services ?? []).map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Grants</div>
                  <ul className="list-disc pl-4">
                    {(removed?.grants ?? []).map((g) => <li key={g}>{g}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Frontend Routes</div>
                  <ul className="list-disc pl-4">
                    {(removed?.frontendRoutes ?? []).map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Backend Endpoints</div>
                  <ul className="list-disc pl-4">
                    {(removed?.backendEndpoints ?? []).map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              </div>
            </details>

            <details className="rounded-md border p-2 bg-gray-50">
              <summary className="cursor-pointer font-medium text-gray-800">Alterados por Serviço</summary>
              <div className="mt-2 space-y-2">
                {(changed ?? []).map((c) => (
                  <div key={c.id} className="border rounded-md p-2">
                    <div className="text-sm font-semibold">{c.id}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                      <div className="text-xs">
                        <div className="text-gray-500">Grants</div>
                        <div>+{c.grants.onlyProposed.length} / −{c.grants.onlyCurrent.length}</div>
                      </div>
                      <div className="text-xs">
                        <div className="text-gray-500">Frontend</div>
                        <div>+{c.frontendRoutes.onlyProposed.length} / −{c.frontendRoutes.onlyCurrent.length}</div>
                      </div>
                      <div className="text-xs">
                        <div className="text-gray-500">Backend</div>
                        <div>+{c.backendEndpoints.onlyProposed.length} / −{c.backendEndpoints.onlyCurrent.length}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {(changed ?? []).length === 0 && (
                  <div className="text-xs text-gray-600">Sem alterações por serviço.</div>
                )}
              </div>
            </details>

            {diffQ.data?.ok && diffQ.data?.diff && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-600">Aplicar o último diff carregado:</span>
                <Button size="sm" onClick={() => applyMut.mutate('merge')} disabled={applyMut.isPending}>
                  {applyMut.isPending ? 'A aplicar…' : 'Apply (merge)'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => applyMut.mutate('replace')} disabled={applyMut.isPending}>
                  {applyMut.isPending ? 'A substituir…' : 'Apply (replace)'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500">Sem diff para mostrar. Executa um Scan (dry‑run).</div>
        )}
      </div>
    </div>
  );
}

// ====================== Editor de linha (com botão alinhado) ======================
function RowEditor({
  initial,
  isNew,
  onCancel,
  onSaved,
}: {
  initial: Partial<ServiceRegistryItem>;
  isNew: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<ServiceRegistryItem>>({
    id: initial.id ?? '',
    name: initial.name ?? '',
    globs: initial.globs ?? [],
    routePrefixes: initial.routePrefixes ?? [],
    grantPrefixes: initial.grantPrefixes ?? [],
    active: initial.active ?? true,
  });

  const [error, setError] = useState<string | null>(null);

  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.id || !form.name) {
        throw new Error('ID e Nome são obrigatórios.');
      }
      const payload: ServiceRegistryUpsert = {
        id: String(form.id),
        name: String(form.name),
        globs: form.globs ?? [],
        routePrefixes: form.routePrefixes ?? [],
        grantPrefixes: form.grantPrefixes ?? [],
        active: !!form.active,
      };
      return upsertServiceRegistry(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services-registry'] });
      onSaved();
    },
    onError: (e: any) => setError(e?.message ?? 'Falha ao gravar.'),
  });

  const patchMut = useMutation({
    mutationFn: async () => {
      if (!form.id) throw new Error('ID inválido.');
      const patch: ServiceRegistryPatch = {
        name: form.name,
        globs: form.globs,
        routePrefixes: form.routePrefixes,
        grantPrefixes: form.grantPrefixes,
        active: form.active,
      };
      return patchServiceRegistry(String(form.id), patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services-registry'] });
      onSaved();
    },
    onError: (e: any) => setError(e?.message ?? 'Falha ao atualizar.'),
  });

  const onSave = () => {
    setError(null);
    if (isNew) saveMut.mutate();
    else patchMut.mutate();
  };

  // ===== Sugerir prefixes FE (alinhado com o campo) =====
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const onSuggestPrefixes = async () => {
    setIsSuggesting(true);
    setSuggestError(null);
    setSuggestions(null);
    try {
      const res = await detectFrontendPrefixes(String(form.id || undefined));
      if (!res.ok) setSuggestError('Falha a detetar prefixos.');
      else setSuggestions(res.suggestedPrefixes ?? []);
    } catch (e: any) {
      setSuggestError(e?.message ?? 'Erro ao detetar prefixos.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const addRoutePrefix = (p: string) => {
    const set = new Set(form.routePrefixes ?? []);
    set.add(p);
    setForm({ ...form, routePrefixes: Array.from(set) });
  };
  const removeRoutePrefix = (p: string) => {
    setForm({ ...form, routePrefixes: (form.routePrefixes ?? []).filter(x => x !== p) });
  };

  const addGrantPrefix = (p: string) => {
    const set = new Set(form.grantPrefixes ?? []);
    set.add(p);
    setForm({ ...form, grantPrefixes: Array.from(set) });
  };
  const removeGrantPrefix = (p: string) => {
    setForm({ ...form, grantPrefixes: (form.grantPrefixes ?? []).filter(x => x !== p) });
  };

  const addGlob = (g: string) => {
    const set = new Set(form.globs ?? []);
    set.add(g);
    setForm({ ...form, globs: Array.from(set) });
  };
  const removeGlob = (g: string) => {
    setForm({ ...form, globs: (form.globs ?? []).filter(x => x !== g) });
  };

  return (
    <div className="border rounded-md p-3 bg-white space-y-3">
      {error && <div className="text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>ID</Label>
          <Input
            disabled={!isNew}
            value={String(form.id ?? '')}
            onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
            placeholder="ex.: QUEUE_MANAGEMENT"
          />
        </div>
        <div>
          <Label>Nome</Label>
          <Input
            value={String(form.name ?? '')}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ex.: Filas de Atendimento"
          />
        </div>
      </div>

      <div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Globs (CSV ou linhas)</Label>
            <Input
              value={join(form.globs)}
              onChange={(e) => setForm({ ...form, globs: split(e.target.value) })}
              placeholder="src/queue-management/**"
            />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Input
            placeholder="ex.: src/process-management/**"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) { addGlob(v); (e.target as HTMLInputElement).value = ''; }
              }
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              const inp = document.querySelector<HTMLInputElement>('input[placeholder="ex.: src/process-management/**"]');
              const v = inp?.value?.trim();
              if (v) { addGlob(v); if (inp) inp.value = ''; }
            }}
          >
            Adicionar
          </Button>
        </div>
      </div>

      {/* ====== Route prefixes (INPUT + BOTÃO ALINHADO) ====== */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label>Route prefixes (opcional)</Label>
          <Input
            value={join(form.routePrefixes)}
            onChange={(e) => setForm({ ...form, routePrefixes: split(e.target.value) })}
            placeholder="/operator, /operator-sessions"
          />
        </div>

        <Button
          variant="outline"
          onClick={onSuggestPrefixes}
          disabled={isSuggesting}
          className="whitespace-nowrap"
          title="Detetar automaticamente routes no frontend e sugerir prefixos por 1º segmento"
        >
          {isSuggesting ? 'A analisar FE…' : '🔍 Sugerir prefixes FE'}
        </Button>
      </div>

      {suggestError && <div className="text-xs text-rose-700">{suggestError}</div>}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-600">Sugestões (clique em “Adicionar” para incluir):</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {suggestions.map((p) => (
              <span key={p} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs bg-white">
                <span className="text-gray-800">{p}</span>
                <button
                  type="button"
                  onClick={() => addRoutePrefix(p)}
                  className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200"
                >
                  Adicionar
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ====== Grant prefixes ====== */}
      <div>
        <Label>Grant prefixes (opcional)</Label>
        <Input
          value={join(form.grantPrefixes)}
          onChange={(e) => setForm({ ...form, grantPrefixes: split(e.target.value) })}
          placeholder="queues:, scheduling:"
        />
        <div className="mt-2 flex items-center gap-2">
          <Input
            placeholder="ex.: process:"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) { addGrantPrefix(v); (e.target as HTMLInputElement).value = ''; }
              }
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              const inp = document.querySelector<HTMLInputElement>('input[placeholder="ex.: process:"]');
              const v = inp?.value?.trim();
              if (v) { addGrantPrefix(v); if (inp) inp.value = ''; }
            }}
          >
            Adicionar
          </Button>
        </div>
      </div>

      {/* ====== Ativo + Ações ====== */}
      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          <span className="text-sm">Ativo</span>
        </label>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={onSave}>{isNew ? 'Adicionar' : 'Guardar'}</Button>
        </div>
      </div>
    </div>
  );
}

// ====================== Página principal ======================
export default function SecurityServicesRegistryPage() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const listQ = useQuery({
    queryKey: ['services-registry'],
    queryFn: getServicesRegistry,
    staleTime: 10000,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteServiceRegistry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services-registry'] });
    },
  });

  const exportMut = useMutation({
    mutationFn: exportServicesRegistryConfig,
  });

  const rows = useMemo(() => {
    const data = listQ.data ?? [];
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter(r =>
      r.id.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q),
    );
  }, [listQ.data, search]);

  return (
    <div className="space-y-4">
      {/* Wizard no topo (podes remover se preferires) */}
      <SecurityServicesWizard />

      {/* (Opcional) Bloco de Scan/Diff/Apply aqui também */}
      <CatalogScannerBlock />

      <SettingsSectionCard
        accent
        title="Serviços (Registo Dinâmico)"
        description="Fonte única dos serviços/módulos da plataforma. O scanner e o catálogo seguem este registo."
      >
        {listQ.isLoading && <div className="text-sm text-gray-600">A carregar…</div>}
        {listQ.isError && (
          <div className="text-sm text-rose-700">Falha a carregar o registo: {(listQ.error as Error)?.message}</div>
        )}
        {!listQ.isLoading && !listQ.isError && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[220px]">
                <Label>Pesquisa</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ID ou Nome…" />
              </div>
              <Button onClick={() => setAdding(true)} disabled={adding}>+ Adicionar</Button>
              <Button
                variant="outline"
                onClick={() => exportMut.mutate()}
                disabled={exportMut.isPending}
                title="Escreve o JSON que o scanner lê (generated/services.registry.json)"
              >
                {exportMut.isPending ? 'A exportar…' : 'Exportar JSON p/ Scanner'}
              </Button>
            </div>

            {adding && (
              <RowEditor
                isNew
                initial={{}}
                onCancel={() => setAdding(false)}
                onSaved={() => setAdding(false)}
              />
            )}

            <div className="divide-y rounded-md border">
              {(rows ?? []).length === 0 && (
                <div className="p-3 text-sm text-gray-600">Sem serviços no registo.</div>
              )}
              {(rows ?? []).map((r) => {
                const isEditing = editingId === r.id;
                return (
                  <div key={r.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-xs text-gray-600">id: {r.id} • {r.active ? 'Ativo' : 'Inativo'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEditing && (
                          <>
                            <Button variant="outline" onClick={() => setEditingId(r.id)}>Editar</Button>
                            <Button variant="ghost" onClick={() => delMut.mutate(r.id)} disabled={delMut.isPending}>Eliminar</Button>
                          </>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-gray-500">Globs</div>
                          <div className="text-gray-900 break-words">{(r.globs ?? []).join(', ') || '—'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Route prefixes</div>
                          <div className="text-gray-900 break-words">{(r.routePrefixes ?? []).join(', ') || '—'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Grant prefixes</div>
                          <div className="text-gray-900 break-words">{(r.grantPrefixes ?? []).join(', ') || '—'}</div>
                        </div>
                      </div>
                    )}

                    {isEditing && (
                      <RowEditor
                        isNew={false}
                        initial={r}
                        onCancel={() => setEditingId(null)}
                        onSaved={() => setEditingId(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SettingsSectionCard>
    </div>
  );
}