// frontend/src/pages/EditUserTypePage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createUserType, 
  updateUserType, 
  fetchUserTypeById, 
  addCustomField, 
  deleteCustomField, 
  reorderCustomFields, 
  updateCustomField,
  setIdentifierField,
  setDisplayNameField 
} from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { RadioGroup, RadioGroupItem } from '../components/ui/RadioGroup'; // <--- O Radio volta
import { Checkbox } from '../components/ui/Checkbox';
import { Trash2, GripVertical, KeyRound, Search, Eye } from 'lucide-react';

// --- INTERFACES E ENUMS ---
enum CustomFieldType { TEXT = 'TEXT', NUMBER = 'NUMBER', DATE = 'DATE', BOOLEAN = 'BOOLEAN' }

interface FieldDefinition { 
  id: string; 
  fieldName: string; 
  fieldType: CustomFieldType; 
  isRequired: boolean; 
  isIdentifier: boolean; // Único (Radio)
  isSearchableInKiosk: boolean; // Múltiplo (Checkbox) - NOVO CAMPO
  isDisplayName: boolean; 
  order: number; 
}

interface UserTypeData { id: string; name: string; description: string; company: { id: string }; fieldDefinitions: FieldDefinition[]; }
interface UserTypePayload { name: string; description?: string; companyId?: string; }

