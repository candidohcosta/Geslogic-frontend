// frontend/src/pages/EditUserDataPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUserTypeById,
  fetchUserDataById,
  createUserData,
  updateUserData,
} from '../services/api';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Button } from '../components/ui/Button';
import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
import { IdCard } from 'lucide-react';

// Tipos locais
interface FieldDefinition {
  id: string;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
  isIdentifier: boolean;
}
interface UserDataPayload {
  userTypeId: string;
  fieldValues: { fieldDefinitionId: string; value: string }[];
}

const EditUserDataPage: React.FC = () => {
  const navigate = useNavigate();
  const { userDataId } = useParams<{ userDataId?: string }>();
  const isEditing = !!userDataId;

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  // Em criação vem por query; em edição vem do próprio userData
  const userTypeIdFromQuery = queryParams.get('userTypeId') || undefined;

  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // 1) Dados existentes (só em edição)
  const {
    data: userData,
    isLoading: isLoadingData,
    error: errorData,
  } = useQuery({
    queryKey: ['userData', userDataId],
    queryFn: () => fetchUserDataById(userDataId!),
    enabled: isEditing,
  });

  // 2) Estrutura do formulário (definições de campos)
  const effectiveUserTypeId = isEditing ? userData?.userType.id : userTypeIdFromQuery;
  const {
    data: userTypeDetails,
    isLoading: isLoadingType,
    error: errorType,
  } = useQuery({
    queryKey: ['userType', effectiveUserTypeId],
    queryFn: () => fetchUserTypeById(effectiveUserTypeId!),
    enabled: !!user && !!effectiveUserTypeId,
  });

  // Hidratar formulário quando há dados (edição)
  useEffect(() => {
    if (isEditing && userData) {
      const initial: Record<string, string> = {};
      userData.fieldValues.forEach((fv: any) => {
        initial[fv.fieldDefinition.id] = fv.value ?? '';
      });
      setFormValues(initial);
    }
  }, [userData, isEditing]);

  const { mutate: saveData, isPending } = useMutation({
    mutationFn: (payload: UserDataPayload) =>
      isEditing
        ? updateUserData({ id: userDataId!, data: payload })
        : createUserData(payload),
    onSuccess: () => {
      // Atualiza queries relacionadas e regressa à lista por tipo
      const targetTypeId = effectiveUserTypeId || userData?.userType.id;
      if (targetTypeId) {
        queryClient.invalidateQueries({ queryKey: ['userData', targetTypeId] });
        navigate(`/user-data/by-type/${targetTypeId}`);
      } else {
        // Fallback seguro
        navigate(-1);
      }
    },
  });

  const handleInputChange = (fieldDefinitionId: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldDefinitionId]: value }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const fieldValues = Object.entries(formValues).map(([fieldDefinitionId, value]) => ({
      fieldDefinitionId,
      value,
    }));

    const payload: UserDataPayload = {
      userTypeId: effectiveUserTypeId || userData!.userType.id,
      fieldValues,
    };

    saveData(payload);
  };

  const isLoading = isLoadingType || (isEditing && isLoadingData);

  // Header (Opção B - padrão): ícone + título e subtítulo coerentes
  const header = useMemo(() => {
    const titleBase = userTypeDetails?.name || 'Ficha de Utente';
    return {
      icon: IdCard,
      title: titleBase,
      subtitle: isEditing ? 'Editar dados' : 'Novo registo',
      // ⬅️ Botões no header (lado direito)
      actions: (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => navigate(-1)}
            title="Cancelar"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            type="submit"
            form="editUserDataForm" // associa ao form principal
            disabled={isPending}
            title="Guardar alterações"
          >
            {isPending ? 'A Guardar…' : 'Guardar'}
          </Button>
        </div>
      ),
    };
  }, [userTypeDetails?.name, isEditing, isPending, navigate]);

  // Conteúdo do formulário (secção única)
  const formContent = useMemo(() => {
    const defs: FieldDefinition[] = userTypeDetails?.fieldDefinitions ?? [];
    return (
      <form id="editUserDataForm" onSubmit={handleSubmit} className="space-y-4">
        {defs.map((field) => (
          <div key={field.id} className="grid w-full items-center gap-1.5">
            <Label htmlFor={field.id}>
              {field.fieldName}{' '}
              {field.isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type={(field.fieldType || 'text').toLowerCase()}
              value={formValues[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.isRequired}
              disabled={isEditing && field.isIdentifier}
            />
          </div>
        ))}
      </form>
    );
  }, [userTypeDetails?.fieldDefinitions, formValues, isEditing]);

  // Secções do formulário (uma só, com accent)
  const sections = useMemo(
    () => [
      {
        title: 'Dados',
        description: undefined,
        content: formContent,
        accent: true,
      },
    ],
    [formContent],
  );

  // Ações (barra sticky inferior — mantida)
  const actions = (
    <>
      <Button variant="outline" type="button" onClick={() => navigate(-1)}>
        Cancelar
      </Button>
      <Button type="submit" form="editUserDataForm" disabled={isPending}>
        {isPending ? 'A Guardar…' : 'Guardar'}
      </Button>
    </>
  );

  if (!effectiveUserTypeId && !isEditing) {
    return (
      <div className="p-6 text-red-600">
        Falta o <strong>userTypeId</strong> na query string para criar um novo registo.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-6 text-gray-700">A carregar…</div>;
  }

  if (errorType || (isEditing && errorData)) {
    return (
      <div className="p-6 text-red-600">
        Ocorreu um erro ao carregar os dados do formulário.
      </div>
    );
  }

  return (
    <DetailFormTemplate
      header={header}
      sections={sections}
      actions={actions}  // mantém barra sticky inferior (opcional)
      columnsMd={1}      // 1 coluna — previsível para formulários dinâmicos
    />
  );
};

export default EditUserDataPage;