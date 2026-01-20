// frontend/src/pages/OperatorsListPage.tsx (VERSÃO COMPLETA)

import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOperators, fetchCompanies, deleteOperator } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { PlusCircle, Edit, Trash2, Building2, User, Monitor, Users } from 'lucide-react';
import { Label } from '../components/ui/Label';

// --- INTERFACES DE DADOS ---
interface OperatorData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

const OperatorsListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();


  // --- LOG DE DEPURAÇÃO #1: VERIFICAR OS DADOS DE ENTRADA ---
  console.log('[OperatorsListPage] Renderizou. User:', user);
  console.log('[OperatorsListPage] Company ID do URL:', companyIdFromUrl);


//  const selectedCompanyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;

  const selectedCompanyId = useMemo(() => {
    if (user?.role === UserRole.PLATFORM_ADMIN) {
      return companyIdFromUrl;
    }
    return user?.company?.id;
  }, [user, companyIdFromUrl]);


  // --- LOG DE DEPURAÇÃO #2: VERIFICAR O ID DA EMPRESA SELECIONADA ---
  console.log('[OperatorsListPage] Company ID selecionado para as queries:', selectedCompanyId);


  const [operatorToDelete, setOperatorToDelete] = useState<OperatorData | null>(null);

/*   const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  }); */

  // --- Query de Empresas ---
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });
  console.log('[OperatorsListPage] Query de Empresas - Loading:', isLoadingCompanies, 'Data:', companies);

  // O NOSSO LOG DE DEPURAÇÃO
  console.log('--- OperatorsListPage ---');
  console.log('User Role:', user?.role);
  console.log('Company ID from URL:', companyIdFromUrl);
  console.log('User Company ID from Context:', user?.company?.id);
  console.log('FINAL selectedCompanyId a ser usado na Query:', selectedCompanyId);
  console.log('-------------------------');

/*   const { data: operators = [], isLoading, error } = useQuery<OperatorData[], Error>({
    queryKey: ['operators', selectedCompanyId],
    queryFn: () => fetchOperators(selectedCompanyId),
    enabled: !!selectedCompanyId,
  }); */


  // --- Query de Operadores ---
  const { data: operators = [], isLoading: isLoadingOperators, error } = useQuery<OperatorData[], Error>({
    queryKey: ['operators', selectedCompanyId],
    queryFn: () => {
      console.log(`[OperatorsListPage] A EXECUTAR queryFn para fetchOperators com companyId: ${selectedCompanyId}`);
      return fetchOperators(selectedCompanyId);
    },
    enabled: !!selectedCompanyId,
  });
  console.log('[OperatorsListPage] Query de Operadores - Loading:', isLoadingOperators, 'Data:', operators, 'Error:', error);


  const { mutate: deleteOperatorMutate, isPending: isDeleting, error: deleteError } = useMutation({
    mutationFn: deleteOperator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators', selectedCompanyId] });
      setOperatorToDelete(null);
    },
  });

  const handleCompanySelect = (newCompanyId: string) => {
    navigate(`/operators/company/${newCompanyId}`);
  };

  const handleDeleteClick = (operator: OperatorData) => {
    setOperatorToDelete(operator);
  };

  const handleConfirmDelete = () => {
    if (!operatorToDelete) return;
    deleteOperatorMutate(operatorToDelete.id);
  };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  const isLoading = isLoadingOperators || (user.role === UserRole.PLATFORM_ADMIN && isLoadingCompanies);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* LADO ESQUERDO: TÍTULO E DESCRIÇÃO */}
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                Operadores
                </CardTitle>
              <CardDescription>Gira os utilizadores com permissão para operar os balcões.</CardDescription>
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
                  <Link to={`/operators/new?companyId=${selectedCompanyId}`}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Criar Operador
                  </Link>
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
                  <SelectValue placeholder="Selecione uma empresa para ver os operadores..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )} */}
          
          {isLoading && <p className="text-center py-4">A carregar operadores...</p>}
          {error && <p className="text-center py-4 text-red-500">{(error as Error).message}</p>}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators.map((operator: OperatorData) => (
                  <TableRow key={operator.id}>
                    <TableCell className="font-medium">{operator.firstName} {operator.lastName}</TableCell>
                    <TableCell>{operator.email}</TableCell>
                    <TableCell>{operator.isActive ? 'Sim' : 'Não'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center">
                        <Button asChild variant="ghost" size="icon" title="Editar Operador">
                          <Link to={`/operators/edit/${operator.id}`}><Edit className="h-4 w-4"/></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Apagar Operador" onClick={() => handleDeleteClick(operator)}>
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
      {operatorToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar o operador "{operatorToDelete.firstName} {operatorToDelete.lastName}"?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">Esta ação não pode ser revertida.</p>
              {deleteError && <p className="text-sm text-red-600 mt-2">Erro: {(deleteError as Error).message}</p>}
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setOperatorToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'A Apagar...' : 'Apagar Operador'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OperatorsListPage;