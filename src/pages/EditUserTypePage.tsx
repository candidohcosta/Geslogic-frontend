// frontend/src/pages/EditUserTypePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
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
  setDisplayNameField,
} from '../services/api';
import { UserRole } from '../types/user';

// UI
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { RadioGroup, RadioGroupItem } from '../components/ui/RadioGroup';
import { Checkbox } from '../components/ui/Checkbox';
import { Card, CardContent } from '../components/ui/Card';

// Ícones
import { Contact, GripVertical, KeyRound, Search, Eye, Trash2 } from 'lucide-react';

// Template padronizado
import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
// Inferimos o tipo da prop sections diretamente do Template (evita “type not exported”)
type SectionsProp = React.ComponentProps<typeof DetailFormTemplate>['sections'];

// --- INTERFACES E ENUMS ---
enum CustomFieldType { TEXT = 'TEXT', NUMBER = 'NUMBER', DATE = 'DATE', BOOLEAN = 'BOOLEAN' }

interface FieldDefinition {
  id: string;
  fieldName: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  isIdentifier: boolean;          // único (radio)
  isSearchableInKiosk: boolean;   // múltiplo (checkbox)
  isDisplayName: boolean;         // único (radio)
  order: number;
}

interface UserTypeData {
  id: string;
  name: string;
  description: string;
  company: { id: string };
  fieldDefinitions: FieldDefinition[];
}

interface UserTypePayload {
  name: string;
  description?: string;
  companyId?: string;
}

// Grelha ÚNICA do header/linhas (fonte da verdade)
const FIELDS_GRID =
  'grid grid-cols-[24px_minmax(220px,1fr)_minmax(110px,160px)_88px_112px_140px_72px]';

const EditUserTypePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { userTypeId } = useParams<{ userTypeId?: string }>();
  const isEditing = !!userTypeId;

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const companyIdFromQuery = queryParams.get('companyId');

  // Estado do formulário
  const [name, setName] = useState('');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [draggingItem, setDraggingItem] = useState<FieldDefinition | null>(null);

  // Novo campo
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>(CustomFieldType.TEXT);

  // Query
  const { data: userTypeDetails, isLoading } = useQuery<UserTypeData, Error>({
    queryKey: ['userType', userTypeId],
    queryFn: () => fetchUserTypeById(userTypeId!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (isEditing && userTypeDetails) {
      setName(userTypeDetails.name);
      setFields(
        [...(userTypeDetails.fieldDefinitions || [])].sort((a, b) => a.order - b.order)
      );
    }
  }, [userTypeDetails, isEditing]);

  // Mutations
  const { mutate: saveUserType, isPending: isSavingType, error: saveError } = useMutation({
    mutationFn: (payload: UserTypePayload) =>
      isEditing ? updateUserType({ id: userTypeId!, data: payload }) : createUserType(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userTypes', data.company?.id || companyIdFromQuery] });
      if (!isEditing) {
        // após criar, abrir em modo edição
        navigate(`/user-types/edit/${data.id}`, { replace: true });
      } else {
        navigate('/user-types');
      }
    },
  });

  const { mutate: addFieldMutate, isPending: isAddingField, error: addError } = useMutation({
    mutationFn: addCustomField,
    onSuccess: () => {
      setNewFieldName('');
      queryClient.invalidateQueries({ queryKey: ['userType', userTypeId] });
    },
  });

  const { mutate: deleteFieldMutate, isPending: isDeletingField } = useMutation({
    mutationFn: deleteCustomField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userType', userTypeId] });
    },
  });

  const { mutate: reorderFieldsMutate } = useMutation({
    mutationFn: reorderCustomFields,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userType', userTypeId] });
    },
  });

  const { mutate: setIdentifierMutate, isPending: isSettingIdentifier } = useMutation({
    mutationFn: setIdentifierField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userType', userTypeId] });
    },
  });

  const { mutate: updateFieldMutate } = useMutation({
    mutationFn: updateCustomField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userType', userTypeId] });
    },
  });

  const { mutate: setDisplayNameMutate, isPending: isSettingDisplayName } = useMutation({
    mutationFn: setDisplayNameField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userType', userTypeId] });
    },
  });

  // Handlers principais
  const handleSubmitName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const payload: UserTypePayload = { name };
    if (!isEditing) {
      const companyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromQuery : user?.company?.id;
      payload.companyId = companyId ?? undefined;
    }
    saveUserType(payload);
  };

  const handleAddField = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFieldName || !userTypeId) return;
    addFieldMutate({
      userTypeId: userTypeId,
      fieldName: newFieldName.trim(),
      fieldType: newFieldType,
      isIdentifier: false,
      isSearchableInKiosk: false,
    });
  };

  const handleDeleteField = (fieldId: string) => {
    if (window.confirm('Tem a certeza?')) deleteFieldMutate(fieldId);
  };

  const handleToggleSearchable = (field: FieldDefinition, isChecked: boolean) => {
    // 1. otimista
    setFields(prev =>
      prev.map(f => (f.id === field.id ? { ...f, isSearchableInKiosk: isChecked } : f))
    );
    // 2. backend
    updateFieldMutate({ id: field.id, data: { isSearchableInKiosk: isChecked } });
  };

  const handleSetIdentifier = (fieldId: string) => setIdentifierMutate(fieldId);
  const handleSetDisplayName = (fieldId: string) => setDisplayNameMutate(fieldId);

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, field: FieldDefinition) => {
    setDraggingItem(field);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragEnd = () => setDraggingItem(null);
  const handleDrop = (e: React.DragEvent, targetField: FieldDefinition) => {
    e.preventDefault();
    if (!draggingItem || draggingItem.id === targetField.id) return;
    const dragIndex = fields.findIndex(f => f.id === draggingItem.id);
    const hoverIndex = fields.findIndex(f => f.id === targetField.id);
    if (dragIndex === -1 || hoverIndex === -1) return;

    const updated = [...fields];
    const [reordered] = updated.splice(dragIndex, 1);
    updated.splice(hoverIndex, 0, reordered);
    setFields(updated);

    const orderedIds = updated.map(f => f.id);
    if (userTypeId) reorderFieldsMutate({ userTypeId, orderedIds });
    setDraggingItem(null);
  };

  // Permissões
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isEditing && isLoading) return <div className="p-6 text-center">A carregar...</div>;

  // Valores atuais para RadioGroups
  const currentIdentifierId = fields.find(f => f.isIdentifier)?.id || '';
  const currentDisplayNameId = fields.find(f => f.isDisplayName)?.id || '';

  // ===== Secções (DetailFormTemplate) =====
  const sections: SectionsProp = [
    // 1) Identificação — largura total
    {
      title: 'Identificação',
      description: 'Defina o nome do tipo de utente.',
      accent: true,
      content: (
        <Card className="border-0 shadow-none">
          <form onSubmit={handleSubmitName} className="space-y-4">
            {saveError && (
              <p className="text-red-500 text-sm">Erro ao guardar: {(saveError as Error).message}</p>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome do Tipo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex.: Aluno, Munícipe, Utente GAB..."
              />
            </div>

            {/* Em criação → “Criar e Continuar” aqui; em edição não mostramos guardar aqui */}
            {!isEditing && (
              <div className="flex justify-end">
                <Button type="submit" disabled={isSavingType}>
                  {isSavingType ? 'A Guardar...' : 'Criar e Continuar'}
                </Button>
              </div>
            )}
          </form>
        </Card>
      ),
    },

    // 2) Campos da Ficha — aparece só em edição — largura total (com “Adicionar” na mesma secção)
    ...(isEditing
      ? [{
          title: 'Campos da Ficha',
          description: (
            <>
              <strong>ID Único:</strong> Campo único para importação/identificação (apenas um).<br/>
              <strong>Pesquisável:</strong> Campo visível no Quiosque (podem ser vários).<br/>
              <strong>Nome de Exibição:</strong> Campo usado como “nome” do utente (apenas um).
            </>
          ) as any,
          accent: true,
          content: (
            <div className="space-y-4 overflow-x-auto">
              {/* HEADER da “tabela” */}
              <div
                className={`${FIELDS_GRID} items-center gap-4 rounded bg-gray-100 text-sm font-semibold text-gray-600 px-4 py-2 min-w-[820px]`}
              >
                {/* 1. Drag */}
                <span className="w-6" />
                {/* 2. Nome */}
                <span className="truncate">Nome do Campo</span>
                {/* 3. Tipo */}
                <span className="text-center">Tipo</span>
                {/* 4. ID Único */}
                <span className="text-center flex items-center justify-center gap-1">
                  <KeyRound className="h-4 w-4" /> ID Único
                </span>
                {/* 5. Pesquisável */}
                <span className="text-center flex items-center justify-center gap-1">
                  <Search className="h-4 w-4" /> Pesquisável
                </span>
                {/* 6. Nome de Exibição */}
                <span className="text-center flex items-center justify-center gap-1">
                  <Eye className="h-4 w-4" /> Nome de Exibição
                </span>
                {/* 7. Ações */}
                <span className="text-right">Ações</span>
              </div>

              {/* LISTA — radios controlados (ID Único / Nome de Exibição) */}
              <RadioGroup
                value={currentIdentifierId}
                onValueChange={handleSetIdentifier}
                disabled={isSettingIdentifier}
              >
                <RadioGroup
                  value={currentDisplayNameId}
                  onValueChange={handleSetDisplayName}
                  disabled={isSettingDisplayName}
                >
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, field)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, field)}
                      onDragEnd={handleDragEnd}
                      className={[
                        FIELDS_GRID,
                        'items-center gap-4 rounded border bg-white shadow-sm transition-all px-4 py-3 min-w-[820px]',
                        draggingItem?.id === field.id ? 'opacity-30' : 'hover:shadow-md',
                      ].join(' ')}
                    >
                      {/* 1. Drag handle */}
                      <div className="cursor-grab text-gray-400 hover:text-gray-600 flex items-center justify-center">
                        <GripVertical className="h-5 w-5" />
                      </div>

                      {/* 2. Nome */}
                      <span className="font-medium text-gray-800 truncate" title={field.fieldName}>
                        {field.fieldName}
                      </span>

                      {/* 3. Tipo */}
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700 w-fit mx-auto">
                        {field.fieldType}
                      </span>

                      {/* 4. ID Único */}
                      <div className="flex justify-center">
                        <RadioGroupItem value={field.id} id={`id-${field.id}`} />
                      </div>

                      {/* 5. Pesquisável */}
                      <div className="flex justify-center">
                        <Checkbox
                          id={`searchable-${field.id}`}
                          checked={Boolean(field.isSearchableInKiosk)}
                          onCheckedChange={(checked) =>
                            handleToggleSearchable(field, Boolean(checked))
                          }
                        />
                      </div>

                      {/* 6. Nome de Exibição */}
                      <div className="flex justify-center">
                        <RadioGroupItem value={field.id} id={`display-${field.id}`} />
                      </div>

                      {/* 7. Ações */}
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteField(field.id)}
                          disabled={isDeletingField}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Eliminar campo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {fields.length === 0 && (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded">
                      Ainda não existem campos. Adicione o primeiro abaixo.
                    </div>
                  )}
                </RadioGroup>
              </RadioGroup>

              {/* ADICIONAR NOVO CAMPO — na mesma secção */}
              <Card className="border-0 shadow-none">
                <CardContent className="px-0 pt-0">
                  <form
                    onSubmit={handleAddField}
                    className="flex flex-col md:flex-row items-end gap-4"
                  >
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
                      <Select
                        value={newFieldType}
                        onValueChange={(v) => setNewFieldType(v as CustomFieldType)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CustomFieldType.TEXT}>Texto</SelectItem>
                          <SelectItem value={CustomFieldType.NUMBER}>Número</SelectItem>
                          <SelectItem value={CustomFieldType.DATE}>Data</SelectItem>
                          <SelectItem value={CustomFieldType.BOOLEAN}>Sim/Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      disabled={isAddingField}
                      className="w-full md:w-auto min-w-[140px]"
                    >
                      {isAddingField ? 'A Adicionar...' : 'Adicionar'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          ),
        }] as SectionsProp
      : []),
  ];

  return (
    <DetailFormTemplate
      header={{
        icon: Contact,
        title: isEditing ? `Editar Tipo de Utente` : 'Criar Tipo de Utente',
        subtitle: isEditing ? (userTypeDetails?.name || '') : 'Defina o nome e, depois de criar, configure os campos.',
        actions: (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Voltar</Button>
            {/* Em edição → Guardar Alterações apenas no header */}
            {isEditing && (
              <Button size="sm" onClick={() => handleSubmitName()} disabled={isSavingType}>
                {isSavingType ? 'A Guardar...' : 'Guardar Alterações'}
              </Button>
            )}
          </div>
        ),
      }}
      // Largura total para as secções (identificação + campos)
      columnsMd={1}
      sections={sections}
      // Não queremos ações no rodapé; prop é obrigatória → passar vazio
      actions={<></>}
    />
  );
};

export default EditUserTypePage;
