// frontend/src/pages/EditEventPage.tsx (VERSÃO FINAL CORRIGIDA)

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEventById, updateEvent, addEventField, deleteEventField, reorderEventFields } from '../services/api';
import { UserData, UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Trash2, Plus,Ticket  } from 'lucide-react';
import { SingleFileUpload } from '../components/ui/SingleFileUpload';
import { MultiFileUploadManager } from '../components/ui/MultiFileUploadManager';
import { FilePurpose } from '../types/file';
import { EventFieldType, EventData, EventFieldDefinitionData, EventPricingTier,CertificateSendingMode } from '../types/event';
import { CertificateDesigner } from '../components/events/CertificateDesigner';

const EditEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estados locais
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [waitingListMargin, setWaitingListMargin] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [enableCheckIn, setEnableCheckIn] = useState(false); 

  // --- ESTADOS DE CUSTO (IMPORTANTE: Têm de estar aqui) ---
  const [baseCost, setBaseCost] = useState<number | ''>(0);
  const [costType1, setCostType1] = useState<number | ''>('');
  const [costType2, setCostType2] = useState<number | ''>('');
  const [costType3, setCostType3] = useState<number | ''>('');
  // --------------------------------------------------------

  // --- GESTÃO DE TARIFAS ---
  const [pricingTiers, setPricingTiers] = useState<EventPricingTier[]>([]);
  
