// frontend/src/pages/ServicesListPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchServices, fetchCompanies, deleteService } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { PlusCircle, Edit, Trash2, Building2, Blocks } from 'lucide-react';
import { Label } from '../components/ui/Label';

interface ServiceData {
  id: string;
  name: string;
  ticketPrefix: string;
  maxTicketsPerDay: number | null;
  isIssuingSuspended: boolean;
}

const ServicesListPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const selectedCompanyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;

  // NOVO: Estado para controlar o modal de apagar
  const [serviceToDelete, setServiceToDelete] = useState<ServiceData | null>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: services = [], isLoading, error } = useQuery<ServiceData[], Error>({
    queryKey: ['services', selectedCompanyId],
    queryFn: () => fetchServices(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  // Mutação para apagar o serviço
  const { mutate: deleteServiceMutate, isPending: isDeleting, error: deleteError } = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', selectedCompanyId] });
      setServiceToDelete(null); // Fecha o modal com sucesso
    },
  });

  const handleCompanySelect = (newCompanyId: string) => {
    navigate(`/services/company/${newCompanyId}`);
  };

  // Handlers para o modal de apagar
  const handleDeleteClick = (service: ServiceData) => {
    setServiceToDelete(service);
  };

  const handleConfirmDelete = () => {
    if (!serviceToDelete) return;
    deleteServiceMutate(serviceToDelete.id);
  };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* LADO ESQUERDO: TÍTULO E DESCRIÇÃO */}
            <div>
              <CardTitle className="flex items-center gap-2">
                <Blocks className="w-6 h-6" />
                Serviços de Atendimento
              </CardTitle>
              <CardDescription>Gira os serviços oferecidos pela sua empresa.</CardDescription>
            </div>

            {/* LADO DIREITO: FILTROS E AÇÕES (SÓ APARECE SE HOUVER EMPRESA SELECIONADA) */}
            <div className="flex items-center gap-4">
              
              {/* DROPDOWN DE EMPRESAS (SÓ PARA PLATFORM ADMIN) */}
              {user.role === UserRole.PLATFORM_ADMIN && (
                <div className="w-full md:w-64">
                    <Label htmlFor="company-select" className="sr-only">Filtrar por Empresa</Label>
                    <Select value={selectedCompanyId} onValueChange={handleCompanySelect}>
                        <SelectTrigger id="company-select" className="bg-white">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-500" />
                                <SelectValue placeholder="Selecione a Empresa" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {/* <SelectItem value="ALL">Todas as Empresas</SelectItem> */}
                            {companies.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              )}

              {/* BOTÃO ADICIONAR (SÓ APARECE SE HOUVER EMPRESA SELECIONADA) */}
              {selectedCompanyId && (
                <Button asChild>
                  <Link to={`/services/new?companyId=${selectedCompanyId}`}><PlusCircle className="mr-2 h-4 w-4"/> Criar Novo Serviço</Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
{/*           {user.role === UserRole.PLATFORM_ADMIN && (
            <div className="mb-4">
              <Select onValueChange={handleCompanySelect} value={selectedCompanyId}>
                <SelectTrigger className="w-full md:w-1/3">
                  <SelectValue placeholder="Selecione uma empresa para ver os seus serviços..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )} */}
          
          {isLoading && <p className="text-center py-4">A carregar serviços...</p>}
          {error && <p className="text-center py-4 text-red-500">{(error as Error).message}</p>}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Serviço</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Limite Diário</TableHead>
                  <TableHead>Suspenso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service: ServiceData) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.ticketPrefix}</TableCell>
                    <TableCell>{service.maxTicketsPerDay ?? 'N/A'}</TableCell>
                    <TableCell>{service.isIssuingSuspended ? 'Sim' : 'Não'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center">
                        <Button asChild variant="ghost" size="icon" title="Editar Serviço">
                          <Link to={`/services/edit/${service.id}`}><Edit className="h-4 w-4"/></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Apagar Serviço" onClick={() => handleDeleteClick(service)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Eliminação */}
      {serviceToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar o serviço "{serviceToDelete.name}"?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">
                Esta ação não pode ser revertida. Se este serviço estiver em uso, a eliminação poderá falhar.
              </p>
              {deleteError && <p className="text-sm text-red-600 mt-2">Erro: {(deleteError as Error).message}</p>}
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setServiceToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'A Apagar...' : 'Apagar Serviço'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ServicesListPage;