const EditUserTypePage: React.FC = () => {
  const navigate = useNavigate();
  const { userTypeId } = useParams<{ userTypeId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!userTypeId;
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const companyIdFromQuery = queryParams.get('companyId');

  const [name, setName] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>(CustomFieldType.TEXT);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [draggingItem, setDraggingItem] = useState<FieldDefinition | null>(null);

  const { data: userTypeDetails, isLoading, refetch } = useQuery<UserTypeData, Error>({
    queryKey: ['userType', userTypeId],
    queryFn: () => fetchUserTypeById(userTypeId!),
    enabled: isEditing,
  });
  
  useEffect(() => {
    if (isEditing && userTypeDetails) {
      setName(userTypeDetails.name);
      setFields(userTypeDetails.fieldDefinitions.sort((a, b) => a.order - b.order));
    }
  }, [userTypeDetails, isEditing]);

  // --- MUTAÇÕES ---

  const { mutate: saveUserType, isPending, error: saveError } = useMutation({
    mutationFn: (payload: UserTypePayload) => isEditing ? updateUserType({ id: userTypeId!, data: payload }) : createUserType(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userTypes', data.company?.id || companyIdFromQuery] });
      if (!isEditing) {
        navigate(`/user-types/edit/${data.id}`, { replace: true });
      } else {
        //refetch();
        navigate('/user-types');
      }
    },
  });

  const { mutate: addFieldMutate, isPending: isAddingField, error: addError } = useMutation({ 
    mutationFn: addCustomField, 
    onSuccess: () => { refetch(); setNewFieldName(''); } 
  });
  
  const { mutate: deleteFieldMutate, isPending: isDeletingField } = useMutation({ 
    mutationFn: deleteCustomField, 
    onSuccess: () => refetch() 
  });
  
  const { mutate: reorderFieldsMutate } = useMutation({ 
    mutationFn: reorderCustomFields, 
    onSuccess: () => refetch() 
  });

  // Mutação para o Radio Button (Define o Identificador Único)
  const { mutate: setIdentifierMutate, isPending: isSettingIdentifier } = useMutation({ 
    mutationFn: setIdentifierField, 
    onSuccess: () => refetch() 
  });

  // Mutação para a Checkbox (Define se é Pesquisável)
  const { mutate: updateFieldMutate } = useMutation({ 
    mutationFn: updateCustomField, 
    onSuccess: () => refetch() 
  });

  const { mutate: setDisplayNameMutate } = useMutation({ 
    mutationFn: setDisplayNameField, 
    onSuccess: () => refetch() 
  });  

  // --- HANDLERS ---

  const handleSubmitName = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UserTypePayload = { name };
    if (!isEditing) {
      const companyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromQuery : user?.company?.id;
      payload.companyId = companyId ?? undefined;
    }
    saveUserType(payload);
  };
  
  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName || !userTypeId) return;
    addFieldMutate({
      userTypeId: userTypeId,
      fieldName: newFieldName,
      fieldType: newFieldType,
      isIdentifier: false, 
      isSearchableInKiosk: false // Default
    });
  };
  
  const handleDeleteField = (fieldId: string) => { if(window.confirm('Tem a certeza?')) deleteFieldMutate(fieldId); }

  // Handler do Radio Button (ID Único)
  const handleSetIdentifier = (fieldId: string) => { 
    setIdentifierMutate(fieldId); 
  };

  // Handler da Checkbox (Pesquisável)
  const handleToggleSearchable = (field: FieldDefinition, isChecked: boolean) => {
    // 1. Atualização Otimista (Visual Imediata)
    setFields(prevFields => prevFields.map(f => 
      f.id === field.id ? { ...f, isSearchableInKiosk: isChecked } : f
    ));

    // 2. Envia para o Backend
    updateFieldMutate({
      id: field.id,
      data: { isSearchableInKiosk: isChecked }
    });
  };

  const handleSetDisplayName = (fieldId: string) => { 
    setDisplayNameMutate(fieldId); 
  };  
  
  // --- DRAG AND DROP ---
  const handleDragStart = (e: React.DragEvent, field: FieldDefinition) => { setDraggingItem(field); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragEnd = () => setDraggingItem(null);
  const handleDrop = (e: React.DragEvent, targetField: FieldDefinition) => {
    e.preventDefault();
    if (!draggingItem || draggingItem.id === targetField.id) return;
    const dragIndex = fields.findIndex(f => f.id === draggingItem.id);
    const hoverIndex = fields.findIndex(f => f.id === targetField.id);
    if (dragIndex === -1 || hoverIndex === -1) return;
    const updatedFields = [...fields];
    const [reorderedItem] = updatedFields.splice(dragIndex, 1);
    updatedFields.splice(hoverIndex, 0, reorderedItem);
    setFields(updatedFields);
    const orderedIds = updatedFields.map(f => f.id);
    reorderFieldsMutate({ userTypeId: userTypeId!, orderedIds });
    setDraggingItem(null);
  };
  
  if (isEditing && isLoading) return <div>A carregar...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmitName}>
          <CardHeader>
            <CardTitle>{isEditing ? `Editar Tipo de Utente: ${userTypeDetails?.name}` : 'Criar Novo Tipo de Utente'}</CardTitle>
            <CardDescription>Defina o nome e a descrição para este "molde" de ficha de utente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {saveError && <p className="text-red-500 text-sm">Erro ao guardar: {(saveError as Error).message}</p>}
            <div className="grid gap-1.5"><Label htmlFor="name">Nome do Tipo</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={isPending}>{isPending ? 'A Guardar...' : (isEditing ? 'Guardar Alterações' : 'Criar e Continuar')}</Button>
          </CardFooter>
        </form>
      </Card>
      
      {isEditing && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Campos da Ficha</CardTitle>
              <CardDescription>
                <strong>ID Único:</strong> Chave para importação CSV (Só um).<br/>
                <strong>Pesquisável:</strong> Aparece no Quiosque para o utente preencher (Vários).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {addError && <p className="text-red-500 text-sm mb-4">Erro ao adicionar: {(addError as Error).message}</p>}
              
              <div className="space-y-2">
                {/* Cabeçalho da Lista */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2 bg-gray-100 rounded text-sm font-semibold text-gray-600">
                  <span className="w-6"></span> {/* Drag Handle */}
                  <span>Nome do Campo</span>
                  <span>Tipo</span>
                  <span className="text-center w-24 flex items-center justify-center gap-1">
                    <KeyRound className="h-4 w-4" /> ID Único
                  </span>
                  <span className="text-center w-24 flex items-center justify-center gap-1">
                    <Search className="h-4 w-4" /> Pesquisável
                  </span>
                  <span className="text-center w-24"><Eye className="inline w-4 h-4"/> Mostrar</span>                   
                  <span className="text-right w-16">Ações</span>
                </div>

                {/* Lista de Campos - Envolvida por RadioGroup */}
                <RadioGroup 
                  value={fields.find(f => f.isIdentifier)?.id} 
                  onValueChange={handleSetIdentifier} 
                  disabled={isSettingIdentifier}
                >
                  {fields.map(field => (
                    <div 
                      key={field.id} 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, field)} 
                      onDragOver={handleDragOver} 
                      onDrop={(e) => handleDrop(e, field)} 
                      onDragEnd={handleDragEnd} 
                      className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 p-3 border rounded bg-white shadow-sm transition-all ${draggingItem?.id === field.id ? 'opacity-30' : 'hover:shadow-md'}`}
                    >
                      {/* 1. Drag Handle */}
                      <div className="cursor-grab text-gray-400 hover:text-gray-600">
                        <GripVertical className="h-5 w-5" />
                      </div>

                      {/* 2. Nome */}
                      <span className="font-medium text-gray-800">{field.fieldName}</span>

                      {/* 3. Tipo */}
                      <span className="text-sm px-2 py-1 bg-gray-100 rounded text-gray-600 w-fit">
                        {field.fieldType}
                      </span>

                      {/* 4. ID Único (Radio) */}
                      <div className="flex justify-center w-24">
                        <RadioGroupItem value={field.id} id={`id-${field.id}`} />
                      </div>

                      {/* 5. Pesquisável (Checkbox) */}
                      <div className="flex justify-center w-24">
                        <Checkbox 
                          id={`searchable-${field.id}`}
                          checked={field.isSearchableInKiosk || false} // Default false se undefined
                          onCheckedChange={(checked) => handleToggleSearchable(field, checked as boolean)}
                        />
                      </div>

                      {/* NOVA COLUNA: Display Name (Radio) */}
                      <div className="flex justify-center w-24">
                        <RadioGroup 
                          value={fields.find(f => f.isDisplayName)?.id} 
                          onValueChange={handleSetDisplayName}
                        >
                            <RadioGroupItem value={field.id} id={`display-${field.id}`} />
                        </RadioGroup>
                      </div>

                      {/* 6. Ações */}
                      <div className="flex justify-end w-16">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteField(field.id)} 
                          disabled={isDeletingField}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                {fields.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded">
                    Ainda não existem campos. Adicione o primeiro abaixo.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card de Adição */}
          <Card>
            <CardHeader><CardTitle>Adicionar Novo Campo</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddField} className="flex flex-col md:flex-row items-end gap-4">
                <div className="grid gap-1.5 flex-grow w-full">
                  <Label htmlFor="newFieldName">Nome do Campo</Label>
                  <Input 
                    id="newFieldName" 
                    placeholder="Ex: Telemóvel, Data Nascimento..." 
                    value={newFieldName} 
                    onChange={(e) => setNewFieldName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="grid gap-1.5 w-full md:w-48">
                  <Label htmlFor="newFieldType">Tipo de Dados</Label>
                  <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as CustomFieldType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CustomFieldType.TEXT}>Texto</SelectItem>
                      <SelectItem value={CustomFieldType.NUMBER}>Número</SelectItem>
                      <SelectItem value={CustomFieldType.DATE}>Data</SelectItem>
                      <SelectItem value={CustomFieldType.BOOLEAN}>Sim/Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isAddingField} className="w-full md:w-auto min-w-[140px]">
                  {isAddingField ? 'A Adicionar...' : 'Adicionar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      <div className="w-full">
        <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    </div>
  );
};

export default EditUserTypePage;