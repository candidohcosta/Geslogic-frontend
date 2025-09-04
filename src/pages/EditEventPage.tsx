// frontend/src/pages/EditEventPage.tsx (VERSÃO FINAL E COMPLETA)

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
import { Textarea } from '../components/ui/Textarea'; // NOVO: Um componente para <textarea>
import { Trash2 } from 'lucide-react';
import { SingleFileUpload } from '../components/ui/SingleFileUpload';
import { MultiFileUploadManager } from '../components/ui/MultiFileUploadManager';
import { FilePurpose } from '../types/file';
import { EventFieldType, EventData, EventFieldDefinitionData } from '../types/event';

// Enum para os tipos de campo (deve corresponder ao backend)
/* enum EventFieldType {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  DATE = "DATE",
  BOOLEAN = "BOOLEAN",
  EMAIL = "EMAIL",
  PHONE = "PHONE",
  FILE = "FILE",
  DROPDOWN = "DROPDOWN",
  TEXTAREA = "TEXTAREA",
} */

// Interface para os dados do Evento
/* interface EventData {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  location: string;
  maxParticipants: number;
  isActive: boolean;
  //bannerImageUrl?: string;
  baseCost: number;
  costType1?: number;
  costType2?: number;
  costType3?: number;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
  fieldDefinitions: EventFieldDefinitionData[];
  banner?: { id: string; url: string; }; 
  documents: { id: string; url: string; displayName: string; }[];
} */

// Interface para os dados da Definição de Campo do Evento
/* interface EventFieldDefinitionData {
  id: string;
  fieldName: string;
  fieldType: EventFieldType;
  isRequired: boolean;
  order: number;
  placeholder?: string;
  options?: string[];
} */

const EditEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estados locais para os formulários e UI
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
/*   const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState(''); */
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  //const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [baseCost, setBaseCost] = useState<number | ''>(0);
  const [costType1, setCostType1] = useState<number | ''>('');
  const [costType2, setCostType2] = useState<number | ''>('');
  const [costType3, setCostType3] = useState<number | ''>('');
  const [fieldDefinitions, setFieldDefinitions] = useState<EventFieldDefinitionData[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<EventFieldType>(EventFieldType.TEXT);
  const [newFieldIsRequired, setNewFieldIsRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<EventFieldDefinitionData | null>(null);

  // useQuery para buscar os detalhes do evento
  const { data: eventDetails, isLoading, error: queryError } = useQuery<EventData, Error>({
    queryKey: ['event', eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId && !!user,
  });

  // Efeito para popular os formulários quando os dados chegam da API
  useEffect(() => {
    if (eventDetails) {

      const formatForInput = (isoString: string | undefined | null) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        // Corta os segundos e o 'Z'
        return date.toISOString().slice(0, 16);
      };

      setName(eventDetails.name);
      setDescription(eventDetails.description || '');
      setStartDate(formatForInput(eventDetails.startDate));
      setEndDate(formatForInput(eventDetails.endDate));
      //setStartDate(eventDetails.startDate.split('T')[0]);
      //setEndDate(eventDetails.endDate ? eventDetails.endDate.split('T')[0] : '');
      //setEndDate(eventDetails.startTime ? eventDetails.startTime.split('T')[0] : '');
      //setStartTime(eventDetails.startTime);
      //setEndTime(eventDetails.endTime || '');
      setLocation(eventDetails.location);
      setMaxParticipants(eventDetails.maxParticipants);
      setIsActive(eventDetails.isActive);
      setIsPublic(eventDetails.isPublic);
      //setBannerImageUrl(eventDetails. || '');
      setBaseCost(eventDetails.baseCost);
      setCostType1(eventDetails.costType1 || '');
      setCostType2(eventDetails.costType2 || '');
      setCostType3(eventDetails.costType3 || '');
      setFieldDefinitions(eventDetails.fieldDefinitions.sort((a, b) => a.order - b.order));
    }
  }, [eventDetails]);

  // --- MUTAÇÕES ---
  const { mutate: updateEventMutate, isPending: isUpdatingEvent, error: updateEventError} = useMutation<any, Error, { eventId: string; eventData: any }>({
    mutationFn: updateEvent,
    onSuccess: () => {
      // 1. ATUALIZA A MENSAGEM DE SUCESSO
      setSuccess('Detalhes do evento atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      
      // 2. FAZ A MENSAGEM DESAPARECER APÓS 3 SEGUNDOS
      setTimeout(() => {
        setSuccess(null);
      }, 3000); // 3000ms = 3 segundos
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

  // --- HANDLERS SIMPLIFICADOS ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    if (!name || !startDate || !location || maxParticipants === '' || baseCost === '') {
      // Idealmente, a validação do formulário deve ser mais robusta
      return;
    }
    const updateData = { name, description, startDate, endDate: endDate || null, location, maxParticipants: Number(maxParticipants), isActive, isPublic, baseCost: Number(baseCost), costType1: costType1 !== '' ? Number(costType1) : undefined, costType2: costType2 !== '' ? Number(costType2) : undefined, costType3: costType3 !== '' ? Number(costType3) : undefined };
    updateEventMutate({ eventId: eventId!, eventData: updateData });
  };
  
  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    if (!newFieldName || !newFieldType) return;
    const newFieldData = { fieldName: newFieldName, fieldType: newFieldType, isRequired: newFieldIsRequired, order: fieldDefinitions.length, placeholder: newFieldPlaceholder || undefined, options: newFieldType === EventFieldType.DROPDOWN ? newFieldOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0) : undefined };
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
  
  // Funções de drag-and-drop
  const handleDragStart = (e: React.DragEvent, field: EventFieldDefinitionData) => {
    setDraggingItem(field);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', field.id);
  };

  // Esta função só precisa do evento para chamar preventDefault().
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Esta função continua a receber o 'targetField' porque a estamos a passar
  // através de uma função inline no JSX.
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

  const handleDragEnd = () => {
    setDraggingItem(null);
  };

  // Salvaguardas e estados de loading/error
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;
  if (isLoading) return <div className="p-6 text-center">A carregar...</div>;
  if (queryError) return <div className="p-6 text-center text-red-500">Erro: {queryError.message}</div>;
  if (!eventDetails) return <div className="p-6 text-center">Evento não encontrado.</div>;

  return (
    <div className="space-y-6 relative">

      {/* A NOSSA "TOAST" DE SUCESSO */}
      {success && (
        <div className="fixed top-20 right-4 z-50 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-md shadow-lg animate-fade-in-down">
          {success}
        </div>
      )}

      {/* --- CARD 1: Detalhes do Evento --- */}
      <Card>{/* --- CARD 1: Detalhes do Evento  --- */}
        <CardHeader>
          <CardTitle>Editar Evento</CardTitle>
          <CardDescription>A editar os detalhes para "{eventDetails.name}"</CardDescription>
        </CardHeader>
        <CardContent>
          {success && <div className="p-3 mb-4 text-sm text-green-800 bg-green-100 rounded-md">{success}</div>}
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
{/*               <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="startTime">Hora de Início <span className="text-red-500">*</span></Label>
                <Input type="time" id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="endTime">Hora de Fim</Label>
                <Input type="time" id="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div> */}
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
                <Label htmlFor="baseCost">Custo Base (€) <span className="text-red-500">*</span></Label>
                <Input type="number" id="baseCost" value={baseCost} onChange={(e) => setBaseCost(Number(e.target.value))} min="0" step="0.01" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="costType1">Custo Tipo 1 (€)</Label>
                <Input type="number" id="costType1" value={costType1} onChange={(e) => setCostType1(Number(e.target.value))} min="0" step="0.01" />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="costType2">Custo Tipo 2 (€)</Label>
                <Input type="number" id="costType2" value={costType2} onChange={(e) => setCostType2(Number(e.target.value))} min="0" step="0.01" />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="costType3">Custo Tipo 3 (€)</Label>
                <Input type="number" id="costType3" value={costType3} onChange={(e) => setCostType3(Number(e.target.value))} min="0" step="0.01" />
              </div>
            </div>
{/*             <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="bannerImageUrl">URL da Imagem do Banner</Label>
              <Input type="url" id="bannerImageUrl" value={bannerImageUrl} onChange={(e) => setBannerImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" />
              {bannerImageUrl && <div className="mt-2"><img src={bannerImageUrl} alt="Banner Preview" className="rounded-md" /></div>}
            </div> */}
            <div className="flex items-center space-x-2">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={(checked) => setIsActive(Boolean(checked))} />
              <Label htmlFor="isActive">Evento Ativo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="isPublic" checked={isPublic} onCheckedChange={(checked) => setIsPublic(Boolean(checked))} />
              <Label htmlFor="isPublic">Público (Listado na página pública da plataforma)</Label>
            </div>            
          </form>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button form="edit-event-form" type="submit" disabled={isUpdatingEvent}>
            {isUpdatingEvent ? 'A Guardar...' : 'Guardar Alterações'}
          </Button>
        </CardFooter>
      </Card>


      <Card>{/* --- CARD 2: Banner do Evento  --- */}
        <CardHeader>
          <CardTitle>Banner do Evento</CardTitle>
          <CardDescription>Carregue uma imagem ou folheto.</CardDescription>
        </CardHeader>
        <CardContent>
          <SingleFileUpload ownerType="Event" ownerId={eventId!} purpose={FilePurpose.EVENT_BANNER} currentFileUrl={eventDetails?.banner?.url} onUploadSuccess={(newFile) => { updateEventMutate({ eventId: eventId!, eventData: { bannerFileId: newFile.id } }); }} onFileClear={() => { updateEventMutate({ eventId: eventId!, eventData: { bannerFileId: null } }); }}/>
        </CardContent>
      </Card>

      
      <Card>{/* --- CARD 3: Gestão de Documentos  --- */}
        <CardHeader>
          <CardTitle>Documentos do Evento</CardTitle>
          <CardDescription>
            Carregue os documentos (ex: regulamentos, mapas) que ficarão disponíveis na página pública do evento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MultiFileUploadManager
            ownerType="Event"
            ownerId={eventId!}
            purpose={FilePurpose.EVENT_DOCUMENT}
            existingFiles={eventDetails?.documents || []}
            queryKeyToInvalidate={['event', eventId]}
          />
        </CardContent>
      </Card>


      {/* --- CARD 4: Campos do Formulário --- */}
      <Card>
        <CardHeader>
          <CardTitle>Campos do Formulário de Inscrição</CardTitle>
          <CardDescription>Arraste os campos para reordenar.</CardDescription>
        </CardHeader>
        <CardContent>
          {deleteFieldError && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">{(deleteFieldError as Error).message}</div>}
          {reorderError && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">{(reorderError as Error).message}</div>}
          
          {fieldDefinitions.length === 0 ? (
            <p className="text-gray-600 text-center py-4">Nenhum campo de formulário definido.</p>
          ) : (
            <div className="space-y-3">
              {fieldDefinitions.map((field) => (
                <div key={field.id} draggable onDragStart={(e) => handleDragStart(e, field)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, field)} onDragEnd={handleDragEnd} className={`flex items-center justify-between bg-gray-50 p-3 rounded-md shadow-sm border ${draggingItem?.id === field.id ? 'opacity-50' : ''}`}>
                  <div>
                    <p className="font-medium">{field.fieldName} (<span className="text-indigo-600">{field.fieldType}</span>)</p>
                    <p className="text-sm text-gray-600">Obrigatório: {field.isRequired ? 'Sim' : 'Não'}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteField(field.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- CARD 5: Adicionar Novo Campo --- */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Campo</CardTitle>
        </CardHeader>
        <CardContent>
          {addFieldError && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">{(addFieldError as Error).message}</div>}
          <form onSubmit={handleAddField} className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="newFieldName">Nome do Campo <span className="text-red-500">*</span></Label>
              <Input id="newFieldName" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} required />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="newFieldType">Tipo de Campo <span className="text-red-500">*</span></Label>
              <Select value={newFieldType} onValueChange={(value) => setNewFieldType(value as EventFieldType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(EventFieldType).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {newFieldType === EventFieldType.DROPDOWN && (
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="newFieldOptions">Opções (separadas por vírgulas)</Label>
                <Input id="newFieldOptions" value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} placeholder="Opção A, Opção B" />
              </div>
            )}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="newFieldPlaceholder">Placeholder (Opcional)</Label>
              <Input id="newFieldPlaceholder" value={newFieldPlaceholder} onChange={(e) => setNewFieldPlaceholder(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="newFieldIsRequired" checked={newFieldIsRequired} onCheckedChange={(checked) => setNewFieldIsRequired(Boolean(checked))} />
              <Label htmlFor="newFieldIsRequired">Campo Obrigatório</Label>
            </div>
            <Button type="submit" className="w-full" disabled={isAddingField}>
              {isAddingField ? 'A Adicionar...' : 'Adicionar Campo'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Button variant="outline" className="w-full" onClick={() => navigate('/events/list')}>
        Voltar à Lista de Eventos
      </Button>
    </div>
  );
};

export default EditEventPage;
