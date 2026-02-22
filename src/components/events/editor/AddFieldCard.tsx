import * as React from 'react';
import { StandardCard } from '../../ui/StandardCard';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Checkbox } from '../../ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { EventFieldDefinitionData, EventFieldType } from '../../../types/event';

export function AddFieldCard({
  checkboxFields,
  onAddField,
}: {
  checkboxFields: EventFieldDefinitionData[];
  onAddField: (payload: {
    fieldName: string;
    fieldType: EventFieldType;
    isRequired: boolean;
    placeholder?: string;
    options?: string[];
    isGroupingField?: boolean;
    dependsOnFieldDefinitionId?: string;
  }) => void;
}) {
  const [newFieldName, setNewFieldName] = React.useState('');
  const [newFieldType, setNewFieldType] = React.useState<EventFieldType>(EventFieldType.TEXT);
  const [newFieldIsRequired, setNewFieldIsRequired] = React.useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = React.useState('');
  const [newFieldOptions, setNewFieldOptions] = React.useState('');
  const [newFieldIsGrouping, setNewFieldIsGrouping] = React.useState(false);
  const [newFieldDependsOn, setNewFieldDependsOn] = React.useState<string>('NONE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName) return;
    onAddField({
      fieldName: newFieldName,
      fieldType: newFieldType,
      isRequired: newFieldIsRequired,
      placeholder: newFieldPlaceholder || undefined,
      options: newFieldType === EventFieldType.DROPDOWN
        ? newFieldOptions.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      isGroupingField: newFieldIsGrouping,
      dependsOnFieldDefinitionId: newFieldDependsOn !== 'NONE' ? newFieldDependsOn : undefined,
    });
    // reset
    setNewFieldName(''); setNewFieldType(EventFieldType.TEXT);
    setNewFieldIsRequired(false); setNewFieldPlaceholder('');
    setNewFieldOptions(''); setNewFieldIsGrouping(false); setNewFieldDependsOn('NONE');
  };

  return (
    <StandardCard title="Adicionar Novo Campo">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="newFieldName">Nome</Label>
          <Input id="newFieldName" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} required />
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="newFieldType">Tipo</Label>
          <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as EventFieldType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(EventFieldType).map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {newFieldType === EventFieldType.DROPDOWN && (
          <div className="grid w-full items-center gap-1.5">
            <Label>Opções (CSV)</Label>
            <Input value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} />
          </div>
        )}

        <div className="grid w-full items-center gap-1.5">
          <Label>Placeholder</Label>
          <Input value={newFieldPlaceholder} onChange={(e) => setNewFieldPlaceholder(e.target.value)} />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox id="req" checked={newFieldIsRequired} onCheckedChange={(c) => setNewFieldIsRequired(Boolean(c))} />
            <Label htmlFor="req">Obrigatório</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="grp" checked={newFieldIsGrouping} onCheckedChange={(c) => setNewFieldIsGrouping(Boolean(c))} />
            <Label htmlFor="grp">Agrupar (Irmãos)</Label>
          </div>
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label>Condição de Visibilidade</Label>
          <Select value={newFieldDependsOn} onValueChange={setNewFieldDependsOn}>
            <SelectTrigger><SelectValue placeholder="Mostrar sempre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">-- Mostrar sempre --</SelectItem>
              {checkboxFields.map(f => (
                <SelectItem key={f.id} value={f.id}>Se "{f.fieldName}" marcado</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button type="submit" className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-primary text-white hover:opacity-95 transition-colors">
          Adicionar Campo
        </button>
      </form>
    </StandardCard>
  );
}