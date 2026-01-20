// frontend/src/pages/EditOperatorPage.tsx (VERSÃO COMPLETA)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createOperator, updateOperator, fetchOperatorById, fetchServices } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';

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
//  company: { id: string };
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  const { data: operatorDetails, isLoading } = useQuery<OperatorData, Error>({
    queryKey: ['operator', operatorId],
    queryFn: () => fetchOperatorById(operatorId!),
    enabled: isEditing,
  });

  // --- LOG DE DEPURAÇÃO #1 ---
  console.log('Dados recebidos pela query "operatorDetails":', operatorDetails);

  const companyIdForFetch = useMemo(() => {

    // --- LOG DE DEPURAÇÃO #2 ---
    console.log('Dentro do useMemo. operatorDetails é:', operatorDetails);

    if (isEditing && operatorDetails) {
      // --- LOG DE DEPURAÇÃO #3 ---
      console.log('Tentando aceder a operatorDetails.company:', operatorDetails.operatorDetails?.company);
      return operatorDetails.operatorDetails?.company?.id;
    }
    if (user?.role === UserRole.PLATFORM_ADMIN) return queryParams.get('companyId');
    return user?.company?.id
  }, [operatorDetails, isEditing, user, queryParams]);

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
    mutationFn: (operatorPayload: OperatorPayload) => isEditing ? updateOperator({ id: operatorId!, operatorData: operatorPayload }) : createOperator(operatorPayload),
    onSuccess: (data: any, variables) => {
      const companyId = isEditing ? operatorDetails?.operatorDetails?.company?.id : variables.companyId;
      queryClient.invalidateQueries({ queryKey: ['operators', companyId] });
      navigate(`/operators/company/${companyId}`);
    },
  });
  
  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) newSet.delete(serviceId);
      else newSet.add(serviceId);
      return newSet;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: OperatorPayload = {
      firstName,
      lastName,
      email,
//      isActive,
      allowedServiceIds: Array.from(selectedServiceIds),
    };
  if (isEditing) {
    // Se estivermos a editar, adicionamos 'isActive'. A password é opcional.
    payload.isActive = isActive;
    if (password) {
      payload.password = password;
    }
  } else {
    // Se estivermos a criar, a 'password' e o 'companyId' são obrigatórios.
    payload.password = password;
    payload.companyId = companyIdForFetch ?? undefined;
  }
    
    saveOperator(payload);
  };

  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isEditing && isLoading) return <div className="p-6 text-center">A carregar operador...</div>;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Operador' : 'Criar Novo Operador'}</CardTitle>
        <CardDescription>Defina os detalhes e permissões do operador.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5"><Label htmlFor="firstName">Primeiro Nome <span className="text-red-500">*</span></Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
            <div className="grid w-full items-center gap-1.5"><Label htmlFor="lastName">Último Nome <span className="text-red-500">*</span></Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
          </div>
          <div className="grid w-full items-center gap-1.5"><Label htmlFor="email">Email <span className="text-red-500">*</span></Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isEditing}/></div>
          {!isEditing && (<div className="grid w-full items-center gap-1.5"><Label htmlFor="password">Password <span className="text-red-500">*</span></Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} /></div>)}
          <div className="flex items-center space-x-2"><Checkbox id="isActive" checked={isActive} onCheckedChange={(checked) => setIsActive(Boolean(checked))} /><Label htmlFor="isActive">Operador Ativo</Label></div>
          
          <div className="grid w-full items-center gap-1.5 pt-4 border-t">
            <Label>Serviços Permitidos</Label>
            <p className="text-sm text-muted-foreground">Se nenhum serviço for selecionado, o operador terá acesso a todos.</p>
            <div className="space-y-2 p-4 border rounded-md max-h-48 overflow-y-auto">
              {availableServices.map((service) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox id={`service-${service.id}`} checked={selectedServiceIds.has(service.id)} onCheckedChange={() => handleServiceToggle(service.id)} />
                  <Label htmlFor={`service-${service.id}`} className="font-normal">{service.name}</Label>
                </div>
              ))}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'A Guardar...' : 'Guardar Operador'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EditOperatorPage;