const [certificateSendingMode, setCertificateSendingMode] = useState<CertificateSendingMode>(CertificateSendingMode.MANUAL);

  // Estados para o formulário de nova tarifa
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState<number | ''>('');
  const [newTierMultiPrice, setNewTierMultiPrice] = useState<number | ''>('');
  const [newTierDesc, setNewTierDesc] = useState('');
  const [newTierConditionFieldId, setNewTierConditionFieldId] = useState<string>('NONE');

  const [fieldDefinitions, setFieldDefinitions] = useState<EventFieldDefinitionData[]>([]);
  const [newFieldDependsOn, setNewFieldDependsOn] = useState<string>('NONE');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<EventFieldType>(EventFieldType.TEXT);
  const [newFieldIsRequired, setNewFieldIsRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldIsGrouping, setNewFieldIsGrouping] = useState(false);
  
  const [success, setSuccess] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<EventFieldDefinitionData | null>(null);

  const { data: eventDetails, isLoading, error: queryError } = useQuery<EventData, Error>({
    queryKey: ['event', eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId && !!user,
  });

  useEffect(() => {
    if (eventDetails) {
      const formatForInput = (isoString: string | undefined | null) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toISOString().slice(0, 16);
      };

      setName(eventDetails.name);
      setDescription(eventDetails.description || '');
      setStartDate(formatForInput(eventDetails.startDate));
      setEndDate(formatForInput(eventDetails.endDate));
      setLocation(eventDetails.location);
      setMaxParticipants(eventDetails.maxParticipants);
      setWaitingListMargin(eventDetails.waitingListMargin || '');
      setIsActive(eventDetails.isActive);
      setIsPublic(eventDetails.isPublic);
      setEnableCheckIn((eventDetails as any).enableCheckIn ?? false);
      setCertificateSendingMode(eventDetails.certificateSendingMode || CertificateSendingMode.MANUAL);

      // Carregar custos
      setBaseCost(eventDetails.baseCost || 0);
      
      // Carregar tarifas existentes
      if (eventDetails.pricingTiers) {
          setPricingTiers(eventDetails.pricingTiers);
      }
      
      setFieldDefinitions(eventDetails.fieldDefinitions.sort((a, b) => a.order - b.order));
    }
  }, [eventDetails]);

  // --- HANDLERS DE TARIFAS ---
  const handleAddTier = () => {
    if (!newTierName || newTierPrice === '') return;
    
    setPricingTiers(prev => [
        ...prev, 
        { 
          name: newTierName,
          price: Number(newTierPrice), 
          multiRegistrationPrice: newTierMultiPrice !== '' ? Number(newTierMultiPrice) : undefined, 
          description: newTierDesc,
          requiredFieldDefinitionId: newTierConditionFieldId !== 'NONE' ? newTierConditionFieldId : undefined
        }
    ]);
    
    // Limpar form
    setNewTierName('');
    setNewTierPrice('');
    setNewTierMultiPrice('');
    setNewTierDesc('');
    setNewTierConditionFieldId('NONE');
  };

  const handleRemoveTier = (index: number) => {
    setPricingTiers(prev => prev.filter((_, i) => i !== index));
  };

  // --- MUTAÇÕES ---
  const { mutate: updateEventMutate, isPending: isUpdatingEvent, error: updateEventError} = useMutation<any, Error, { eventId: string; eventData: any }>({
    mutationFn: updateEvent,
    onSuccess: () => {
      setSuccess('Detalhes do evento atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      setTimeout(() => setSuccess(null), 3000);
    },
  });

  const { mutate: addFieldMutate, isPending: isAddingField, error: addFieldError } = useMutation({
    mutationFn: addEventField,
    onSuccess: () => {
      setSuccess('Campo adicionado com sucesso!');
      setNewFieldName('');
      setNewFieldType(EventFieldType.TEXT);
      setNewFieldIsRequired(false);
      setNewFieldPlaceholder('');
      setNewFieldOptions('');
      setNewFieldIsGrouping(false);
      setNewFieldDependsOn('NONE');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });

  const { mutate: deleteFieldMutate, error: deleteFieldError } = useMutation({
    mutationFn: deleteEventField,
    onSuccess: () => {
      setSuccess('Campo removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });
  
  const { mutate: reorderFieldsMutate, error: reorderError } = useMutation({
    mutationFn: reorderEventFields,
    onSuccess: () => {
      setSuccess('Ordem dos campos atualizada com sucesso!');
    },
  });

  // --- HANDLER SUBMIT (CORRIGIDO) ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    if (!name || !startDate || !location || maxParticipants === '' || baseCost === '') {
      return;
    }

    // 1. Limpar os dados das tarifas para passar no DTO do Backend
    // Isto remove 'id' e 'isActive' e garante tipos numéricos
    const cleanedPricingTiers = pricingTiers.map(tier => ({
        name: tier.name,
        description: tier.description,
        price: Number(tier.price), 
        multiRegistrationPrice: tier.multiRegistrationPrice ? Number(tier.multiRegistrationPrice) : undefined,
        requiredFieldDefinitionId: tier.requiredFieldDefinitionId
    }));    

    const updateData = { 
        name, description, startDate, endDate: endDate || null, location, 
        maxParticipants: Number(maxParticipants), waitingListMargin, isActive, isPublic,
        enableCheckIn, 
        // Agora 'baseCost' já existe no scope
        baseCost: Number(baseCost), 
        
        costType1: costType1 !== '' ? Number(costType1) : undefined, 
        costType2: costType2 !== '' ? Number(costType2) : undefined, 
        costType3: costType3 !== '' ? Number(costType3) : undefined,
        
        certificateSendingMode,

        // Enviamos a lista LIMPA
        pricingTiers: cleanedPricingTiers 
    };
    
    updateEventMutate({ eventId: eventId!, eventData: updateData });
  };
  
  // ... (Resto dos handlers mantêm-se iguais)
  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    if (!newFieldName || !newFieldType) return;
    const newFieldData = { 
      fieldName: newFieldName, 
      fieldType: newFieldType, 
      isRequired: newFieldIsRequired, 
      order: fieldDefinitions.length, 
      placeholder: newFieldPlaceholder || undefined, 
      options: newFieldType === EventFieldType.DROPDOWN ? newFieldOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0) : undefined,
      isGroupingField: newFieldIsGrouping,
      dependsOnFieldDefinitionId: newFieldDependsOn !== 'NONE' ? newFieldDependsOn : undefined
    };
    addFieldMutate({ eventId: eventId!, fieldData: newFieldData });
  };
  
  const handleDeleteField = (fieldId: string) => {
    if (window.confirm('Tem certeza que deseja remover este campo?')) {
      deleteFieldMutate({ eventId: eventId!, fieldId });
    }
  };
  
  const updateFieldOrderOnBackend = useCallback((updatedFields: EventFieldDefinitionData[]) => {
    const orderPayload = updatedFields.map((field, index) => ({ id: field.id, order: index }));
    reorderFieldsMutate({ eventId: eventId!, orderPayload });
  }, [eventId, reorderFieldsMutate]);
  
  const handleDragStart = (e: React.DragEvent, field: EventFieldDefinitionData) => {
    setDraggingItem(field);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', field.id);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetField: EventFieldDefinitionData) => {
    e.preventDefault();
    if (draggingItem === null || draggingItem.id === targetField.id) return;
    const dragIndex = fieldDefinitions.findIndex(f => f.id === draggingItem.id);
    const hoverIndex = fieldDefinitions.findIndex(f => f.id === targetField.id);
    if (dragIndex === -1 || hoverIndex === -1) return;
    const updatedFields = [...fieldDefinitions];
    const [reorderedItem] = updatedFields.splice(dragIndex, 1);
    updatedFields.splice(hoverIndex, 0, reorderedItem);
    const newOrderedFields = updatedFields.map((field, index) => ({ ...field, order: index }));
    setFieldDefinitions(newOrderedFields);
    updateFieldOrderOnBackend(newOrderedFields);
    setDraggingItem(null);
  };
  const handleDragEnd = () => setDraggingItem(null);

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;
  if (isLoading) return <div className="p-6 text-center">A carregar...</div>;
  if (queryError) return <div className="p-6 text-center text-red-500">Erro: {queryError.message}</div>;
  if (!eventDetails) return <div className="p-6 text-center">Evento não encontrado.</div>;

  const checkboxFields = fieldDefinitions.filter(f => f.fieldType === EventFieldType.CHECKBOX);

  return (
    <div className="space-y-6 relative">

      {/* TOAST */}
      {success && (
        <div className="fixed top-20 right-4 z-50 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-md shadow-lg animate-fade-in-down">
          {success}
        </div>
      )}

      {/* --- CARD 1: Detalhes do Evento --- */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Evento</CardTitle>
          <CardDescription>A editar os detalhes para "{eventDetails.name}"</CardDescription>
        </CardHeader>
        <CardContent>
          {updateEventError && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">{(updateEventError as Error).message}</div>}
          
          <form id="edit-event-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="name">Nome do Evento <span className="text-red-500">*</span></Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="startDate">Data de Início <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} required/>
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="endDate">Data de Fim</Label>
                <Input type="datetime-local" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)}/>
              </div>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="location">Localização <span className="text-red-500">*</span></Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="maxParticipants">Nº Máx. de Participantes</Label>
                <Input type="number" id="maxParticipants" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} min="0" />
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
                <Input type="number" id="baseCost" value={baseCost} onChange={(e) => setBaseCost(Number(e.target.value))} min="0" step="0.01" required />
              </div>
            </div>

            {/* --- GESTOR DE TARIFAS --- */}
            <div className="p-4 bg-gray-50 border rounded-md my-4">
                <Label className="mb-2 block font-semibold text-gray-700">Tabela de Preços</Label>
                
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
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                                Condicional
                                            </span>
                                        )}
                                    </div>
                                    {tier.description && <div className="text-xs text-gray-500">{tier.description}</div>}
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveTier(idx)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 items-end bg-white p-3 rounded border">
                    <div className="lg:col-span-2 space-y-1">
                        <Label className="text-xs">Nome</Label>
                        <Input value={newTierName} onChange={e => setNewTierName(e.target.value)} placeholder="Ex: Sócio" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Preço (€)</Label>
                        <Input type="number" value={newTierPrice} onChange={e => setNewTierPrice(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Preço Grupo (€)</Label>
                        <Input type="number" value={newTierMultiPrice} onChange={e => setNewTierMultiPrice(Number(e.target.value))} placeholder="Opcional" />
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
              <div className="flex items-center space-x-2 pt-2 text-indigo-700">
                  <Checkbox id="enableCheckIn" checked={enableCheckIn} onCheckedChange={(c) => setEnableCheckIn(Boolean(c))} className="border-indigo-400 data-[state=checked]:bg-indigo-600" />
                  <Label htmlFor="enableCheckIn" className="cursor-pointer font-medium">Ativar Bilheteira / Check-in (Gera QR Code)</Label>
                  <Ticket className="w-4 h-4 ml-1" />
              </div>                
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={(checked) => setIsActive(Boolean(checked))} />
              <Label htmlFor="isActive">Evento Ativo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="isPublic" checked={isPublic} onCheckedChange={(checked) => setIsPublic(Boolean(checked))} />
              <Label htmlFor="isPublic">Público</Label>
            </div>            
          </form>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button form="edit-event-form" type="submit" disabled={isUpdatingEvent}>
            {isUpdatingEvent ? 'A Guardar...' : 'Guardar Alterações'}
          </Button>
        </CardFooter>
      </Card>

      {/* --- CARDS SECUNDÁRIOS --- */}
      <Card><CardHeader><CardTitle>Banner do Evento</CardTitle></CardHeader><CardContent><SingleFileUpload ownerType="Event" ownerId={eventId!} purpose={FilePurpose.EVENT_BANNER} currentFileUrl={eventDetails?.banner?.url} onUploadSuccess={(newFile) => { updateEventMutate({ eventId: eventId!, eventData: { bannerFileId: newFile.id } }); }} onFileClear={() => { updateEventMutate({ eventId: eventId!, eventData: { bannerFileId: null } }); }}/></CardContent></Card>
      
      <Card><CardHeader><CardTitle>Documentos do Evento</CardTitle></CardHeader><CardContent><MultiFileUploadManager ownerType="Event" ownerId={eventId!} purpose={FilePurpose.EVENT_DOCUMENT} existingFiles={eventDetails?.documents || []} queryKeyToInvalidate={['event', eventId]}/></CardContent></Card>

      {/* --- CAMPOS --- */}
      <Card>
        <CardHeader><CardTitle>Campos do Formulário</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
              {fieldDefinitions.length === 0 ? <p className="text-gray-600 text-center">Nenhum campo definido.</p> : fieldDefinitions.map((field) => (
                <div key={field.id} draggable onDragStart={(e) => handleDragStart(e, field)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, field)} onDragEnd={handleDragEnd} className={`flex items-center justify-between bg-gray-50 p-3 rounded-md shadow-sm border ${draggingItem?.id === field.id ? 'opacity-50' : ''}`}>
                  <div><p className="font-medium">{field.fieldName} ({field.fieldType})</p><p className="text-sm text-gray-600">Obrigatório: {field.isRequired ? 'Sim' : 'Não'}</p></div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteField(field.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* --- ADD CAMPO --- */}
      <Card>
        <CardHeader><CardTitle>Adicionar Novo Campo</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAddField} className="space-y-4">
            <div className="grid w-full items-center gap-1.5"><Label htmlFor="newFieldName">Nome</Label><Input id="newFieldName" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} required /></div>
            <div className="grid w-full items-center gap-1.5"><Label htmlFor="newFieldType">Tipo</Label><Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as EventFieldType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.values(EventFieldType).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            {newFieldType === EventFieldType.DROPDOWN && (<div className="grid w-full items-center gap-1.5"><Label>Opções (CSV)</Label><Input value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} /></div>)}
            <div className="grid w-full items-center gap-1.5"><Label>Placeholder</Label><Input value={newFieldPlaceholder} onChange={(e) => setNewFieldPlaceholder(e.target.value)} /></div>
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2"><Checkbox id="req" checked={newFieldIsRequired} onCheckedChange={(c) => setNewFieldIsRequired(Boolean(c))} /><Label htmlFor="req">Obrigatório</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="grp" checked={newFieldIsGrouping} onCheckedChange={(c) => setNewFieldIsGrouping(Boolean(c))} /><Label htmlFor="grp">Agrupar (Irmãos)</Label></div>
            </div>
            
            {/* SELETOR DE DEPENDÊNCIA (NOVO) */}
            <div className="grid w-full items-center gap-1.5">
                <Label>Condição de Visibilidade</Label>
                <Select value={newFieldDependsOn} onValueChange={setNewFieldDependsOn}>
                    <SelectTrigger><SelectValue placeholder="Mostrar sempre" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="NONE">-- Mostrar sempre --</SelectItem>
                        {checkboxFields.map(f => <SelectItem key={f.id} value={f.id}>Se "{f.fieldName}" marcado</SelectItem>)}
                    </SelectContent>
                </Select>
            </div> 

            <Button type="submit" className="w-full" disabled={isAddingField}>Adicionar Campo</Button>
          </form>
        </CardContent>
      </Card>

{/* --- CARD 6: Certificado de Participação --- */}
      <Card>
        <CardHeader>
          <CardTitle>Certificado de Participação</CardTitle>
          <CardDescription>Configure o design do diploma a enviar automaticamente após o check-in.</CardDescription>
        </CardHeader>
        <CardContent>

            {/* NOVO BLOCO: CONFIGURAÇÃO DE ENVIO */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
                <Label className="mb-2 block text-blue-900 font-semibold">Automatização de Envio</Label>
                <Select 
                    value={certificateSendingMode} 
                    onValueChange={(val) => setCertificateSendingMode(val as CertificateSendingMode)}
                >
                    <SelectTrigger className="bg-white border-blue-200">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={CertificateSendingMode.MANUAL}>Manual (Não enviar automaticamente)</SelectItem>
                        <SelectItem value={CertificateSendingMode.AFTER_EVENT_END}>Após a conclusão do evento (Recomendado)</SelectItem>
                        <SelectItem value={CertificateSendingMode.ON_CHECKIN}>Imediatamente após o Check-in (Entrada)</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-blue-600 mt-2">
                    Nota: Os certificados só são enviados a participantes com check-in validado ("Presente").
                    {certificateSendingMode === CertificateSendingMode.AFTER_EVENT_END && " O envio será processado pelo sistema após a data de fim do evento."}
                </p>
            </div>

          {/* O TEU COMPONENTE DE DESIGN JÁ ESTÁ AQUI EM BAIXO */}
          <CertificateDesigner 
              eventId={eventId!} 
              initialConfig={eventDetails?.certificateConfig} 
              onSave={(newConfig) => {
                  // Enviamos apenas o campo certificateConfig para atualizar
                  // O Backend aceita partial update graças ao UpdateEventDto
                  const payload = { certificateConfig: newConfig };
                  updateEventMutate({ eventId: eventId!, eventData: payload });
              }}
          />
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={() => navigate('/events/list')}>Voltar</Button>
    </div>
  );
};

export default EditEventPage;