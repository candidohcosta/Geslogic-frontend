// frontend/src/pages/UserTypesListPage.tsx (VERSÃO COMPLETA)

import React, { useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserTypes, fetchCompanies, deleteUserType } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { PlusCircle, Edit, Trash2, Users, Building2, Contact } from 'lucide-react';
import { Label } from '../components/ui/Label';

interface UserTypeData {
  id: string;
  name: string;
}

const UserTypesListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const selectedCompanyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;
  
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: userTypes = [], isLoading, error } = useQuery<UserTypeData[], Error>({
    queryKey: ['userTypes', selectedCompanyId],
    queryFn: () => fetchUserTypes(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { mutate: deleteMutate, isPending: isDeleting } = useMutation({
    mutationFn: deleteUserType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes', selectedCompanyId] });
    },
  });

  const handleCompanySelect = (newCompanyId: string) => navigate(`/user-types/company/${newCompanyId}`);
  const handleDelete = (userType: UserTypeData) => {
    if (window.confirm(`Tem a certeza que deseja apagar o tipo de utente "${userType.name}"?`)) {
      deleteMutate(userType.id);
    }
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
                <Contact className="w-6 h-6" />
                  Tipos de Utente
                </CardTitle>
              <CardDescription>Gira os "moldes" de utentes para a sua empresa.</CardDescription>
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
                  <Link to={`/user-types/new?companyId=${selectedCompanyId}`}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Criar Novo Tipo
                  </Link>
                </Button>
              )}
            </div>
          </div>              
      </CardHeader>

       <CardContent>
{/*        {user.role === UserRole.PLATFORM_ADMIN && (
          <div className="mb-4">
            <Select onValueChange={handleCompanySelect} value={selectedCompanyId}>
              <SelectTrigger className="w-full md:w-1/3">
                <SelectValue placeholder="Selecione uma empresa..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company: any) => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )} */}
        
        {isLoading && <p className="text-center py-4">A carregar...</p>}
        {error && <p className="text-center py-4 text-red-500">{(error as Error).message}</p>}
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Tipo de Utente</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userTypes.map((userType: UserTypeData) => (
                <TableRow key={userType.id}>
                  <TableCell className="font-medium">{userType.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center">
    <Button asChild variant="ghost" size="icon" title="Gerir Utentes">
      <Link to={`/user-data/by-type/${userType.id}`}>
        <Users className="h-4 w-4" />
      </Link>
    </Button>

    <Button asChild variant="ghost" size="icon" title="Editar Tipo de Utente">
      <Link to={`/user-types/edit/${userType.id}`}><Edit className="h-4 w-4"/></Link>
    </Button>

    <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(userType)}>
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
    </div>
  );
};

export default UserTypesListPage;