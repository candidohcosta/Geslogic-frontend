// frontend/src/pages/SchedulesListPage.tsx (VERSÃO COMPLETA)

import React, { useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSchedules, fetchCompanies, deleteSchedule } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { PlusCircle, Edit, Trash2, Building2, OctagonMinus } from 'lucide-react';
import { translatePriorityRuleType } from '../lib/translations';
import { PriorityRuleType } from '../types/schedules';
import { Label } from '../components/ui/Label';

interface ScheduleData {
  id: string;
  description: string;
  userType: {
    id: string;
    name: string;
  };
  ruleType: PriorityRuleType;
  isActive: boolean;
  timeSlots: any[];
}

const SchedulesListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const selectedCompanyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;

  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleData | null>(null);

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: fetchCompanies, enabled: user?.role === UserRole.PLATFORM_ADMIN });

  const { data: schedules = [], isLoading, error } = useQuery<ScheduleData[], Error>({
    queryKey: ['schedules', selectedCompanyId],
    queryFn: () => fetchSchedules(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

const { mutate: deleteScheduleMutate, isPending: isDeleting } = useMutation<void, Error, string>({
  mutationFn: deleteSchedule,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['schedules', selectedCompanyId] });
    setScheduleToDelete(null);
  },
});
  
  const handleCompanySelect = (newCompanyId: string) => navigate(`/schedules/company/${newCompanyId}`);
  const handleDeleteClick = (schedule: ScheduleData) => setScheduleToDelete(schedule);
  const handleConfirmDelete = () => { if (scheduleToDelete) deleteScheduleMutate(scheduleToDelete.id); };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* LADO ESQUERDO: TÍTULO E DESCRIÇÃO */}
            <div>
              <CardTitle className="flex items-center gap-2">
                <OctagonMinus className="w-6 h-6" />
                Regras de Prioridade</CardTitle>
              <CardDescription>Gira as regras de prioridade de atendimento.</CardDescription>
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
                  <Link to={`/schedules/new?companyId=${selectedCompanyId}`}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Criar Nova Regra
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>

          {/* AQUI ESTÁ O DROPDOWN PARA O PLATFORM ADMIN */}
{/*           {user?.role === UserRole.PLATFORM_ADMIN && (
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
          
          {isLoading && <p>A carregar...</p>}
          {error && <p className="text-red-500">{(error as Error).message}</p>}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo de Utilizador</TableHead>
                  <TableHead>Tipo de Regra</TableHead>
                  <TableHead>Nº de Intervalos</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.description}</TableCell>
                    <TableCell>{schedule.userType.name}</TableCell>
                    <TableCell>{translatePriorityRuleType(schedule.ruleType)}</TableCell>
                    <TableCell>{schedule.timeSlots?.length || 0}</TableCell>
                    <TableCell>{schedule.isActive ? 'Sim' : 'Não'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Button asChild variant="ghost" size="icon"><Link to={`/schedules/edit/${schedule.id}`}><Edit className="h-4 w-4"/></Link></Button>
                        <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDeleteClick(schedule)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {scheduleToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar a regra de prioridade "{scheduleToDelete.description}"?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">
                Esta ação não pode ser revertida.
              </p>
              {/* Opcional: Adicionar a mensagem de erro da mutação, se houver */}
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setScheduleToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'A Apagar...' : 'Apagar Regra'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SchedulesListPage;