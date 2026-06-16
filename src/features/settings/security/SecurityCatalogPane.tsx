// src/features/settings/security/SecurityCatalogPane.tsx
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';

import {
  getPlatformSecurityCatalog,
  updatePlatformSecurityCatalog,
  deletePlatformSecurityCatalogService,
  // 👇 NOVOS serviços de API
  scanSecurityCatalog,
  getSecurityCatalogDiff,
  applySecurityCatalogScan,
  type SecurityCatalogDto,
  type SecurityCatalogService,
  type CatalogScanResponse,
  type CatalogDiffResponse,
} from '../../../services/api';

// ---------- Helpers ----------
const splitToArray = (raw: string): string[] =>
  raw
    .split(/[\n,]/g)
    .map(s => s.trim())
    .filter(Boolean);

const joinArray = (arr: string[] | undefined): string =>
  (arr ?? []).join(', ');

function validateService(svc: SecurityCatalogService): string | null {
  if (!svc.id?.trim()) return 'ID do serviço é obrigatório.';
  if (!svc.name?.trim()) return 'Nome do serviço é obrigatório.';
  if (!Array.isArray(svc.grants) || svc.grants.some(v => !v.trim()))
    return 'Todos os grants devem ser strings não vazias.';
  if (!Array.isArray(svc.frontendRoutes) || svc.frontendRoutes.some(v => !v.trim()))
    return 'Todas as rotas frontend devem ser strings não vazias.';
  if (!Array.isArray(svc.backendEndpoints) || svc.backendEndpoints.some(v => !v.trim()))
    return 'Todos os endpoints backend devem ser strings não vazias.';
  if (svc.conditions && svc.conditions.some(v => !v.trim()))
    return 'As condições não podem conter valores vazios.';
  return null;
}

// ---------- Editor de Serviço ----------
function ServiceEditor({
  value,
  isNew,
  onCancel,
  onSave,
  allServices,
}: {
  value: SecurityCatalogService;
  isNew: boolean;
  onCancel: () => void;
  onSave: (svc: SecurityCatalogService) => void;
  allServices: SecurityCatalogService[];
}) {
  const [form, setForm] = useState<SecurityCatalogService>({ ...value });
  const [error, setError] = useState<string | null>(null);

  const idExists = useMemo(
    () => allServices.some(s => s.id === form.id && s.id !== value.id),
    [allServices, form.id, value.id],
  );

  const trySave = () => {
    const err = validateService(form);
    if (err) {
      setError(err);
      return;
    }
    if (isNew && idExists) {
      setError(`Já existe um serviço com id "${form.id}".`);
      return;
    }
    onSave(normalizeCatalogServiceStrict(form));
  };

  return (
    <div className="border rounded-md p-3 space-y-3 bg-white">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>ID do serviço</Label>
          <Input
            value={form.id}
            disabled={!isNew}
            onChange={e => setForm({ ...form, id: e.target.value.trim() })}
            placeholder="ex.: logs, platform, queues"
          />
        </div>
        <div>
          <Label>Nome</Label>
          <Input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="ex.: Logs do Sistema"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Grants (CSV ou linhas)</Label>
          <Input
            value={joinArray(form.grants)}
            onChange={e => setForm({ ...form, grants: splitToArray(e.target.value) })}
            placeholder="system:logs, platform:settings"
          />
        </div>
        <div>
          <Label>Condições (opcional)</Label>
          <Input
            value={joinArray(form.conditions)}
            onChange={e => setForm({ ...form, conditions: splitToArray(e.target.value) })}
            placeholder="scope:platform, requireSubscribedService:QUEUES"
          />
        </div>
      </div>

      <div>
        <Label>Rotas Frontend (CSV ou linhas)</Label>
        <Input
          value={joinArray(form.frontendRoutes)}
          onChange={e => setForm({ ...form, frontendRoutes: splitToArray(e.target.value) })}
          placeholder="/logs, /logs/*"
        />
      </div>

      <div>
        <Label>Endpoints Backend (CSV ou linhas)</Label>
        <Input
          value={joinArray(form.backendEndpoints)}
          onChange={e => setForm({ ...form, backendEndpoints: splitToArray(e.target.value) })}
          placeholder='GET /logs, GET /logs/*   ou   /logs/*'
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={trySave}>{isNew ? 'Adicionar' : 'Guardar'}</Button>
      </div>
    </div>
  );
}

// ---------- Bloco UI: Atualizar Catálogo (Scan → Diff → Apply) ----------
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
      // Se aplicou (merge/replace), invalida o catálogo
      if (res?.applied) {
        qc.invalidateQueries({ queryKey: ['platform-settings', 'security-catalog'] });
      }
      // Atualiza o diff
      qc.invalidateQueries({ queryKey: ['platform-settings', 'security-catalog', 'diff'] });
    },
  });

  const applyMut = useMutation({
    mutationFn: (mode: 'merge' | 'replace') => applySecurityCatalogScan(mode),
    onSuccess: (res) => {
      // Após aplicar, volta a buscar diff e catálogo
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

      {/* Botões de ação */}
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

      {/* Diff / Resultado */}
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

            {/* Listas (collapsible) */}
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

            {/* Aplicar último diff carregado (se existia) */}
            {diffQ.data?.ok && diffQ.data?.diff && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-600">Aplicar o último diff carregado:</span>
                <Button
                  size="sm"
                  onClick={() => applyMut.mutate('merge')}
                  disabled={applyMut.isPending}
                >
                  {applyMut.isPending ? 'A aplicar…' : 'Apply (merge)'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => applyMut.mutate('replace')}
                  disabled={applyMut.isPending}
                >
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


// ========================= NORMALIZAÇÃO ESTRITA =========================

// Grant: lowercase, trim, sem duplicados, ordenado
function normalizeGrantsStrict(arr?: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  const norm = arr
    .map(g => g.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(norm)).sort();
}

// Conditions (chave preservada, valor lowercase)
function normalizeConditionsStrict(arr?: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const raw of arr) {
    const s = raw.trim();
    if (!s) continue;
    const [key, val] = s.split(':');
    if (!key) continue;
    const normalized =
      val !== undefined
        ? `${key.trim()}:${val.trim().toLowerCase()}`
        : key.trim();
    out.push(normalized);
  }
  return Array.from(new Set(out));
}

// Frontend routes: lowercase, /, //, trim, sem duplicados, ordenado
function normalizeFrontendRoutesStrict(arr?: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  const norm = arr
    .map(s => s.trim().toLowerCase())
    .map(s => {
      if (!s.startsWith('/')) s = '/' + s;
      s = s.replace(/\/+/g, '/');
      if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
      return s;
    })
    .filter(Boolean);
  return Array.from(new Set(norm)).sort();
}

// CamelCase converter para parâmetros :ParamName → :paramName
function toCamelCaseParam(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) return name.toLowerCase();
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

// Backend endpoints: METHOD path
function normalizeBackendEndpointsStrict(arr?: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  const out = arr
    .map(raw => {
      let s = raw.trim();
      if (!s) return '';

      const parts = s.split(/\s+/);
      let method = 'GET';
      let path = '';

      if (parts.length === 1) {
        path = parts[0];
      } else {
        method = parts[0].toUpperCase();
        path = parts.slice(1).join(' ');
      }

      path = path.trim().toLowerCase();
      if (!path.startsWith('/')) path = '/' + path;
      path = path.replace(/\/+/g, '/');

      path = path.replace(/:([a-zA-Z0-9_]+)/g, (_, grp) => `:${toCamelCaseParam(grp)}`);

      return `${method} ${path}`;
    })
    .filter(Boolean);

  return Array.from(new Set(out)).sort();
}

// Aplica tudo a um serviço inteiro
function normalizeCatalogServiceStrict(svc: SecurityCatalogService): SecurityCatalogService {
  return {
    ...svc,
    id: svc.id.trim(),
    name: svc.name.trim(),
    grants: normalizeGrantsStrict(svc.grants),
    conditions: normalizeConditionsStrict(svc.conditions),
    frontendRoutes: normalizeFrontendRoutesStrict(svc.frontendRoutes),
    backendEndpoints: normalizeBackendEndpointsStrict(svc.backendEndpoints),
  };
}


// ---------- Painel principal (Catálogo) ----------
export default function SecurityCatalogPane() {
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['platform-settings', 'security-catalog'],
    queryFn: getPlatformSecurityCatalog,
    staleTime: 10_000,
  });

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteReasons, setDeleteReasons] = useState<string[] | null>(null);
  const [forceDelete, setForceDelete] = useState(false);

  const allServices = data?.services ?? [];

  // create/update
  const saveMut = useMutation({
    mutationFn: async (svc: SecurityCatalogService) => {
      const payload: SecurityCatalogDto = { services: [svc] };
      return updatePlatformSecurityCatalog(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings', 'security-catalog'] });
      setCreating(false);
      setEditingId(null);
    },
  });

  // delete
  const deleteMut = useMutation({
    mutationFn: async ({ id, force }: { id: string; force: boolean }) => {
      return deletePlatformSecurityCatalogService(id, { force });
    },
    onSuccess: (res: any) => {
      if (res?.removed) {
        setDeleteReasons(null);
        setPendingDelete(null);
        setForceDelete(false);
        qc.invalidateQueries({ queryKey: ['platform-settings', 'security-catalog'] });
      } else {
        setDeleteReasons(res?.reasons ?? ['Remoção bloqueada por referências.']);
        setForceDelete(false);
      }
    },
  });

  const onCreate = () => {
    setCreating(true);
    setEditingId(null);
  };
  const onCancelCreate = () => setCreating(false);
  const onSaveCreate = (svc: SecurityCatalogService) => saveMut.mutate(svc);

  const onEdit = (id: string) => {
    setEditingId(id);
    setCreating(false);
  };
  const onCancelEdit = () => setEditingId(null);
  const onSaveEdit = (svc: SecurityCatalogService) => saveMut.mutate(svc);

  const askDelete = (id: string) => {
    setPendingDelete(id);
    setDeleteReasons(null);
    setForceDelete(false);
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMut.mutate({ id: pendingDelete, force: forceDelete });
  };
  const cancelDelete = () => {
    setPendingDelete(null);
    setDeleteReasons(null);
    setForceDelete(false);
  };

  return (
    <SettingsSectionCard
      accent
      title="Catálogo de Serviços"
      description="Define a lista de serviços, respetivos grants, rotas (frontend) e endpoints (backend). A UI de regras usa este catálogo para evitar erros de escrita."
    >
      {isLoading && <p className="text-sm text-gray-500">A carregar catálogo…</p>}
      {isError && (
        <div className="space-y-2">
          <p className="text-sm text-red-600">Falha ao carregar o catálogo.</p>
          <p className="text-xs text-gray-600">{(error as Error)?.message ?? 'Erro desconhecido'}</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-4">

          {/* ==== NOVO: Secção de Scan/Diff/Apply ==== */}
          <CatalogScannerBlock />

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Serviços definidos: <strong>{allServices.length}</strong>
            </div>
            <Button onClick={onCreate} disabled={creating || saveMut.isPending}>+ Adicionar serviço</Button>
          </div>

          {creating && (
            <ServiceEditor
              isNew
              value={{
                id: '',
                name: '',
                grants: [],
                frontendRoutes: [],
                backendEndpoints: [],
                conditions: [],
              }}
              allServices={allServices}
              onCancel={onCancelCreate}
              onSave={onSaveCreate}
            />
          )}

          {/* Lista de serviços */}
          <div className="space-y-3">
            {allServices.map(svc => {
              const isEditing = editingId === svc.id;
              const isDeleting = pendingDelete === svc.id;
              return (
                <div key={svc.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{svc.name}</div>
                      <div className="text-xs text-gray-600">id: {svc.id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isDeleting && (
                        <>
                          <Button variant="outline" onClick={() => onEdit(svc.id)} disabled={saveMut.isPending}>
                            Editar
                          </Button>
                          <Button variant="ghost" onClick={() => askDelete(svc.id)} disabled={deleteMut.isPending}>
                            Eliminar
                          </Button>                        
                        </>
                      )}
                    </div>
                  </div>

                  {/* cartão de detalhes */}
                  {!isEditing && !isDeleting && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
<div>
  <div className="text-gray-500 flex items-center gap-2">
    Grants
    {svc.grants && svc.grants.length !== new Set(svc.grants).size && (
      <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded">
        duplicados
      </span>
    )}
  </div>
  <div>
    {(svc.grants ?? []).join(', ') || <span className="text-gray-400">—</span>}
  </div>
</div>
                      <div>
                        <div className="text-gray-500">Condições</div>
                        <div>{(svc.conditions ?? []).join(', ') || <span className="text-gray-400">—</span>}</div>
                      </div>
                      <div className="md:col-span-1">
                        <div className="text-gray-500">Rotas (FE)</div>
                        <div>{(svc.frontendRoutes ?? []).join(', ') || <span className="text-gray-400">—</span>}</div>
                      </div>
                      <div className="md:col-span-1">
                        <div className="text-gray-500">Endpoints (BE)</div>
                        <div>{(svc.backendEndpoints ?? []).join(', ') || <span className="text-gray-400">—</span>}</div>
                      </div>
                    </div>
                  )}

                  {/* editor */}
                  {isEditing && (
                    <div className="mt-3">
                      <ServiceEditor
                        isNew={false}
                        value={svc}
                        allServices={allServices}
                        onCancel={onCancelEdit}
                        onSave={onSaveEdit}
                      />
                    </div>
                  )}

                  {/* confirmação de remoção */}
                  {isDeleting && (
                    <div className="mt-3 border rounded-md p-3 bg-amber-50">
                      <p className="text-sm">
                        Tens a certeza que queres <strong>eliminar</strong> o serviço <strong>{svc.id}</strong>?
                      </p>
                      {deleteReasons && deleteReasons.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-amber-900">Remoção bloqueada pelas seguintes referências:</p>
                          <ul className="list-disc ml-5 text-sm text-amber-900">
                            {deleteReasons.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                          <div className="mt-2">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={forceDelete}
                                onChange={(e) => setForceDelete(e.target.checked)}
                              />
                              <span className="text-sm">Forçar remoção mesmo com referências</span>
                            </label>
                          </div>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <Button variant="outline" onClick={cancelDelete} disabled={deleteMut.isPending}>
                          Cancelar
                        </Button>
                        <Button onClick={confirmDelete} disabled={deleteMut.isPending}>
                          {deleteMut.isPending ? 'A eliminar…' : 'Eliminar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SettingsSectionCard>
  );
}