// frontend/src/pages/EditUserDataPage.tsx (VERSÃO COMPLETA)

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserTypeById, fetchUserDataById, createUserData, updateUserData } from '../services/api'; // Precisamos de todas estas
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';

// Interfaces
interface FieldDefinition { id: string; fieldName: string; fieldType: string; isRequired: boolean; isIdentifier: boolean; }
interface UserDataPayload { userTypeId: string; fieldValues: { fieldDefinitionId: string; value: string; }[]; }

const EditUserDataPage: React.FC = () => {
  const navigate = useNavigate();
  const { userDataId } = useParams<{ userDataId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!userDataId;

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  // O userTypeId vem da query string na criação, ou dos dados na edição
  const userTypeId = queryParams.get('userTypeId');
  
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Query 2: Ir buscar os DADOS para preencher o formulário (só em modo de edição)
  const { data: userData, isLoading: isLoadingData } = useQuery({
    queryKey: ['userData', userDataId],
    queryFn: () => fetchUserDataById(userDataId!),
    enabled: isEditing,
  });

  // Query 1: Ir buscar a ESTRUTURA do formulário (os campos a mostrar)
  const { data: userTypeDetails, isLoading: isLoadingType } = useQuery({
    queryKey: ['userType', isEditing ? userData?.userType.id : userTypeId],
    queryFn: () => fetchUserTypeById(isEditing ? userData!.userType.id : userTypeId!),
    enabled: !!user && (isEditing || !!userTypeId),
  });

  // Efeito para popular o formulário quando os dados chegam
  useEffect(() => {
    if (isEditing && userData) {
      const initialValues: Record<string, string> = {};
      userData.fieldValues.forEach((fv: any) => {
        initialValues[fv.fieldDefinition.id] = fv.value;
      });
      setFormValues(initialValues);
    }
  }, [userData, isEditing]);

  const { mutate: saveData, isPending } = useMutation({
    mutationFn: (payload: UserDataPayload) => isEditing ? updateUserData({ id: userDataId!, data: payload }) : createUserData(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData', userTypeId || userData?.userType.id] });
      navigate(`/user-data/by-type/${userTypeId || userData?.userType.id}`);
    },
  });

  const handleInputChange = (fieldDefinitionId: string, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldDefinitionId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fieldValues = Object.entries(formValues).map(([fieldDefinitionId, value]) => ({
      fieldDefinitionId,
      value,
    }));
    const payload: UserDataPayload = {
      userTypeId: userTypeId || userData!.userType.id,
      fieldValues,
    };
    saveData(payload);
  };

  const isLoading = isLoadingType || (isEditing && isLoadingData);
  if (isLoading) return <p>A carregar...</p>;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Ficha de Utente' : `Adicionar Novo ${userTypeDetails?.name}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {userTypeDetails?.fieldDefinitions.map((field: FieldDefinition) => (
            <div key={field.id} className="grid w-full items-center gap-1.5">
              <Label htmlFor={field.id}>
                {field.fieldName} {field.isRequired && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id={field.id}
                type={field.fieldType.toLowerCase()}
                value={formValues[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                required={field.isRequired}
                disabled={isEditing && field.isIdentifier}
              />
            </div>
          ))}
        </form>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'A Guardar...' : 'Guardar'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EditUserDataPage;