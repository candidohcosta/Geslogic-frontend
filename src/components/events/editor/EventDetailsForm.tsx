import * as React from 'react';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Textarea } from '../../ui/Textarea';
import { Checkbox } from '../../ui/Checkbox';
import { Ticket } from 'lucide-react';

export function EventDetailsForm({
  name, setName,
  description, setDescription,
  startDate, setStartDate,
  endDate, setEndDate,
  location, setLocation,
  maxParticipants, setMaxParticipants,
  waitingListMargin, setWaitingListMargin,
  baseCost, setBaseCost,
  isActive, setIsActive,
  isPublic, setIsPublic,
  enableCheckIn, setEnableCheckIn,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  maxParticipants: number | ''; setMaxParticipants: (v: number | '') => void;
  waitingListMargin: string; setWaitingListMargin: (v: string) => void;
  baseCost: number | ''; setBaseCost: (v: number | '') => void;
  isActive: boolean; setIsActive: (v: boolean) => void;
  isPublic: boolean; setIsPublic: (v: boolean) => void;
  enableCheckIn: boolean; setEnableCheckIn: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="name">Nome do Evento <span className="text-red-500">*</span></Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={3}
          maxRows={12}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="startDate">Data de Início <span className="text-red-500">*</span></Label>
          <Input type="datetime-local" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="endDate">Data de Fim</Label>
          <Input type="datetime-local" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="location">Localização <span className="text-red-500">*</span></Label>
        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="maxParticipants">Nº Máx. de Participantes</Label>
          <Input type="number" id="maxParticipants" value={maxParticipants as any} onChange={(e) => setMaxParticipants(Number(e.target.value))} min="0" />
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="waitingMargin">Margem Lista de Espera</Label>
          <Input
            id="waitingMargin"
            value={waitingListMargin}
            onChange={(e) => setWaitingListMargin(e.target.value)}
            placeholder="Ex: 10 ou 5%"
          />
          <p className="text-[10px] text-gray-500">Número fixo ou percentagem. Se exceder a lotação, entra em Lista de Espera.</p>
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="baseCost">Custo Base (€) <span className="text-red-500">*</span></Label>
          <Input type="number" id="baseCost" value={baseCost as any} onChange={(e) => setBaseCost(Number(e.target.value))} min="0" step="0.01" required />
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox id="isActive" checked={isActive} onCheckedChange={(c) => setIsActive(Boolean(c))} />
        <Label htmlFor="isActive">Evento Ativo</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="isPublic" checked={isPublic} onCheckedChange={(c) => setIsPublic(Boolean(c))} />
        <Label htmlFor="isPublic">Público</Label>
      </div>

      <div className="flex items-center space-x-2 pt-2 text-indigo-700">
        <Checkbox
          id="enableCheckIn"
          checked={enableCheckIn}
          onCheckedChange={(c) => setEnableCheckIn(Boolean(c))}
          className="border-indigo-400 data-[state=checked]:bg-indigo-600"
        />
        <Label htmlFor="enableCheckIn" className="cursor-pointer font-medium">
          Ativar Bilheteira / Check-in (Gera QR Code)
        </Label>
        <Ticket className="w-4 h-4 ml-1" />
      </div>
    </div>
  );
}