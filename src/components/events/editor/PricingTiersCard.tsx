import * as React from 'react';
import { StandardCard } from '../../ui/StandardCard';
import { Input } from '../../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { Label } from '../../ui/Label';
import { Trash2, Plus } from 'lucide-react';
import { EventFieldDefinitionData, EventPricingTier } from '../../../types/event';

export function PricingTiersCard({
  pricingTiers,
  addPricingTier,
  removePricingTier,
  checkboxFields,
}: {
  pricingTiers: EventPricingTier[];
  addPricingTier: (tier: Partial<EventPricingTier>) => void;
  removePricingTier: (index: number) => void;
  checkboxFields: EventFieldDefinitionData[];
}) {
  const [newTierName, setNewTierName] = React.useState('');
  const [newTierPrice, setNewTierPrice] = React.useState<number | ''>('');
  const [newTierMultiPrice, setNewTierMultiPrice] = React.useState<number | ''>('');
  const [newTierDesc, setNewTierDesc] = React.useState('');
  const [newTierConditionFieldId, setNewTierConditionFieldId] = React.useState<string>('NONE');

  const handleAddTier = () => {
    if (!newTierName || newTierPrice === '') return;
    addPricingTier({
      name: newTierName,
      price: Number(newTierPrice),
      multiRegistrationPrice: newTierMultiPrice !== '' ? Number(newTierMultiPrice) : undefined,
      description: newTierDesc,
      requiredFieldDefinitionId: newTierConditionFieldId !== 'NONE' ? newTierConditionFieldId : undefined,
    });
    setNewTierName('');
    setNewTierPrice('');
    setNewTierMultiPrice('');
    setNewTierDesc('');
    setNewTierConditionFieldId('NONE');
  };

  return (
    <StandardCard title="Tabela de Preços" description="Configure diferentes tarifas e condições.">
      {/* Lista */}
      {pricingTiers.length > 0 && (
        <div className="space-y-2 mb-4">
          {pricingTiers.map((tier, idx) => (
            <div key={idx} className="flex items-center justify-between bg-white p-3 border rounded-md shadow-sm">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {tier.name}
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-bold">
                    {Number(tier.price).toFixed(2)}€
                  </span>
                  {tier.multiRegistrationPrice && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold">
                      Grupo: {Number(tier.multiRegistrationPrice).toFixed(2)}€
                    </span>
                  )}
                  {tier.requiredFieldDefinitionId && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">Condicional</span>
                  )}
                </div>
                {tier.description && <div className="text-xs text-gray-500">{tier.description}</div>}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removePricingTier(idx)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de criação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 items-end bg-white p-3 rounded border">
        <div className="lg:col-span-2 space-y-1">
          <Label className="text-xs">Nome</Label>
          <Input value={newTierName} onChange={e => setNewTierName(e.target.value)} placeholder="Ex: Sócio" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Preço (€)</Label>
          <Input type="number" value={newTierPrice as any} onChange={e => setNewTierPrice(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Preço Grupo (€)</Label>
          <Input type="number" value={newTierMultiPrice as any} onChange={e => setNewTierMultiPrice(Number(e.target.value))} placeholder="Opcional" />
        </div>

        <div className="lg:col-span-2 space-y-1">
          <Label className="text-xs">Descrição</Label>
          <Input value={newTierDesc} onChange={e => setNewTierDesc(e.target.value)} placeholder="Detalhes..." />
        </div>

        <div className="lg:col-span-2 space-y-1">
          <Label className="text-xs">Condição (Requer Checkbox)</Label>
          <Select value={newTierConditionFieldId} onValueChange={setNewTierConditionFieldId}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Sem condição" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">-- Nenhuma --</SelectItem>
              {checkboxFields.map(f => (
                <SelectItem key={f.id} value={f.id}>Requer: {f.fieldName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-4 flex justify-end mt-2">
          <Button type="button" onClick={handleAddTier} disabled={!newTierName || newTierPrice === ''} size="sm">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Tarifa
          </Button>
        </div>
      </div>
    </StandardCard>
  );
}