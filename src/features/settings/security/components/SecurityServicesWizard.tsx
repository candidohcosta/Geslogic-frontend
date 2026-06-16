// frontend/src/features/settings/security/components/SecurityServicesWizard.tsx
import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { SettingsSectionCard } from '../../../../components/templates/SettingsSectionCard';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Label } from '../../../../components/ui/Label';

import {
  upsertServiceRegistry,
  detectFrontendPrefixes,
  exportServicesRegistryConfig,
  type ServiceRegistryUpsert,
} from '../../../../services/api';

/**
 * Wizard inteligente para criar um novo módulo/serviço no registo dinâmico.
 *
 * Fluxo:
 * 1) ID + Nome
 * 2) Sugestão de globs (backend) com base no ID
 * 3) Sugestões de routePrefixes (FE) via autodetector (backend)
 * 4) Sugestão de grantPrefixes (heurística) + edição
 * 5) Pré-visualização e criação
 *
 * Integração:
 *  - Coloca este componente na página de Registo de Serviços (ex.: SecurityServicesRegistryPage)
 *  - Podes mostrá-lo inline ou num modal. Aqui vai inline.
 */

type Step = 1 | 2 | 3 | 4 | 5;

function toKebabCase(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-');
}

function defaultGlobsForId(id: string): string[] {
  // Heurística simples: src/<kebab>/** ; src/<kebab>/backend/** (casos comuns)
  const keb = toKebabCase(id);
  const candidates = new Set<string>([
    `src/${keb}/**`,
    `src/${keb}-management/**`,
    `src/${keb}/backend/**`,
  ]);
  return Array.from(candidates);
}

function suggestGrantPrefixFromId(id: string): string {
  // Heurística: primeira "palavra" do id + ":" -> QUEUE_MANAGEMENT -> "queue:"
  const core = id.split('_')[0]?.toLowerCase() ?? 'service';
  return `${core}:`;
}

