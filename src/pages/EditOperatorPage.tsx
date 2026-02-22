// frontend/src/pages/EditOperatorPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createOperator, updateOperator, fetchOperatorById, fetchServices } from '../services/api';
import { UserRole } from '../types/user';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Users } from 'lucide-react';
// Template padronizado
import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
// ⬇️ Em vez de tentar importar SectionProps (não exportado), inferimos o tipo da prop sections:
type SectionsProp = React.ComponentProps<typeof DetailFormTemplate>['sections'];



// --- INTERFACES ---
interface SimpleServiceData { id: string; name: string; }
interface OperatorData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  operatorDetails: {
    id: string;
    allowedServiceIds: string[];
    company: {
      id: string;
      name: string;
    };
  } | null;
}
interface OperatorPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
  companyId?: string;
  allowedServiceIds?: string[];
}

const EditOperatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { operatorId } = useParams<{ operatorId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!operatorId;
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const companyIdFromQuery = queryParams.get('companyId');

  // Estados do formulário
  const [firstName, setFirstName]       = useState('');
  const [lastName, setLastName]         = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [isActive, setIsActive]         = useState(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  const { data: operatorDetails, isLoading } = useQuery<OperatorData, Error>({
    queryKey: ['operator', operatorId],
    queryFn: () => fetchOperatorById(operatorId!),
    enabled: isEditing,
  });

  const companyIdForFetch = useMemo(() => {
    if (isEditing && operatorDetails) {
      return operatorDetails.operatorDetails?.company?.id;
    }
    if (user?.role === UserRole.PLATFORM_ADMIN) return companyIdFromQuery;
    return user?.company?.id;
  }, [operatorDetails, isEditing, user, companyIdFromQuery]);

  const { data: availableServices = [] } = useQuery<SimpleServiceData[]>({
    queryKey: ['services', companyIdForFetch],
    queryFn: () => fetchServices(companyIdForFetch ?? undefined),
    enabled: !!companyIdForFetch,
  });

  useEffect(() => {
    if (isEditing && operatorDetails) {
      setFirstName(operatorDetails.firstName);
      setLastName(operatorDetails.lastName);
      setEmail(operatorDetails.email);
      setIsActive(operatorDetails.isActive);
      setSelectedServiceIds(new Set(operatorDetails.operatorDetails?.allowedServiceIds || []));
    }
  }, [operatorDetails, isEditing]);

  const { mutate: saveOperator, isPending } = useMutation({
    mutationFn: (operatorPayload: OperatorPayload) =>
      isEditing
        ? updateOperator({ id: operatorId!, operatorData: operatorPayload })
        : createOperator(operatorPayload),
    onSuccess: (data: any, variables) => {
      const companyId = isEditing ? operatorDetails?.operatorDetails?.company?.id : variables.companyId;
      queryClient.invalidateQueries({ queryKey: ['operators', companyId] });
      navigate(`/operators/company/${companyId}`);
    },
  });

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validação mínima frontend
    if (!firstName.trim() || !lastName.trim()) {
      alert('Preencha o primeiro e último nome.');
      return;
    }
    if (!isEditing) {
      if (!companyIdForFetch) {
        alert('Empresa não determinada. Selecione uma empresa na lista antes de criar o operador.');
        return;
      }
      if (!password || password.length < 10) {
        alert('Password obrigatória (mínimo 10 caracteres).');
        return;
      }
    }

    const payload: OperatorPayload = {
      firstName,
      lastName,
      email,
      allowedServiceIds: Array.from(selectedServiceIds),
    };

    if (isEditing) {
      payload.isActive = isActive;
      if (password) payload.password = password;
    } else {
      payload.password  = password;
      payload.companyId = companyIdForFetch ?? undefined;
    }

    saveOperator(payload);
  };

  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isEditing && isLoading) return <div className="p-6 text-center">A carregar operador...</div>;

  // ====== SECÇÕES (tipadas por inferência do template) ======
  const sections: SectionsProp = [
    {
      title: 'Identificação',
      description: 'Dados base de identificação do operador.',
      accent: true,
      content: (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="firstName">
                Primeiro Nome <span className="text-red-500">*</span>
              </Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="lastName">
                Último Nome <span className="text-red-500">*</span>
              </Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isEditing}
            />
          </div>

          {!isEditing && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
              />
              <p className="text-xs text-gray-500">Mínimo 10 caracteres.</p>
            </div>
          )}
        </form>
      ),
    },

    {
      title: 'Estado',
      description: 'Ative ou desative o operador.',
      accent: true,
      content: (
        <div className="flex items-center gap-2">
          <Checkbox id="isActive" checked={isActive} onCheckedChange={(c) => setIsActive(Boolean(c))} />
          <Label htmlFor="isActive">Operador Ativo</Label>
        </div>
      ),
    },

    {
      title: 'Serviços Permitidos',
      description: 'Se nenhum serviço for selecionado, o operador terá acesso a todos.',
      accent: true,
      className: 'md:col-span-2',
      content: (
        <div className="space-y-2 p-1">
          <div className="space-y-2 p-4 border rounded-md max-h-56 overflow-y-auto">
            {availableServices.map((service) => (
              <div key={service.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`service-${service.id}`}
                  checked={selectedServiceIds.has(service.id)}
                  onCheckedChange={() => handleServiceToggle(service.id)}
                />
                <Label htmlFor={`service-${service.id}`} className="font-normal">{service.name}</Label>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <DetailFormTemplate
      header={{
        icon: Users,
        title: isEditing ? 'Editar Operador' : 'Criar Operador',
        subtitle: isEditing
          ? `${operatorDetails?.firstName} ${operatorDetails?.lastName} • ${operatorDetails?.operatorDetails?.company?.name ?? ''}`
          : 'Defina os detalhes e permissões do operador.',
        actions: (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button size="sm" onClick={() => handleSubmit()} disabled={isPending}>
              {isPending ? 'A Guardar...' : (isEditing ? 'Guardar Alterações' : 'Guardar Operador')}
            </Button>
          </div>
        ),
      }}
      columnsMd={2}
      sections={sections}
      // ⚠️ O tipo do DetailFormTemplate exige "actions" no root; passamos vazio para não duplicar botões:
      actions={<></>}
    />
  );
};

export default EditOperatorPage;
