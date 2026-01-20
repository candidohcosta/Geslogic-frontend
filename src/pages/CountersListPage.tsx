// frontend/src/pages/CountersListPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCounters, fetchCompanies, deleteCounter } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { PlusCircle, Edit, Trash2, Building2, Computer } from 'lucide-react';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';

// --- INTERFACES DE DADOS ---
interface SimpleServiceData {
  id: string;
  name: string;
}

interface CounterData {
  id: string;
  name: string;
  locationDescription: string | null;
  services: SimpleServiceData[];
}

const CountersListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const selectedCompanyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;

  // Estados locais para a UI (Modais)
  const [counterToDelete, setCounterToDelete] = useState<CounterData | null>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: counters = [], isLoading, error } = useQuery<CounterData[], Error>({
    queryKey: ['counters', selectedCompanyId],
    queryFn: () => fetchCounters(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { mutate: deleteCounterMutate, isPending: isDeleting, error: deleteError } = useMutation({
    mutationFn: deleteCounter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counters', selectedCompanyId] });
      setCounterToDelete(null); // Fecha o modal
    },
  });

  const handleCompanySelect = (newCompanyId: string) => {
    navigate(`/counters/company/${newCompanyId}`);
  };

  const handleDeleteClick = (counter: CounterData) => {
    setCounterToDelete(counter);
  };

  const handleConfirmDelete = () => {
    if (!counterToDelete) return;
    deleteCounterMutate(counterToDelete.id);
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
                <Computer className="w-6 h-6" />
                Balcões de Atendimento
              </CardTitle>
              <CardDescription>Gira os balcões de atendimento da sua empresa.</CardDescription>
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
                  <Link to={`/counters/new?companyId=${selectedCompanyId}`}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Criar Novo Balcão
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
          
          {isLoading && <p className="text-center py-4">A carregar balcões...</p>}
          {error && <p className="text-center py-4 text-red-500">{(error as Error).message}</p>}
          {deleteError && <p className="text-center py-4 text-red-500">Erro ao apagar: {(deleteError as Error).message}</p>}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Balcão</TableHead>
                  <TableHead>Serviços Associados</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counters.map((counter: CounterData) => (
                  <TableRow key={counter.id}>
                    <TableCell className="font-medium">{counter.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {counter.services?.map(s => s.name).join(', ') || 'Nenhum'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center">
                        <Button asChild variant="ghost" size="icon" title="Editar Balcão">
                          <Link to={`/counters/edit/${counter.id}`}><Edit className="h-4 w-4"/></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Apagar Balcão" onClick={() => handleDeleteClick(counter)}>
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
      {counterToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar o balcão "{counterToDelete.name}"?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">
                Esta ação não pode ser revertida.
              </p>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setCounterToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'A Apagar...' : 'Apagar Balcão'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CountersListPage;