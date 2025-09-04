// frontend/src/pages/LogsPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchLogs, fetchLogActions, fetchLogLevels } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { useDebounce } from '../hooks/useDebounce';
import * as Papa from 'papaparse'; // 1. IMPORTAR
import { fetchAllLogsForExport } from '../services/api'; // 2. IMPORTAR

// Interface para os dados de um Log
interface LogData {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'DEBUG';
  action: string;
  message: string;
  context?: Record<string, any>;
  user?: { id: string; email: string; };
}

interface LogsApiResponse {
  data: LogData[];
  total: number;
  page: number;
  limit: number;
}

const LogsPage: React.FC = () => {
  const { user } = useAuth();
  
  const [page, setPage] = useState(1);
  const [messageInput, setMessageInput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [filters, setFilters] = useState({ level: '', action: '', startDate: '', endDate: '' });
  const [selectedLog, setSelectedLog] = useState<LogData | null>(null);

const [sortBy, setSortBy] = useState('timestamp');
const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const debouncedMessage = useDebounce(messageInput, 500);
  const debouncedUser = useDebounce(userInput, 500);

  const queryFilters = useMemo(() => ({
    page,
    ...filters,
    sortBy,
    sortOrder,
    messageQuery: debouncedMessage,
    userQuery: debouncedUser,
  }), [page, filters, sortBy, sortOrder, debouncedMessage, debouncedUser]);

  const { data: logsData, isLoading, error } = useQuery<LogsApiResponse, Error>({
    queryKey: ['logs', queryFilters],
    queryFn: () => fetchLogs(queryFilters),
    placeholderData: keepPreviousData,
    enabled: !!user,
  });

  const { data: logActions = [] } = useQuery<string[]>({ queryKey: ['logActions'], queryFn: fetchLogActions });
  const { data: logLevels = [] } = useQuery<string[]>({ queryKey: ['logLevels'], queryFn: fetchLogLevels });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleSelectFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value === 'all' ? '' : value }));
    setPage(1);
  };

  const handleExport = async () => {
    try {
      // Vai buscar TODOS os logs que correspondem aos filtros atuais
      const allLogs: LogData[] = await fetchAllLogsForExport(queryFilters);
      
      if (!allLogs || allLogs.length === 0) {
        alert('Não há dados para exportar com os filtros atuais.');
        return;
      }
      
      // Formata os dados para o CSV
      const formattedData = allLogs.map(log => ({
        Timestamp: new Date(log.timestamp).toLocaleString(),
        Nivel: log.level,
        Acao: log.action,
        Mensagem: log.message,
        Utilizador: log.user?.email || 'Sistema',
        Contexto: JSON.stringify(log.context),
      }));

      // Converte o JSON para CSV
      const csv = Papa.unparse(formattedData);
      
      // Cria e descarrega o ficheiro
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'logs_export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Erro ao exportar logs:", error);
      alert('Ocorreu um erro ao exportar os logs.');
    }
  };

