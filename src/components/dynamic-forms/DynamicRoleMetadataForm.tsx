// src/components/dynamic-forms/DynamicRoleMetadataForm.tsx

import React, { useState, useEffect } from 'react';

import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import ChipsInputModern from '../../components/ui/ChipsInputModern';

import { useEntitySourceSuggestions } from '../../hooks/useEntitySourceSuggestions';
import type { Suggestion } from '../../hooks/useEntitySourceSuggestions';

/* -------------------------------------------------------------
   Novo HOOK — a solução correta e final
------------------------------------------------------------- */

function useMetadataSuggestions(
  fields: Record<string, any>,
  companyId?: string | null
) {
  const [suggestionsByField, setSuggestionsByField] = useState<
    Record<string, Suggestion[]>
  >({});

  useEffect(() => {
    let active = true;

    async function load() {
      const acc: Record<string, Suggestion[]> = {};

      for (const [key, def] of Object.entries(fields)) {
        if (def.type === "uuid[]" && def.source?.entity) {
          try {
            const data = await fetchSuggestions(def.source.entity, companyId);
            if (active) acc[key] = data;
          } catch {
            if (active) acc[key] = [];
          }
        }
      }

      if (active) setSuggestionsByField(acc);
    }

    load();
    return () => { active = false; };
  }, [fields, companyId]);

  return suggestionsByField;
}

/* -------------------------------------------------------------
   Função auxiliar para obter sugestões
------------------------------------------------------------- */

async function fetchSuggestions(entity: string, companyId?: string | null) {
  const qs = companyId ? `?companyId=${companyId}` : "";
  const res = await fetch(`/platform-settings/entity-sources/test?entity=${entity}${qs}`, { credentials: "include" });

  if (!res.ok) return [];
  const json = await res.json();
  return json.items || [];
}

/* -------------------------------------------------------------
   DynamicRoleMetadataForm
------------------------------------------------------------- */

type FieldDef = {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'uuid' | 'uuid[]';
  options?: string[];
  source?: { entity: string };
};

interface Props {
  fields: Record<string, FieldDef>;
  uiSchema?: Record<string, any>;
  data: Record<string, any>;
  companyId?: string | null;
  onSave: (patch: Record<string, any>) => Promise<void> | void;
}

export default function DynamicRoleMetadataForm({
  fields,
  uiSchema = {},
  data,
  companyId,
  onSave,
}: Props) {

  const safeFields: Record<string, FieldDef> = fields ?? {};
  const safeUiSchema: Record<string, any> = uiSchema ?? {};
  const safeData: Record<string, any> = data ?? {};

  const [form, setForm] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ sugestões carregadas de forma segura
  const suggestionsByField = useMetadataSuggestions(safeFields, companyId);

  // inicializar
  useEffect(() => {
    setForm(safeData || {});
  }, [safeData]);

  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const patch: Record<string, any> = {};

    for (const key of Object.keys(safeFields)) {
      if (form[key] !== safeData[key]) patch[key] = form[key];
    }

    await onSave(patch);
    setDirty(false);
    setSaving(false);
  };

  const renderField = (key: string, def: FieldDef) => {
    const value = form[key];
    const ui = safeUiSchema[key] || {};
    const label = ui.label || key;
    const placeholder = ui.placeholder || '';

    const suggestions = suggestionsByField[key] || [];

    return (
      <div key={key} className="flex flex-col gap-1 mb-4">
        <Label className="text-sm font-medium text-gray-700">{label}</Label>

        {def.type === 'string' && (
          <Input
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => updateField(key, e.target.value)}
          />
        )}

        {def.type === 'number' && (
          <Input
            type="number"
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => updateField(key, Number(e.target.value))}
          />
        )}

        {def.type === 'boolean' && (
          <Switch checked={!!value} onCheckedChange={(v) => updateField(key, v)} />
        )}

        {def.type === 'enum' && (
          <select
            className="border rounded h-9 px-2 bg-white"
            value={value || ''}
            onChange={(e) => updateField(key, e.target.value)}
          >
            {(def.options || []).map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        )}

        {def.type === 'uuid' && (
          <Input
            value={value || ''}
            placeholder={placeholder}
            onChange={(e) => updateField(key, e.target.value)}
          />
        )}

        {def.type === 'uuid[]' && (
          <ChipsInputModern
            values={value || []}
            onChange={(vals) => updateField(key, vals)}
            suggestions={suggestions.map((s) => s.label)}
            placeholder={placeholder}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {Object.keys(safeFields).map((key) => renderField(key, safeFields[key]))}

      <div className="flex justify-end pt-4">
        <Button disabled={!dirty || saving} onClick={handleSave}>
          {saving ? 'A guardar…' : 'Guardar alterações'}
        </Button>
      </div>
    </div>
  );
}