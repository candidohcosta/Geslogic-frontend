// frontend/src/pages/event-staff/EventStaffListPage.tsx

import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEventStaff, fetchCompanies, deleteEventStaff } from '../../services/api'; 
import { UserRole } from '../../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { PlusCircle, Edit, Trash2, Building2, UserCheck } from 'lucide-react';
import { Label } from '../../components/ui/Label';

// Interface para tipar os dados que vêm da API
interface EventStaffData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

const EventStaffListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Captura o ID da empresa do URL (se existir)
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  // Estado para o modal de apagar
  const [staffToDelete, setStaffToDelete] = useState<EventStaffData | null>(null);

  // --- LÓGICA DE SELEÇÃO DE EMPRESA ---
  const selectedCompanyId = useMemo(() => {
    // 1. Se for Company Admin, usa sempre a do contexto (ignora URL)
    if (user?.role === UserRole.COMPANY_ADMIN) {
      return user.company?.id;
    }
    // 2. Se for Platform Admin, usa a do URL
    if (user?.role === UserRole.PLATFORM_ADMIN) {
      return companyIdFromUrl;
    }
    return undefined;
  }, [user, companyIdFromUrl]);

  // --- 1. BUSCAR EMPRESAS (Apenas Platform Admin) ---
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // --- 2. BUSCAR STAFF (Depende da empresa selecionada) ---
  const { data: staffList = [], isLoading: isLoadingStaff } = useQuery<EventStaffData[]>({
    queryKey: ['eventStaff', selectedCompanyId],
    queryFn: () => fetchEventStaff(selectedCompanyId!),
    enabled: !!selectedCompanyId, // Só busca se houver ID
  });

  // --- MUTAÇÃO APAGAR ---
  const { mutate: deleteStaffMutate, isPending: isDeleting } = useMutation({
    mutationFn: deleteEventStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventStaff', selectedCompanyId] });
      setStaffToDelete(null);
    },
    onError: (err: any) => alert(`Erro ao apagar: ${err.message}`)
  });

  // Handler para quando o Platform Admin muda o dropdown
  const handleCompanySelect = (newCompanyId: string) => {
    navigate(`/event-staff/company/${newCompanyId}`);
  };

  const handleConfirmDelete = () => {
    if (staffToDelete) deleteStaffMutate(staffToDelete.id);
  };

  // Proteção de Rota
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  const isLoading = isLoadingStaff || (user.role === UserRole.PLATFORM_ADMIN && isLoadingCompanies);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* TÍTULO */}
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-blue-600" />
                Staff de Eventos
              </CardTitle>
              <CardDescription>
                Gerir utilizadores com permissão para validar entradas (Check-in).
              </CardDescription>
            </div>

            {/* AÇÕES (Select + Botão Criar) */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              
              {/* Dropdown (Só para Platform Admin) */}
              {user.role === UserRole.PLATFORM_ADMIN && (
                <div className="w-full sm:w-64">
                    <Label htmlFor="company-select" className="sr-only">Filtrar por Empresa</Label>
                    <Select value={selectedCompanyId || ''} onValueChange={handleCompanySelect}>
                        <SelectTrigger id="company-select" className="bg-white">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-500" />
                                <SelectValue placeholder="Selecione a Empresa" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {companies.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              )}
              
              {/* Botão Criar (Só aparece se houver empresa selecionada) */}
              {selectedCompanyId && (
                <Button asChild className="w-full sm:w-auto">
                  <Link to={`/event-staff/new?companyId=${selectedCompanyId}`}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Criar Staff
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* MENSAGEM SE NÃO HOUVER EMPRESA SELECIONADA */}
          {!selectedCompanyId && user.role === UserRole.PLATFORM_ADMIN ? (
             <div className="text-center py-10 border-2 border-dashed rounded-lg bg-gray-50">
                <p className="text-gray-500">Selecione uma empresa para gerir a equipa de staff.</p>
             </div>
          ) : (
             <>
                {isLoading ? (
                    <p className="text-center py-8">A carregar equipa...</p>
                ) : staffList.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>Nenhum membro de staff encontrado nesta empresa.</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffList.map((staff) => (
                                    <TableRow key={staff.id}>
                                        <TableCell className="font-medium">{staff.firstName} {staff.lastName}</TableCell>
                                        <TableCell>{staff.email}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs ${staff.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {staff.isActive ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild title="Editar">
                                                    <Link to={`/event-staff/edit/${staff.id}`}><Edit className="h-4 w-4 text-gray-600"/></Link>
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50" 
                                                    onClick={() => setStaffToDelete(staff)}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
             </>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE CONFIRMAÇÃO DE APAGAR */}
      {staffToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200">
            <CardHeader>
              <CardTitle>Eliminar Staff</CardTitle>
              <CardDescription>
                Tem a certeza que deseja eliminar <strong>{staffToDelete.firstName} {staffToDelete.lastName}</strong>?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">Esta conta deixará de ter acesso à aplicação de Check-in.</p>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline" onClick={() => setStaffToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'A eliminar...' : 'Eliminar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EventStaffListPage;