const handleSort = (columnName: string) => {
  // Se clicamos na mesma coluna, inverte a ordem.
  if (sortBy === columnName) {
    setSortOrder(currentOrder => (currentOrder === 'ASC' ? 'DESC' : 'ASC'));
  } else {
    // Se clicamos numa nova coluna, define-a como a de ordenação e começa por DESC.
    setSortBy(columnName);
    setSortOrder('DESC');
  }
};


  if (!user || user.role !== UserRole.PLATFORM_ADMIN) return <Navigate to="/dashboard" />;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Logs do Sistema</CardTitle>
          <CardDescription>Auditoria de todas as ações e erros registados na plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
{/*           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-gray-50">
            <Input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
            <Input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
            <Select value={filters.level} onValueChange={(value) => handleSelectFilterChange('level', value)}>
              <SelectTrigger><SelectValue placeholder="Filtrar por Nível" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os Níveis</SelectItem>{logLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.action} onValueChange={(value) => handleSelectFilterChange('action', value)}>
              <SelectTrigger><SelectValue placeholder="Filtrar por Ação" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas as Ações</SelectItem>{logActions.map(action => <SelectItem key={action} value={action}>{action}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Pesquisar na mensagem..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} />
            <Input placeholder="Pesquisar no utilizador..." value={userInput} onChange={(e) => setUserInput(e.target.value)} />
          </div> */}

          {isLoading && <p className="text-center py-4">A carregar logs...</p>}
          {error && <p className="text-red-500 text-center py-4">{error.message}</p>}
          
          {!isLoading && !error && (
            <div>
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('timestamp')}>
                            Timestamp
                            {sortBy === 'timestamp' && (sortOrder === 'ASC' ? ' ▲' : ' ▼')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('level')}>
                            Nível
                            {sortBy === 'level' && (sortOrder === 'ASC' ? ' ▲' : ' ▼')}
                        </Button>                        
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('action')}>
                            Ação
                            {sortBy === 'action' && (sortOrder === 'ASC' ? ' ▲' : ' ▼')}
                        </Button>                        
                      </TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Utilizador</TableHead>
                    </TableRow>
                  
                  {/* Linha 2: Filtros */}
                  <TableRow>
                    <TableHead className="p-1">
                      <div className="flex items-center space-x-1">
                        <Input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="text-xs h-8"/>
                        <Input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="text-xs h-8"/>
                      </div>
                    </TableHead>
                    <TableHead className="p-1">
                      <Select value={filters.level} onValueChange={(value) => handleSelectFilterChange('level', value)}>
                        <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Nível" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos</SelectItem>{logLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="p-1">
                      <Select value={filters.action} onValueChange={(value) => handleSelectFilterChange('action', value)}>
                        <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Ação" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todas</SelectItem>{logActions.map(action => <SelectItem key={action} value={action}>{action}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="p-1">
                      <Input placeholder="Pesquisar..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} className="text-xs h-8"/>
                    </TableHead>
                    <TableHead className="p-1">
                      <Input placeholder="Pesquisar..." value={userInput} onChange={(e) => setUserInput(e.target.value)} className="text-xs h-8"/>
                    </TableHead>
                  </TableRow>                    
                  </TableHeader>
                  <TableBody>
                    {logsData?.data.map((log: LogData) => (
                      <TableRow key={log.id} onDoubleClick={() => setSelectedLog(log)} className="cursor-pointer hover:bg-gray-50">
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{log.level}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                        <TableCell>{log.user?.email || 'Sistema'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid grid-cols-1 gap-4 md:hidden">
                <div className="grid grid-cols-2 gap-2 p-2 border rounded-lg bg-gray-50">
                    {/* Em mobile, podemos ter menos filtros */}
                    <Input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                    <Input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    <Input placeholder="Pesquisar na mensagem..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} className="col-span-2" />
                </div>

                {logsData?.data.map((log: LogData) => (
                  <div key={log.id} onDoubleClick={() => setSelectedLog(log)} className="rounded-lg border p-4 space-y-2 cursor-pointer hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <span className="font-bold">{log.action}</span>
                      <span className="font-mono text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">{log.level}</span>
                    </div>
                    <p className="text-sm truncate">{log.message}</p>
                    <p className="text-xs text-muted-foreground">{log.user?.email || 'Sistema'} - {new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
    <div> {/* Div para o botão de exportar */}
      <Button variant="outline" onClick={handleExport}>
        Exportar para CSV
      </Button>
    </div>            
            <span className="text-sm text-muted-foreground">
              Total de {logsData?.total || 0} registos. Página {logsData?.page || 1}.
            </span>
            <div className="space-x-2">
              <Button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isLoading}>Anterior</Button>
              <Button onClick={() => setPage(p => p + 1)} disabled={!logsData || logsData.data.length < logsData.limit || isLoading}>Próxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
          <Card className="w-full max-w-2xl relative" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Detalhes do Log</CardTitle>
              <CardDescription>ID: {selectedLog.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-[60vh]">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>Fechar</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};

export default LogsPage;