export default function SecurityServicesWizard() {
  const qc = useQueryClient();

  // ===== Navegação de passos =====
  const [step, setStep] = useState<Step>(1);

  // ===== Form principal =====
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [globs, setGlobs] = useState<string[]>([]);
  const [routePrefixes, setRoutePrefixes] = useState<string[]>([]);
  const [grantPrefixes, setGrantPrefixes] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // ===== Sugestões (FE) =====
  const [isDetecting, setIsDetecting] = useState(false);
  const [suggestedPrefixes, setSuggestedPrefixes] = useState<string[]>([]);
  const [suggestErr, setSuggestErr] = useState<string | null>(null);

  // ===== Mutations =====
  const upsertMut = useMutation({
    mutationFn: async () => {
      if (!id.trim()) throw new Error('ID é obrigatório.');
      if (!name.trim()) throw new Error('Nome é obrigatório.');
      const payload: ServiceRegistryUpsert = {
        id: id.trim(),
        name: name.trim(),
        globs,
        routePrefixes,
        grantPrefixes,
        active,
      };
      return upsertServiceRegistry(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services-registry'] });
    },
  });

  const exportMut = useMutation({
    mutationFn: exportServicesRegistryConfig,
  });

  // ===== Helpers de edição =====
  const addRoutePrefix = (p: string) => {
    const set = new Set(routePrefixes);
    set.add(p);
    setRoutePrefixes(Array.from(set));
  };
  const removeRoutePrefix = (p: string) => {
    setRoutePrefixes(routePrefixes.filter(x => x !== p));
  };

  const addGrantPrefix = (p: string) => {
    const set = new Set(grantPrefixes);
    set.add(p);
    setGrantPrefixes(Array.from(set));
  };
  const removeGrantPrefix = (p: string) => {
    setGrantPrefixes(grantPrefixes.filter(x => x !== p));
  };

  const addGlob = (g: string) => {
    const set = new Set(globs);
    set.add(g);
    setGlobs(Array.from(set));
  };
  const removeGlob = (g: string) => {
    setGlobs(globs.filter(x => x !== g));
  };

  const canGoNext = useMemo(() => {
    if (step === 1) return id.trim().length > 0 && name.trim().length > 0;
    if (step === 2) return globs.length > 0;
    if (step === 3) return true; // routePrefixes opcionais (podes criar e ajustar depois)
    if (step === 4) return grantPrefixes.length > 0;
    if (step === 5) return true;
    return false;
  }, [step, id, name, globs, routePrefixes, grantPrefixes]);

  const onNext = () => {
    setError(null);
    if (!canGoNext) {
      setError('Preenche os campos obrigatórios antes de avançar.');
      return;
    }
    setStep((s) => (Math.min(5, (s + 1)) as Step));
  };
  const onBack = () => {
    setError(null);
    setStep((s) => (Math.max(1, (s - 1)) as Step));
  };
  const onReset = () => {
    setError(null);
    setStep(1);
    setId('');
    setName('');
    setGlobs([]);
    setRoutePrefixes([]);
    setGrantPrefixes([]);
    setActive(true);
    setSuggestedPrefixes([]);
    setSuggestErr(null);
  };

  // ===== Ações do passo 2 (globs) =====
  const suggestGlobsNow = () => {
    const defaults = defaultGlobsForId(id);
    const set = new Set(globs);
    defaults.forEach(d => set.add(d));
    setGlobs(Array.from(set));
  };

  // ===== Ações do passo 3 (FE detection) =====
  const detectPrefixesNow = async () => {
    setSuggestErr(null);
    setSuggestedPrefixes([]);
    setIsDetecting(true);
    try {
      const res = await detectFrontendPrefixes(id.trim() || undefined);
      if (!res?.ok) {
        setSuggestErr('Falha a detetar rotas no frontend.');
      } else {
        setSuggestedPrefixes(res.suggestedPrefixes ?? []);
      }
    } catch (e: any) {
      setSuggestErr(e?.message ?? 'Erro ao detetar rotas.');
    } finally {
      setIsDetecting(false);
    }
  };

  // ===== Ações do passo 5 (criar) =====
  const onCreate = async () => {
    setError(null);
    try {
      await upsertMut.mutateAsync();
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao criar o serviço.');
      return;
    }
    // (Opcional) escrever JSON para o scanner
    try { await exportMut.mutateAsync(); } catch {}
  };

  // ===== Sugestão inicial (quando o ID é preenchido) =====
  const onIdBlur = () => {
    if (!name.trim()) {
      // título simples a partir do ID
      const tentative = id
        .toLowerCase()
        .split('_')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
      setName(tentative);
    }
    if (grantPrefixes.length === 0) {
      addGrantPrefix(suggestGrantPrefixFromId(id));
    }
  };

  return (
    <SettingsSectionCard
      accent
      title="Criar novo Módulo (Assistido)"
      description="Wizard inteligente para criar um novo serviço/módulo no registo dinâmico."
    >
      {/* Erro global */}
      {error && <div className="mb-3 text-sm text-rose-700">{error}</div>}

      {/* Passos */}
      <div className="mb-3 text-xs text-gray-600">
        <span className={step >= 1 ? 'font-semibold text-gray-900' : ''}>1. Identificação</span> &rarr;{' '}
        <span className={step >= 2 ? 'font-semibold text-gray-900' : ''}>2. Globs (backend)</span> &rarr;{' '}
        <span className={step >= 3 ? 'font-semibold text-gray-900' : ''}>3. Prefixos FE</span> &rarr;{' '}
        <span className={step >= 4 ? 'font-semibold text-gray-900' : ''}>4. Grants</span> &rarr;{' '}
        <span className={step >= 5 ? 'font-semibold text-gray-900' : ''}>5. Criar</span>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>ID do serviço</Label>
              <Input
                value={id}
                onChange={(e) => setId(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                onBlur={onIdBlur}
                placeholder="ex.: QUEUE_MANAGEMENT"
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex.: Filas de Atendimento"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              O ID deve ser único. Usa UPPER_SNAKE_CASE (ex.: PROCESS_MANAGEMENT).
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onNext} disabled={!canGoNext}>Seguinte</Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label>Globs (backend)</Label>
              <Button variant="outline" onClick={suggestGlobsNow}>Sugerir globs</Button>
            </div>
            <div className="text-xs text-gray-600 mb-1">
              Diretórios do backend onde vivem controladores/resolvers do módulo.
            </div>

            <div className="flex flex-wrap gap-2">
              {globs.map(g => (
                <span key={g} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs bg-white">
                  <span className="text-gray-800">{g}</span>
                  <button
                    type="button"
                    onClick={() => removeGlob(g)}
                    className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200"
                    title="Remover"
                  >
                    Remover
                  </button>
                </span>
              ))}
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

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBack}>Voltar</Button>
            <Button onClick={onNext} disabled={!canGoNext}>Seguinte</Button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Prefixos de rotas (Frontend)</Label>
            <Button variant="outline" onClick={detectPrefixesNow} disabled={isDetecting}>
              {isDetecting ? 'A analisar FE…' : '🔍 Sugerir automaticamente'}
            </Button>
          </div>
          <div className="text-xs text-gray-600">
            O autodetector varre o código do frontend e sugere prefixos por 1º segmento (ex.: /events, /operator).
          </div>

          {suggestErr && <div className="text-sm text-rose-700">{suggestErr}</div>}

          {/* SUGESTÕES */}
          {suggestedPrefixes.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-600">Sugestões:</div>
              <div className="flex flex-wrap gap-2">
                {suggestedPrefixes.map((p) => (
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

          {/* SELECIONADOS */}
          <div className="space-y-1">
            <div className="text-xs text-gray-600">Selecionados:</div>
            <div className="flex flex-wrap gap-2">
              {routePrefixes.map((p) => (
                <span key={p} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs bg-white">
                  <span className="text-gray-800">{p}</span>
                  <button
                    type="button"
                    onClick={() => removeRoutePrefix(p)}
                    className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200"
                  >
                    Remover
                  </button>
                </span>
              ))}
              {routePrefixes.length === 0 && <span className="text-xs text-gray-500">—</span>}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBack}>Voltar</Button>
            <Button onClick={onNext} disabled={!canGoNext}>Seguinte</Button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Grant prefixes</Label>
            <div className="text-xs text-gray-600">Ex.: queue:, events:, process:</div>
          </div>

          <div className="flex flex-wrap gap-2">
            {grantPrefixes.map((p) => (
              <span key={p} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs bg-white">
                <span className="text-gray-800">{p}</span>
                <button
                  type="button"
                  onClick={() => removeGrantPrefix(p)}
                  className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200"
                >
                  Remover
                </button>
              </span>
            ))}
            {grantPrefixes.length === 0 && <span className="text-xs text-gray-500">—</span>}
          </div>

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

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBack}>Voltar</Button>
            <Button onClick={onNext} disabled={!canGoNext}>Seguinte</Button>
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Pré‑visualização</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">ID</div>
                <div className="text-gray-900">{id || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Nome</div>
                <div className="text-gray-900">{name || '—'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-gray-500">Globs</div>
                <div className="text-gray-900">{globs.join(', ') || '—'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-gray-500">Route prefixes</div>
                <div className="text-gray-900">{routePrefixes.join(', ') || '—'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-gray-500">Grant prefixes</div>
                <div className="text-gray-900">{grantPrefixes.join(', ') || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Ativo</div>
                <div className="text-gray-900">{active ? 'Sim' : 'Não'}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBack}>Voltar</Button>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                <span>Ativar já</span>
              </label>
              <Button onClick={onCreate} disabled={upsertMut.isPending}>
                {upsertMut.isPending ? 'A criar…' : 'Criar'}
              </Button>
            </div>
          </div>

          {(upsertMut.isSuccess || exportMut.isSuccess) && (
            <div className="text-xs text-emerald-700">
              Serviço criado com sucesso{exportMut.isSuccess ? ' e JSON exportado para o scanner' : ''}. Podes correr o Scan (dry) no Catálogo.
            </div>
          )}
          {upsertMut.isError && (
            <div className="text-xs text-rose-700">
              {(upsertMut.error as Error)?.message ?? 'Falha ao criar.'}
            </div>
          )}
        </div>
      )}

      {/* Ações gerais */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" onClick={onReset}>Limpar</Button>
        <div className="flex items-center gap-2">
          {step > 1 && <Button variant="outline" onClick={onBack}>Voltar</Button>}
          {step < 5 && <Button onClick={onNext} disabled={!canGoNext}>Seguinte</Button>}
        </div>
      </div>
    </SettingsSectionCard>
  );
}