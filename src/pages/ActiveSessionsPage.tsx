// frontend/src/pages/ActiveSessionsPage.tsx

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchActiveSessions, adminForceCloseSession, fetchCompanies } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'; // Importar Select
import { Label } from '../components/ui/Label';
import { PowerOff, User as UserIcon, Monitor, Clock, Building2, MonitorCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';

interface SessionData {
  id: string;
  isActive: boolean;
  loginTime: string;
  operator: { firstName: string; lastName: string; email: string; };
  counter: { name: string; };
  station: { name: string; };
}

const ActiveSessionsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // 1. Carregar Empresas (Apenas para Platform Admin)
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // 2. Carregar Sessões (Depende do filtro)
  const { data: sessions, isLoading } = useQuery<SessionData[]>({
    queryKey: ['activeSessions', selectedCompanyId],
    queryFn: () => fetchActiveSessions(selectedCompanyId === 'ALL' ? undefined : selectedCompanyId),
  });

  const { mutate: killSession, isPending } = useMutation({
    mutationFn: adminForceCloseSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      alert("Sessão encerrada com sucesso.");
    },
    onError: (err: any) => {
      alert("Erro ao encerrar sessão: " + err.message);
    }
  });

  const handleKill = (sessionId: string, operatorName: string) => {
    if (window.confirm(`Tem a certeza que quer forçar o fim da sessão de ${operatorName}?`)) {
      killSession(sessionId);
    }
  };

  if (!user || ![UserRole.PLATFORM_ADMIN, UserRole.COMPANY_ADMIN].includes(user.role)) {
    return <div className="p-8 text-center">Acesso negado.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <MonitorCheck className="w-6 h-6" />
                    Sessões de Atendimento Ativas
                </CardTitle>
                <CardDescription>
                    Monitorize os operadores que estão atualmente a trabalhar.
                </CardDescription>
            </div>

            {/* DROPDOWN DE FILTRO (SÓ PLATFORM ADMIN) */}
            {user.role === UserRole.PLATFORM_ADMIN && (
                <div className="w-full md:w-64">
                    <Label htmlFor="company-select" className="sr-only">Filtrar por Empresa</Label>
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger id="company-select">
                            <SelectValue placeholder="Todas as Empresas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas as Empresas</SelectItem>
                            {companies.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center p-4">A carregar sessões...</p>
          ) : !sessions || sessions.length === 0 ? (
            <p className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
              Nenhum operador a trabalhar neste momento.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operador</TableHead>
                    <TableHead>Balcão / Posto</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <UserIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{session.operator.firstName} {session.operator.lastName}</p>
                            <p className="text-xs text-muted-foreground">{session.operator.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{session.counter.name}</p>
                        <p className="text-sm text-muted-foreground">{session.station.name}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {new Date(session.loginTime).toLocaleString('pt-PT')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleKill(session.id, session.operator.firstName)}
                          disabled={isPending}
                          title="Forçar Encerramento"
                        >
                          <PowerOff className="w-4 h-4 mr-2" />
                          Encerrar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActiveSessionsPage;