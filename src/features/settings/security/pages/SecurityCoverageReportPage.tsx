// frontend/src/features/settings/security/pages/SecurityCoverageReportPage.tsx
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { SettingsSectionCard } from '../../../../components/templates/SettingsSectionCard';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Label } from '../../../../components/ui/Label';

import {
  getPlatformSecurityCatalog,
  getSecurityCoverageReport,
  type SecurityCatalogDto,
  type SecurityCatalogService,
  type SecurityCoverageReport,
} from '../../../../services/api';

/* ============================ Helpers ============================ */

const fmtPct = (v?: number) =>
  typeof v === 'number' && Number.isFinite(v) ? `${v.toFixed(2)}%` : '—';

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

function coverageColor(pct?: number) {
  if (pct == null) return 'bg-gray-300';
  if (pct >= 95) return 'bg-emerald-500';
  if (pct >= 85) return 'bg-amber-500';
  return 'bg-rose-500';
}

function barWidth(pct?: number) {
  if (pct == null) return 'w-0';
  return `w-[${Math.max(0, Math.min(100, pct)).toFixed(0)}%]`;
}

/** Link “amigável” para abrir a página de Catálogo já focada no serviço */
function getCatalogEditorLink(serviceId: string) {
  // Ajusta se tiveres outra convenção de query/rotas
  return `/platform/settings?tab=security&pane=catalog&service=${encodeURIComponent(serviceId)}`;
}

/* ============================ Tipos locais (fallback) ============================ */
/* Se o teu services/api já exportar estes tipos, ignora as definições abaixo. */

type TotalsFE = { routes: number; covered: number; uncovered: number; coveragePct: number };
type TotalsBE = { endpoints: number; covered: number; uncovered: number; coveragePct: number };
type Totals = {
  services: number;
  frontend?: TotalsFE;
  backend?: TotalsBE;
  grants: { defined: number; used: number; unused: number };
};

/* ============================ Componentes de UI ============================ */

function KPI({
  title,
  value,
  subtitle,
  tone = 'default',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  tone?: 'default' | 'ok' | 'warn' | 'danger';
}) {
  const toneCls =
    tone === 'ok'
      ? 'border-emerald-200 bg-emerald-50'
      : tone === 'warn'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'danger'
      ? 'border-rose-200 bg-rose-50'
      : 'border-gray-200 bg-white';

  return (
    <div className={classNames('rounded-xl border p-4 shadow-sm', toneCls)}>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}

function HBar({
  pct,
  labelLeft,
  labelRight,
}: {
  pct?: number;
  labelLeft?: string;
  labelRight?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>{labelLeft ?? ''}</span>
        <span>{labelRight ?? fmtPct(pct)}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={classNames('h-2 rounded-full transition-all', coverageColor(pct))}
          style={{ width: `${Math.max(0, Math.min(100, pct ?? 0))}%` }}
          aria-label={fmtPct(pct)}
        />
      </div>
    </div>
  );
}

/* ============================ Página principal ============================ */

export default function SecurityCoverageReportPage() {
  const qc = useQueryClient();

  // ----- Filtros -----
  const [scope, setScope] = useState<'all' | 'backend' | 'frontend'>('all');
  const [serviceId, setServiceId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // ----- Catálogo (para o dropdown de serviços) -----
  const catalogQ = useQuery({
    queryKey: ['platform-settings', 'security-catalog'],
    queryFn: getPlatformSecurityCatalog,
    staleTime: 10_000,
  });

  const services: SecurityCatalogService[] = catalogQ.data?.services ?? [];
  const serviceOptions = useMemo(
    () => [{ id: '', name: 'Todos os serviços' }, ...services],
    [services],
  );

  // ----- Report -----
  const reportQ = useQuery({
    queryKey: ['platform-settings', 'security-coverage', { scope, serviceId }],
    queryFn: () => getSecurityCoverageReport({ scope, service: serviceId || undefined }),
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  });

  const report: SecurityCoverageReport | undefined = reportQ.data;

  const totals: Totals | undefined = report?.totals as any;

  const servicesRows = useMemo(() => {
    let rows = (report?.byService ?? []).slice();

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.service.toLowerCase().includes(q));
    }
    return rows;
  }, [report?.byService, search]);

  const servicesWithGaps = useMemo(() => {
    return servicesRows.filter((r) => {
      const beGap = (r as any).backend?.uncovered ?? 0;
      const feGap = (r as any).frontend?.uncovered ?? 0;
      if (scope === 'backend') return beGap > 0;
      if (scope === 'frontend') return feGap > 0;
      return beGap > 0 || feGap > 0;
    }).length;
  }, [servicesRows, scope]);

  const kpiBackend = totals?.backend
    ? `${fmtPct(totals.backend.coveragePct)} (${totals.backend.covered}/${totals.backend.endpoints})`
    : '—';

  const kpiFrontend = totals?.frontend
    ? `${fmtPct(totals.frontend.coveragePct)} (${totals.frontend.covered}/${totals.frontend.routes})`
    : '—';

  const unusedGrantsTotal = totals?.grants?.unused ?? 0;

  const onRefresh = () => {
    qc.invalidateQueries({ queryKey: ['platform-settings', 'security-coverage'] });
  };

  return (
    <div className="space-y-4">
      <SettingsSectionCard
        accent
        title="Relatório de Cobertura de Segurança"
        description="Diagnóstico agregado entre Catálogo e Regras (frontend/backend), destacando lacunas e incoerências."
      >
        {/* Loading / Error */}
        {(catalogQ.isLoading || reportQ.isLoading) && (
          <p className="text-sm text-gray-600">A carregar…</p>
        )}
        {catalogQ.isError && (
          <div className="text-sm text-rose-600">
            Falha ao carregar o catálogo. {(catalogQ.error as Error)?.message}
          </div>
        )}
        {reportQ.isError && (
          <div className="text-sm text-rose-600">
            Falha ao carregar o relatório. {(reportQ.error as Error)?.message}
          </div>
        )}

        {!reportQ.isLoading && !reportQ.isError && report && (
          <div className="space-y-6">
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <Label>Scope</Label>
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                >
                  <option value="all">Todos</option>
                  <option value="backend">Backend</option>
                  <option value="frontend">Frontend</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <Label>Serviço</Label>
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  {serviceOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.id ? `(${s.id})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <Label>Pesquisa (por ID de serviço)</Label>
                <Input
                  placeholder="ex.: QUEUE_MANAGEMENT"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="md:col-span-1">
                <Button onClick={onRefresh} disabled={reportQ.isFetching}>
                  {reportQ.isFetching ? 'A atualizar…' : 'Atualizar'}
                </Button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <KPI
                title="Cobertura Backend"
                value={kpiBackend}
                subtitle="Endpoints cobertos / totais"
                tone={totals?.backend ? (totals.backend.coveragePct >= 95 ? 'ok' : totals.backend.coveragePct >= 85 ? 'warn' : 'danger') : 'default'}
              />
              <KPI
                title="Cobertura Frontend"
                value={kpiFrontend}
                subtitle="Rotas cobertas / totais"
                tone={totals?.frontend ? (totals.frontend.coveragePct >= 95 ? 'ok' : totals.frontend.coveragePct >= 85 ? 'warn' : 'danger') : 'default'}
              />
              <KPI
                title="Serviços com lacunas"
                value={servicesWithGaps}
                subtitle="Tem pelo menos 1 item não coberto"
                tone={servicesWithGaps === 0 ? 'ok' : servicesWithGaps <= 2 ? 'warn' : 'danger'}
              />
              <KPI
                title="Grants não usados"
                value={unusedGrantsTotal}
                subtitle="Definidos no catálogo mas não usados em regras"
                tone={unusedGrantsTotal === 0 ? 'ok' : unusedGrantsTotal <= 5 ? 'warn' : 'danger'}
              />
            </div>

            {/* Gráfico simples por serviço */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-medium text-gray-900 mb-3">
                Cobertura por Serviço
              </div>
              <div className="space-y-3">
                {servicesRows.length === 0 && (
                  <div className="text-sm text-gray-500">Sem serviços para mostrar.</div>
                )}
                {servicesRows.map((row) => {
                  const bePct = (row as any).backend?.coveragePct;
                  const fePct = (row as any).frontend?.coveragePct;
                  return (
                    <div key={row.service} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-3">
                        <div className="text-sm font-medium text-gray-900">{row.service}</div>
                        <div className="text-xs text-gray-500">
                          {(row as any).grants?.unused?.length ?? 0} grants não usados
                        </div>
                      </div>
                      <div className="md:col-span-9 space-y-2">
                        {scope !== 'frontend' && (
                          <HBar
                            pct={bePct}
                            labelLeft="Backend"
                            labelRight={fmtPct(bePct)}
                          />
                        )}
                        {scope !== 'backend' && (
                          <HBar
                            pct={fePct}
                            labelLeft="Frontend"
                            labelRight={fmtPct(fePct)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabela detalhada */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-900">Detalhe por Serviço</div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-left">
                      <th className="px-4 py-2 font-medium text-gray-600 w-56">Serviço</th>
                      {scope !== 'frontend' && (
                        <th className="px-4 py-2 font-medium text-gray-600">Backend</th>
                      )}
                      {scope !== 'backend' && (
                        <th className="px-4 py-2 font-medium text-gray-600">Frontend</th>
                      )}
                      <th className="px-4 py-2 font-medium text-gray-600">Grants</th>
                      <th className="px-4 py-2 font-medium text-gray-600">Scope</th>
                      <th className="px-4 py-2 font-medium text-gray-600 w-44">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {servicesRows.map((row) => {
                      const be = (row as any).backend;
                      const fe = (row as any).frontend;
                      const grantsUnused = (row as any).grants?.unused ?? [];
                      const conflicts = (row as any).scopeRules?.conflicts ?? [];
                      const declaredScope = (row as any).scopeRules?.declaredScope ?? null;

                      return (
                        <tr key={row.service} className="align-top">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{row.service}</div>
                            {declaredScope && (
                              <div className="text-xs text-gray-500">scope: {declaredScope}</div>
                            )}
                          </td>

                          {scope !== 'frontend' && (
                            <td className="px-4 py-3">
                              {be ? (
                                <div className="space-y-1">
                                  <div className="text-gray-900">
                                    {fmtPct(be.coveragePct)}{' '}
                                    <span className="text-xs text-gray-500">
                                      ({be.covered}/{be.endpoints})
                                    </span>
                                  </div>
                                  {be.uncovered > 0 ? (
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-amber-700">
                                        {be.uncovered} por cobrir
                                      </summary>
                                      <ul className="mt-1 list-disc pl-4 text-gray-700">
                                        {be.uncoveredList.map((u: string) => (
                                          <li key={u} className="truncate">{u}</li>
                                        ))}
                                      </ul>
                                    </details>
                                  ) : (
                                    <div className="text-xs text-emerald-700">Sem lacunas</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          )}

                          {scope !== 'backend' && (
                            <td className="px-4 py-3">
                              {fe ? (
                                <div className="space-y-1">
                                  <div className="text-gray-900">
                                    {fmtPct(fe.coveragePct)}{' '}
                                    <span className="text-xs text-gray-500">
                                      ({fe.covered}/{fe.routes})
                                    </span>
                                  </div>
                                  {fe.uncovered > 0 ? (
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-amber-700">
                                        {fe.uncovered} por cobrir
                                      </summary>
                                      <ul className="mt-1 list-disc pl-4 text-gray-700">
                                        {fe.uncoveredList.map((u: string) => (
                                          <li key={u} className="truncate">{u}</li>
                                        ))}
                                      </ul>
                                    </details>
                                  ) : (
                                    <div className="text-xs text-emerald-700">Sem lacunas</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          )}

                          <td className="px-4 py-3">
                            <div className="text-gray-900">
                              {grantsUnused.length}{' '}
                              <span className="text-xs text-gray-500">não usados</span>
                            </div>
                            {grantsUnused.length > 0 && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-amber-700">
                                  Ver lista
                                </summary>
                                <ul className="mt-1 list-disc pl-4 text-gray-700">
                                  {grantsUnused.map((g: string) => (
                                    <li key={g} className="truncate">{g}</li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {conflicts.length > 0 ? (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-rose-700">
                                  {conflicts.length} conflito(s)
                                </summary>
                                <ul className="mt-1 list-disc pl-4 text-gray-700 max-w-[28rem]">
                                  {conflicts.map((c: string, i: number) => (
                                    <li key={i} className="truncate" title={c}>
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            ) : (
                              <span className="text-xs text-emerald-700">Sem conflitos</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={getCatalogEditorLink(row.service)}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                title="Abrir Catálogo focado neste serviço"
                              >
                                Ver lacunas no Catálogo
                              </a>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(row.service)}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                title="Copiar o ID do serviço"
                              >
                                Copiar ID
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Rodapé: saúde do catálogo */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-gray-600">Saúde do catálogo:</span>
                  <span className="rounded-md bg-gray-200 px-2 py-1 text-gray-700">
                    Órfãos BE: {report?.catalogHealth?.unknownEndpointsInRules?.length ?? 0}
                  </span>
                  <span className="rounded-md bg-gray-200 px-2 py-1 text-gray-700">
                    Órfãos FE: {report?.catalogHealth?.unknownRoutesInRules?.length ?? 0}
                  </span>
                  <span className="rounded-md bg-gray-200 px-2 py-1 text-gray-700">
                    Duplicados: {report?.catalogHealth?.duplicates?.length ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Recomendações */}
            {report?.recommendations?.length ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-medium text-gray-900 mb-2">Recomendações</div>
                <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                  {report.recommendations.slice(0, 200).map((r, i) => (
                    <li key={i}>
                      <span className="text-gray-500">{r.type}:</span>{' '}
                      <strong>{r.where}</strong> &mdash; {r.service}{' '}
                      <span className="text-gray-500">&rarr;</span> {r.item}
                    </li>
                  ))}
                </ul>
                {report.recommendations.length > 200 && (
                  <div className="mt-2 text-xs text-gray-500">
                    (Mostradas as primeiras 200 entradas)
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </SettingsSectionCard>
    </div>
  );
}