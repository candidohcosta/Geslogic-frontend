// frontend/src/pages/EditServicePage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createService, 
  updateService, 
  fetchServiceById, 
  fetchUserTypes // <--- IMPORTADO
} from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'; // <--- IMPORTADO

interface ServiceData {
  name: string;
  ticketPrefix: string;
  maxTicketsPerDay?: number | null;
  isIssuingSuspended?: boolean;
  companyId?: string; 
  requiredUserTypeId?: string | null; // <--- NOVO CAMPO
}

// Interface auxiliar para os Tipos de Utente na dropdown
interface UserTypeSimple {
  id: string;
  name: string;
}

const EditServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!serviceId;
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const companyIdFromQuery = queryParams.get('companyId');

  const [formData, setFormData] = useState<Partial<ServiceData>>({
    name: '',
    ticketPrefix: '',
    maxTicketsPerDay: null,
    isIssuingSuspended: false,
    requiredUserTypeId: null, // <--- INICIALIZAÇÃO
  });

  // 1. Carregar Detalhes do Serviço (se edição)
  const { data: serviceDetails, isLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => fetchServiceById(serviceId!),
    enabled: isEditing,
  });

  // 2. Determinar o ID da empresa para buscar os Tipos de Utente
  // Se estivermos a editar, usamos a empresa do serviço carregado.
  // Se estivermos a criar, usamos o do URL (Platform) ou do User (Company).
  const targetCompanyId = isEditing 
    ? serviceDetails?.company?.id 
    : (user?.role === UserRole.COMPANY_ADMIN ? user.company?.id : companyIdFromQuery);

  // 3. Carregar Tipos de Utente Disponíveis
  const { data: userTypes } = useQuery<UserTypeSimple[]>({
    queryKey: ['userTypes', targetCompanyId],
    queryFn: () => fetchUserTypes(targetCompanyId),
    enabled: !!targetCompanyId, // Só corre quando soubermos a empresa
  });

  useEffect(() => {
    if (isEditing && serviceDetails) {
      setFormData({
        name: serviceDetails.name,
        ticketPrefix: serviceDetails.ticketPrefix,
        maxTicketsPerDay: serviceDetails.maxTicketsPerDay,
        isIssuingSuspended: serviceDetails.isIssuingSuspended,
        // O backend devolve o objeto requiredUserType completo, extraímos o ID
        requiredUserTypeId: serviceDetails.requiredUserType?.id || null, 
      });
    }
  }, [serviceDetails, isEditing]);

  const { mutate: saveService, isPending, error: mutationError } = useMutation({
    mutationFn: (servicePayload: ServiceData) => {
      return isEditing 
        ? updateService({ id: serviceId!, serviceData: servicePayload })
        : createService(servicePayload);
    },
    onSuccess: (data, variables) => {
        let companyIdToInvalidate: string | undefined;

        if (isEditing) {
          companyIdToInvalidate = serviceDetails?.company?.id;
        } else {
          companyIdToInvalidate = variables.companyId;
        }

      const companyId = isEditing ? serviceDetails?.company?.id : (user?.role === UserRole.COMPANY_ADMIN ? user.company?.id : companyIdFromQuery);
      queryClient.invalidateQueries({ queryKey: ['services', companyId] });

        if (user?.role === UserRole.PLATFORM_ADMIN && companyIdToInvalidate) {
          navigate(`/services/company/${companyIdToInvalidate}`);
        } else {
          navigate('/services');
        }
    },
    onError: (error) => {
        console.error("Erro na mutação 'saveService':", error);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? null : Number(value)) : value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: Partial<ServiceData> = { 
        name: formData.name,
        ticketPrefix: formData.ticketPrefix,
        maxTicketsPerDay: formData.maxTicketsPerDay,
        requiredUserTypeId: formData.requiredUserTypeId === 'NO_TYPE' ? null : formData.requiredUserTypeId // Tratar o valor "Vazio"
    };

    if (user?.role === UserRole.COMPANY_ADMIN) {
        payload.companyId = user.company?.id;
    } 
    else if (user?.role === UserRole.PLATFORM_ADMIN && !isEditing) {
        payload.companyId = companyIdFromQuery || undefined;
    }
    
    if (isEditing) {
        payload.isIssuingSuspended = formData.isIssuingSuspended;
    }

    saveService(payload as ServiceData);
  };

  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isLoading) return <div className="p-6 text-center">A carregar serviço...</div>;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Serviço' : 'Criar Novo Serviço'}</CardTitle>
        <CardDescription>Defina os detalhes e regras do serviço de atendimento.</CardDescription>
      </CardHeader>
      <CardContent>
        {mutationError && (
            <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">
            {(mutationError as Error).message}
            </div>
        )}        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Nome */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">Nome do Serviço <span className="text-red-500">*</span></Label>
            <Input id="name" name="name" value={formData.name || ''} onChange={handleInputChange} required />
          </div>

          {/* Prefixo */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="ticketPrefix">Prefixo da Senha (1-5 caracteres) <span className="text-red-500">*</span></Label>
            <Input id="ticketPrefix" name="ticketPrefix" value={formData.ticketPrefix || ''} onChange={handleInputChange} required maxLength={5} />
          </div>

          {/* Tipo de Utente (Novo Campo) */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="requiredUserTypeId">Tipo de Utente Obrigatório</Label>
            <Select 
              value={formData.requiredUserTypeId || 'NO_TYPE'} 
              onValueChange={(val) => setFormData(prev => ({ ...prev, requiredUserTypeId: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo de utente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO_TYPE">Nenhum (Senha Direta)</SelectItem>
                {userTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Se selecionar um tipo, o quiosque pedirá identificação antes de emitir a senha.
            </p>
          </div>

          {/* Limite Diário */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="maxTicketsPerDay">Limite Diário de Senhas (opcional)</Label>
            <Input id="maxTicketsPerDay" name="maxTicketsPerDay" type="number" value={formData.maxTicketsPerDay ?? ''} onChange={handleInputChange} min="0" />
          </div>

          {/* Suspensão (apenas edição) */}
          {isEditing && (
            <div className="flex items-center space-x-2 border-t pt-4">
              <Checkbox
                id="isIssuingSuspended"
                name="isIssuingSuspended"
                checked={formData.isIssuingSuspended || false}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isIssuingSuspended: Boolean(checked) }))}
              />
              <Label htmlFor="isIssuingSuspended" className="text-red-600 font-medium">Suspender emissão de senhas</Label>
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={() => navigate('/services')}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'A Guardar...' : 'Guardar Serviço'}
        </Button>
      </CardFooter>
    </Card>
  );
};
export default EditServicePage;