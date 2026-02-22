import * as React from 'react';
import { StandardCard } from '../../ui/StandardCard';
import { Button } from '../../ui/Button';
import { Trash2 } from 'lucide-react';
import { EventFieldDefinitionData } from '../../../types/event';

export function FormFieldsListCard({
  fieldDefinitions,
  setFieldDefinitions,
  deleteField,
  reorderFields,
}: {
  fieldDefinitions: EventFieldDefinitionData[];
  setFieldDefinitions: React.Dispatch<React.SetStateAction<EventFieldDefinitionData[]>>;
  deleteField: (fieldId: string) => void;
  reorderFields: (updated: EventFieldDefinitionData[]) => void;
}) {
  const [dragging, setDragging] = React.useState<EventFieldDefinitionData | null>(null);

  const onDragStart = (e: React.DragEvent, field: EventFieldDefinitionData) => {
    setDragging(field);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', field.id);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const onDrop = (e: React.DragEvent<HTMLDivElement>, target: EventFieldDefinitionData) => {
    e.preventDefault();
    if (!dragging || dragging.id === target.id) return;
    const a = fieldDefinitions.findIndex(f => f.id === dragging.id);
    const b = fieldDefinitions.findIndex(f => f.id === target.id);
    if (a === -1 || b === -1) return;

    const next = [...fieldDefinitions];
    const [item] = next.splice(a, 1);
    next.splice(b, 0, item);
    const withOrder = next.map((f, i) => ({ ...f, order: i }));
    setFieldDefinitions(withOrder);
    reorderFields(withOrder);
    setDragging(null);
  };
  const onDragEnd = () => setDragging(null);

  return (
    <StandardCard title="Campos do Formulário" description="Ordene, remova e organize os campos.">
      <div className="space-y-3">
        {fieldDefinitions.length === 0 ? (
          <p className="text-gray-600 text-center">Nenhum campo definido.</p>
        ) : (
          fieldDefinitions.map(field => (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => onDragStart(e, field)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, field)}
              onDragEnd={onDragEnd}
              className={[
                "flex items-center justify-between bg-gray-50 p-3 rounded-md shadow-sm border",
                dragging?.id === field.id ? 'opacity-50' : '',
              ].join(' ')}
            >
              <div>
                <p className="font-medium">{field.fieldName} ({field.fieldType})</p>
                <p className="text-sm text-gray-600">Obrigatório: {field.isRequired ? 'Sim' : 'Não'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteField(field.id)} className="text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </StandardCard>
  );
}