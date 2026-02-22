// src/pages/LogsPage.tsx

import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchLogs,
  fetchLogActions,
  fetchLogLevels,
  fetchAllLogsForExport,
} from '../services/api';
import { UserRole } from '../types/user';

// Template
import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column, SortOrder } from '../components/templates/types';

// UI
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/Select';
import { StandardCard } from '../components/ui/StandardCard';

import { useDebounce } from '../hooks/useDebounce';
import * as Papa from 'papaparse';
import { FileSliders } from 'lucide-react';

// ---------- Colunas (um único source of truth) ----------
const COLS = {
  timestamp: 18,
  level: 12,
  action: 16,
  message: 28,
  user: 20,
} as const;

// Grid dos filtros (timestamp 24% dividido em 12% + 12%)
const FILTER_GRID_TEMPLATE = `
  ${COLS.timestamp / 2}%   /* Data início */
  ${COLS.timestamp / 2}%   /* Data fim */
  ${COLS.level}%           /* Nível */
  ${COLS.action}%          /* Ação */
  ${COLS.message}%         /* Mensagem */
  ${COLS.user}%            /* Utilizador */
`;

// Interfaces
interface LogData {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'DEBUG';
  action: string;
  message: string;
  context?: Record<string, any>;
  user?: { id: string; email: string };
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
  const [filters, setFilters] = useState({
    level: '',
    action: '',
    startDate: '',
    endDate: '',
  });
  const [selectedLog, setSelectedLog] = useState<LogData | null>(null);

  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  const debouncedMessage = useDebounce(messageInput, 500);
  const debouncedUser = useDebounce(userInput, 500);

  const queryFilters = useMemo(
    () => ({
      page,
      ...filters,
      sortBy,
      sortOrder,
      messageQuery: debouncedMessage,
      userQuery: debouncedUser,
    }),
    [page, filters, sortBy, sortOrder, debouncedMessage, debouncedUser]
  );

  const {
    data: logsData,
    isLoading,
    error,
  } = useQuery<LogsApiResponse, Error>({
    queryKey: ['logs', queryFilters],
    queryFn: () => fetchLogs(queryFilters),
    placeholderData: keepPreviousData,
    enabled: !!user,
  });

  const { data: logActions = [] } = useQuery<string[]>({
    queryKey: ['logActions'],
    queryFn: fetchLogActions,
    enabled: !!user,
  });

  const { data: logLevels = [] } = useQuery<string[]>({
    queryKey: ['logLevels'],
    queryFn: fetchLogLevels,
    enabled: !!user,
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleSelectFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value === 'all' ? '' : value }));
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const allLogs: LogData[] = await fetchAllLogsForExport(queryFilters);
      if (!allLogs || allLogs.length === 0) {
        alert('Não há dados para exportar com os filtros atuais.');
        return;
      }

      const formattedData = allLogs.map((log) => ({
        Timestamp: new Date(log.timestamp).toLocaleString(),
        Nivel: log.level,
        Acao: log.action,
        Mensagem: log.message,
        Utilizador: log.user?.email || 'Sistema',
        Contexto: JSON.stringify(log.context),
      }));

      const csv = Papa.unparse(formattedData);
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
      console.error('Erro ao exportar logs:', error);
      alert('Ocorreu um erro ao exportar os logs.');
    }
  };

  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortOrder((currentOrder) => (currentOrder === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(columnName);
      setSortOrder('DESC');
    }
  };

  if (!user || user.role !== UserRole.PLATFORM_ADMIN) {
    return <Navigate to="/dashboard" />;
  }

  // === Colunas para o ListPageTemplate ===
  const columns: Column<LogData>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      widthPct: COLS.timestamp,
      sortable: true,
      render: (row) => new Date(row.timestamp).toLocaleString(),
    },
    {
      key: 'level',
      header: 'Nível',
      widthPct: COLS.level,
      sortable: true,
      render: (row) => row.level,
    },
    {
      key: 'action',
      header: 'Ação',
      widthPct: COLS.action,
      sortable: true,
      render: (row) => row.action,
    },
    {
      key: 'message',
      header: 'Mensagem',
      widthPct: COLS.message,
      sortable: false,
      render: (row) => (
        <span className="block w-full truncate" title={row.message}>
          {row.message}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Utilizador',
      widthPct: COLS.user,
      sortable: false,
      render: (row) => row.user?.email || 'Sistema',
    },
  ];

  const tableEmptyState = (
    <div className="py-10 text-center text-sm">
      {isLoading
        ? 'A carregar logs...'
        : error
          ? <span className="text-red-600">{error.message}</span>
          : 'Sem resultados para os filtros atuais.'}
    </div>
  );

  return (
    <>
      <ListPageTemplate<LogData>
        header={{
          icon: FileSliders,
          title: 'Logs do Sistema',
          subtitle: 'Auditoria de todas as ações e erros registados na plataforma.',
          actions: (
            <Button variant="outline" onClick={handleExport}>
              Exportar para CSV
            </Button>
          ),
        }}

        filters={{
          colsTemplate: FILTER_GRID_TEMPLATE,
          accent: true,
          children: (
            <>
              {/* Data início */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Data início</label>
                <Input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="h-9 px-2"
                />
              </div>

              {/* Data fim */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Data fim</label>
                <Input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="h-9 px-2"
                />
              </div>

              {/* Nível */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Nível</label>
                <Select
                  value={filters.level || 'all'}
                  onValueChange={(value) => handleSelectFilterChange('level', value)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Nível" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">Todos</SelectItem>
                    {logLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ação */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Ação</label>
                <Select
                  value={filters.action || 'all'}
                  onValueChange={(value) => handleSelectFilterChange('action', value)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Ação" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">Todas</SelectItem>
                    {logActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mensagem */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Mensagem</label>
                <Input
                  placeholder="Pesquisar mensagem…"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Utilizador */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Utilizador</label>
                <Input
                  placeholder="Pesquisar utilizador…"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="h-9"
                />
              </div>
            </>
          ),
        }}

        toolbar={
          <div className="w-full flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

            <div className="text-sm text-muted-foreground">
              Total de {logsData?.total || 0} registos. Página {logsData?.page || page}.
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1 || isLoading}
              >
                Anterior
              </Button>
              <Button
                onClick={() => setPage((p) => p + 1)}
                disabled={
                  !logsData ||
                  logsData.data.length < (logsData.limit || 0) ||
                  isLoading
                }
              >
                Próxima
              </Button>
            </div>
          </div>
        }

        table={{
          columns,
          data: logsData?.data ?? [],
          rowKey: (row) => row.id,
          sortBy,
          sortOrder,
          onSort: handleSort,
          onRowClick: (row) => setSelectedLog(row),
          emptyState: tableEmptyState,
          stickyHeader: true,
          tableClassName: 'text-sm',
        }}
      />

      {/* MODAL DE DETALHE (mantido) */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-2xl relative"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <StandardCard
              title={<span className="text-base font-semibold">Detalhes do Log</span>}
              description={<span className="text-sm">ID: {selectedLog.id}</span>}
              className="w-full"
            >
              <div className="space-y-4">
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-[60vh]">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setSelectedLog(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </StandardCard>
          </div>
        </div>
      )}
    </>
  );
};

export default LogsPage;