import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Label } from '../../../../components/ui/Label';
import {
  listSecurityAudit,
  previewUndoSection,
  undoSection,
  previewRestoreSection,
  restoreSection,
  previewUndoBundle,
  undoBundle,
  previewRestoreBundle,
  restoreBundle,
} from '../../../../services/api';

type Section = 'security'|'security_catalog'|'service_registry';
type Mode = 'undo'|'restore';
type Which = 'before'|'after';

export default function SecurityUndoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>('undo'); // undo | restore
  const [scope, setScope] = useState<'section'|'bundle'>('section');
  const [section, setSection] = useState<Section>('security');
  const [which, setWhich] = useState<Which>('after'); // só para restore
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [auditId, setAuditId] = useState<number|undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [result, setResult] = useState<any|null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPreview(null);
    setResult(null);
    setAuditId(undefined);
    // Carregar lista inicial se scope=section
    const load = async () => {
      if (scope === 'section') {
        const res = await listSecurityAudit(section, 50);
        setAuditItems(res.items ?? []);
      } else {
        setAuditItems([]); // bundle trata ids automaticamente, podes permitir inserir ids manualmente se quiseres
      }
    };
    load().catch(e => setError(e?.message ?? 'Falha a carregar auditoria'));
  }, [open, section, scope]);

  const doPreview = async () => {
    setError(null);
    setResult(null);
    setPreview(null);
    setLoading(true);
    try {
      let res: any;
      if (scope === 'section') {
        if (mode === 'undo') {
          res = await previewUndoSection(section, auditId);
        } else {
          if (typeof auditId !== 'number') throw new Error('Seleciona um registo de auditoria para RESTORE.');
          res = await previewRestoreSection(section, auditId, which);
        }
      } else {
        if (mode === 'undo') {
          res = await previewUndoBundle();
        } else {
          res = await previewRestoreBundle(undefined, which);
        }
      }
      setPreview(res);
    } catch (e:any) {
      setError(e?.message ?? 'Falha no preview.');
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      let res: any;
      if (scope === 'section') {
        if (mode === 'undo') {
          res = await undoSection(section, auditId);
        } else {
          if (typeof auditId !== 'number') throw new Error('Seleciona um registo de auditoria para RESTORE.');
          res = await restoreSection(section, auditId, which);
        }
      } else {
        if (mode === 'undo') {
          res = await undoBundle();
        } else {
          res = await restoreBundle(undefined, which);
        }
      }
      setResult(res);
    } catch (e:any) {
      setError(e?.message ?? 'Falha ao aplicar.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="w-[min(92vw,900px)] rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Desfazer / Repor (Segurança)</div>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>

        <div className="p-4 space-y-3">
          {error && <div className="text-sm text-rose-700">{error}</div>}
          {result && <div className="text-sm text-emerald-700">Operação concluída.</div>}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Escopo</Label>
              <select value={scope} onChange={(e)=>setScope(e.target.value as any)} className="w-full border rounded px-2 py-1">
                <option value="section">Secção</option>
                <option value="bundle">Bundle (3 secções)</option>
              </select>
            </div>
            <div>
              <Label>Ação</Label>
              <select value={mode} onChange={(e)=>setMode(e.target.value as any)} className="w-full border rounded px-2 py-1">
                <option value="undo">Undo (snapshot anterior)</option>
                <option value="restore">Repor (snapshot específico)</option>
              </select>
            </div>

            {scope === 'section' && (
              <div>
                <Label>Secção</Label>
                <select value={section} onChange={(e)=>setSection(e.target.value as any)} className="w-full border rounded px-2 py-1">
                  <option value="security">security</option>
                  <option value="security_catalog">security_catalog</option>
                  <option value="service_registry">service_registry</option>
                </select>
              </div>
            )}

            {mode === 'restore' && (
              <div>
                <Label>Snapshot</Label>
                <select value={which} onChange={(e)=>setWhich(e.target.value as any)} className="w-full border rounded px-2 py-1">
                  <option value="after">after (estado após a alteração)</option>
                  <option value="before">before (estado anterior à alteração)</option>
                </select>
              </div>
            )}
          </div>

          {/* Lista de auditoria (apenas para secção) */}
          {scope === 'section' && (
            <div>
              <Label>Registo de auditoria</Label>
              <div className="text-xs text-gray-600 mb-1">Escolhe a alteração a reverter/repor (se deixares vazio no UNDO, usa a última).</div>
              <select
                value={auditId ?? ''}
                onChange={(e)=>setAuditId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="">— (última)</option>
                {auditItems.map((a:any)=>(
                  <option key={a.id} value={a.id}>
                    #{a.id} • {a.action} • {new Date(a.changedAt).toLocaleString()} • {a.actor ?? 'system'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={doPreview} disabled={loading}>
              {loading ? 'A preparar preview…' : 'Preview'}
            </Button>
            <Button onClick={apply} disabled={loading || !preview}>
              {loading ? 'A aplicar…' : (mode === 'undo' ? 'Desfazer' : 'Repor')}
            </Button>
          </div>

          {/* PREVIEW */}
          {preview && (
            <div className="mt-2 border rounded p-3 bg-gray-50 text-sm overflow-auto max-h-[45vh]">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(preview.summary ?? preview, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}