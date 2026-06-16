// src/features/settings/entity-sources/EntitySourcesTab.tsx
import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Drawer } from '../../../components/patterns/Drawer';

import { Plus, RefreshCcw, Database, Edit3 } from 'lucide-react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEntitySources, saveEntitySources, testEntitySource } from '../../../services/entitySourcesApi';

type EntitySource = {
  label: string;
  endpoint: string;
  scope: 'platform' | 'company';
  valueField: string;
  labelField: string;
  filters?: Record<string, any>;
};

export default function EntitySourcesTab({ onHeaderActionsChange }: { onHeaderActionsChange?: (actions: React.ReactNode) => void }) {
  const queryClient = useQueryClient();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);

  const { data: sources = {}, isLoading } = useQuery<Record<string, EntitySource>>({
    queryKey: ['entitySources'],
    queryFn: fetchEntitySources,
  });

  const [form, setForm] = useState<EntitySource>({
    label: '',
    endpoint: '',
    scope: 'company',
    valueField: 'id',
    labelField: 'name',
    filters: {},
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (values: Record<string, EntitySource>) => saveEntitySources(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entitySources'] });
      setDrawerOpen(false);
    },
  });

  // Test mutation
  const testMutation = useMutation({
    mutationFn: (params: { entity: string }) => testEntitySource(params.entity),
    onSuccess: (res: any) => setPreview(res.items),
    onError: () => setPreview([{ error: 'Falha ao testar endpoint.' }]),
  });

  // Header actions
  useEffect(() => {
    if (onHeaderActionsChange) {
      onHeaderActionsChange(
        <Button onClick={() => { setEditingKey(null); setForm({
          label: '',
          endpoint: '',
          scope: 'company',
          valueField: 'id',
          labelField: 'name',
          filters: {},
        }); setDrawerOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Adicionar Source
        </Button>
      );
    }
  }, [onHeaderActionsChange]);

  if (isLoading) return <div className="p-4">A carregar entity sources…</div>;

  const handleEdit = (key: string) => {
    setEditingKey(key);
    setForm(sources[key]);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    const updated = { ...sources, [editingKey || form.label.toLowerCase()]: form };
    saveMutation.mutate(updated);
  };

  return (
    <div className="p-4 space-y-6">

      {/* Lista dos sources */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

{Object.entries(sources).map(([key, src]) => {
  const cast = src as EntitySource; // 👈 ADIÇÃO
  
  return (

          <Card key={key} className="p-4 shadow-sm border flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Database className="w-5 h-5" />
                {cast.label}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(key)}>
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              <div><strong>ID interno:</strong> {key}</div>
              <div><strong>Endpoint:</strong> {cast.endpoint}</div>
              <div><strong>Scope:</strong> {cast.scope}</div>
              <div><strong>Value / Label:</strong> {cast.valueField} / {cast.labelField}</div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => testMutation.mutate({ entity: key })}
            >
              <RefreshCcw className="w-4 h-4 mr-1" />
              Testar ligação
            </Button>
          </Card>
        )})}
      </div>

      {/* PREVIEW modal simples */}
      {preview && (
        <div className="border bg-white p-4 rounded shadow-md">
          <h3 className="font-semibold mb-2">Preview</h3>
          <pre className="text-sm bg-gray-100 p-2 rounded max-h-64 overflow-auto">
            {JSON.stringify(preview, null, 2)}
          </pre>
          <Button className="mt-2" onClick={() => setPreview(null)}>Fechar</Button>
        </div>
      )}

      {/* Drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Entity Source" size="lg">
        <div className="p-4 flex flex-col gap-3">
          <div>
            <Label>ID interno (ex: services)</Label>
            <Input
              value={editingKey || ''}
              disabled={!!editingKey}
              onChange={(e) => !editingKey && setEditingKey(e.target.value)}
            />
          </div>

          <div>
            <Label>Label (nome amigável)</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>

          <div>
            <Label>Endpoint</Label>
            <Input
              value={form.endpoint}
              onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
              placeholder="/services"
            />
          </div>

          <div>
            <Label>Scope</Label>
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value as any })}
              className="border rounded h-9 px-2"
            >
              <option value="company">company</option>
              <option value="platform">platform</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>valueField</Label>
              <Input value={form.valueField} onChange={(e) => setForm({ ...form, valueField: e.target.value })} />
            </div>
            <div>
              <Label>labelField</Label>
              <Input value={form.labelField} onChange={(e) => setForm({ ...form, labelField: e.target.value })} />
            </div>
          </div>

          <Button className="mt-4" onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </Drawer>
    </div>
  );
}