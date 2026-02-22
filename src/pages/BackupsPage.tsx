// frontend/src/pages/BackupsPage.tsx

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Template
import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column, SortOrder } from '../components/templates/types';

// UI
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Download, Database, Loader2, Plus, RefreshCcw, Upload, Trash2, DatabaseBackup } from 'lucide-react';

import {
  fetchBackups,
  generateBackup,
  fetchCompanies,
  restoreBackup,
  uploadBackup,
  wipeSystem,
  deleteBackup
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import toast from 'react-hot-toast';

// ---------- Larguras (um único source of truth) ----------
const COLS = {
  company: 30,   // Empresa
  date: 18,      // Data de Criação
  size: 14,      // Tamanho
  type: 16,      // Tipo
  actions: 16,   // Ações
} as const;

const FILTER_GRID_TEMPLATE = `
  ${COLS.company}%  /* Empresa */
  ${COLS.date}%     /* Data (início+fim lado a lado) */
  ${COLS.size}%     /* Tamanho (sem filtro → placeholder) */
  ${COLS.type}%     /* Tipo (dropdown) */
  ${COLS.actions}%  /* Ações (placeholder) */
`;

// Tipos auxiliares
type SortBy = 'company' | 'createdAt' | 'size' | 'type';

interface Company {
  id: string;
  name: string;
}

interface BackupItem {
  id: string;
  company?: { id: string; name: string };
  createdAt: string;     // ISO
  size: number;          // bytes
  type: 'AUTOMATIC' | 'MANUAL';
  fileName: string;
}

const BackupsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ======= Estado filtros / UI =======
  const [filters, setFilters] = useState<{
    companyId: 'all' | string;
    startDate: string; // 'YYYY-MM-DD'
    endDate: string;   // 'YYYY-MM-DD'
    type: 'all' | 'AUTOMATIC' | 'MANUAL';
  }>({
    companyId: 'all',
    startDate: '',
    endDate: '',
    type: 'all',
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Ordenação (client-side)
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  // File input (upload)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ======= Queries =======
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: backups = [], isLoading } = useQuery<BackupItem[]>({
    queryKey: ['backups'],
    queryFn: fetchBackups,
  });

  // ======= Derived Lists =======
  const companyOptions = useMemo(
    () => companies
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );

  // ======= Mutations =======
  const generateMutation = useMutation({
    mutationFn: (companyId: string) => generateBackup(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Processo de backup concluído com sucesso!');
    },
    onError: (error: any) => toast.error(error.message || 'Erro ao gerar backup.')
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreBackup(id),
    onSuccess: (data: any) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (error: any) => toast.error('Erro no Restore: ' + error.message)
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadBackup(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Backup carregado e registado com sucesso!');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error: any) => toast.error('Falha no upload: ' + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBackup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Backup removido.');
    }
  });

  // ======= Handlers =======
  const handleDownload = (id: string) =>
    window.open(`${process.env.REACT_APP_API_BASE_URL}/backups/download/${id}`, '_blank');

  const handleGenerateClick = () => {
    if (filters.companyId === 'all') {
      toast.error('Por favor, selecione uma empresa específica para gerar o backup.');
      return;
    }
    generateMutation.mutate(filters.companyId);
  };

  const handleRestore = (id: string, companyName: string) => {
    const confirmText = `⚠️ ATENÇÃO: Esta ação irá APAGAR os dados atuais da empresa "${companyName}".`;
    if (window.confirm(confirmText)) {
      if (window.confirm('Operação irreversível. Prosseguir?')) {
        restoreMutation.mutate(id);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Deseja apagar o backup ${name}? O ficheiro será eliminado.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleWipeSystem = async () => {
    if (window.confirm('Isto vai limpar TODAS as empresas e utilizadores.')) {
      const password = window.prompt("Digite 'LIMPAR' para confirmar:");
      if (password === 'LIMPAR') {
        try {
          await wipeSystem();
          toast.success('Sistema limpo.');
          queryClient.invalidateQueries({ queryKey: ['backups'] });
        } catch {
          toast.error('Erro na limpeza.');
        }
      }
    }
  };

  // ======= Filtros + Ordenação + Paginação (client-side) =======
  useEffect(() => {
    setPage(1);
  }, [filters.companyId, filters.startDate, filters.endDate, filters.type]);

  const filteredSorted = useMemo(() => {
    const startTs = filters.startDate ? new Date(`${filters.startDate}T00:00:00`).getTime() : null;
    const endTs = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999`).getTime() : null;

    let list = backups
      .filter(b => (filters.companyId === 'all' ? true : b.company?.id === filters.companyId))
      .filter(b => {
        if (!startTs && !endTs) return true;
        const ts = new Date(b.createdAt).getTime();
        if (startTs && ts < startTs) return false;
        if (endTs && ts > endTs) return false;
        return true;
      })
      .filter(b => (filters.type === 'all' ? true : b.type === filters.type));

    // Ordenação
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'company':
          cmp = (a.company?.name || '').localeCompare(b.company?.name || '');
          break;
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          cmp = a.size - b.size;
          break;
        case 'type':
          cmp = a.type.localeCompare(b.type);
          break;
        default:
          cmp = 0;
      }
      return sortOrder === 'ASC' ? cmp : -cmp;
    });

    return list;
  }, [backups, filters, sortBy, sortOrder]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const pageItems = filteredSorted.slice(startIdx, endIdx);

  // Ordenação helpers
  const handleSort = (column: string) => {
    const col = column as SortBy;
    if (sortBy === col) {
      setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(col);
      setSortOrder(col === 'createdAt' ? 'DESC' : 'ASC'); // default que tinhas
    }
  };
  const sortIndicator = (column: SortBy) =>
    sortBy === column ? (sortOrder === 'ASC' ? '▲' : '▼') : '';

  // === Colunas para o ListPageTemplate ===
  const columns: Column<BackupItem>[] = [
    {
      key: 'company',
      header: (
        <span>
          Empresa {sortIndicator('company')}
        </span>
      ),
      widthPct: COLS.company,
      sortable: true,
      render: (row) => (
        <span className="block w-full truncate" title={row.company?.name || 'N/A'}>
          {row.company?.name || 'N/A'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: (
        <span>
          Data de Criação {sortIndicator('createdAt')}
        </span>
      ),
      widthPct: COLS.date,
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: 'size',
      header: (
        <span>
          Tamanho {sortIndicator('size')}
        </span>
      ),
      widthPct: COLS.size,
      sortable: true,
      render: (row) => `${(row.size / 1024 / 1024).toFixed(2)} MB`,
    },
    {
      key: 'type',
      header: (
        <span>
          Tipo {sortIndicator('type')}
        </span>
      ),
      widthPct: COLS.type,
      sortable: true,
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
            row.type === 'AUTOMATIC'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      widthPct: COLS.actions,
      sortable: false,
      align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDownload(b.id)}
            title="Descarregar"
          >
            <Download className="h-4 w-4 text-blue-600" />
          </Button>

          {user?.role === UserRole.PLATFORM_ADMIN && (
            <Button
              variant="ghost"
              size="icon"
              disabled={restoreMutation.isPending}
              onClick={() => handleRestore(b.id, b.company?.name || 'Empresa')}
              title="Repor Backup"
            >
              {restoreMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
              ) : (
                <RefreshCcw className="h-4 w-4 text-red-600" />
              )}
            </Button>
          )}

          {user?.role === UserRole.PLATFORM_ADMIN && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(b.id, b.fileName)}
              title="Eliminar Backup"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const tableEmptyState = (
    <div className="py-10 text-center text-sm">
      {isLoading ? (
        <div className="flex justify-center">
          <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-6 border-2 border-dashed rounded-lg text-gray-400">
          <Database className="mx-auto h-10 w-10 mb-2 opacity-20" />
          <p>Nenhum backup encontrado.</p>
        </div>
      ) : (
        'Sem resultados para os filtros atuais.'
      )}
    </div>
  );

  return (
    <ListPageTemplate<BackupItem>
      header={{
        icon: DatabaseBackup,
        title: 'Cópias de Segurança',
        subtitle: 'Gestão e exportação de dados por organização.',
        actions: (
          <div className="flex items-center gap-2">
            {user?.role === UserRole.PLATFORM_ADMIN && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".glback,.zip"
                />

                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Carregar Backup
                </Button>

                <Button
                  onClick={handleGenerateClick}
                  disabled={generateMutation.isPending || filters.companyId === 'all'}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Gerar Backup
                </Button>

                <Button
                  variant="destructive"
                  onClick={handleWipeSystem}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Reset Base de Dados
                </Button>
              </>
            )}
          </div>
        ),
      }}

      filters={{
        colsTemplate: FILTER_GRID_TEMPLATE,
        accent: true,
        children: (
          <>
            {/* Empresa */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] font-medium text-gray-600">Empresa</label>
              <Select
                value={filters.companyId}
                onValueChange={(v) => setFilters(prev => ({ ...prev, companyId: v as any }))}
              >
                <SelectTrigger className="h-8 w-full px-2">
                  <SelectValue placeholder="Selecionar empresa" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="all">Todas</SelectItem>
                  {companyOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data (duas datas lado a lado) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] font-medium text-gray-600">Data início</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="h-8 px-2"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] font-medium text-gray-600">Data fim</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="h-8 px-2"
                />
              </div>
            </div>

            {/* Tamanho (placeholder para alinhar) */}
            <div />

            {/* Tipo */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] font-medium text-gray-600">Tipo</label>
              <Select
                value={filters.type}
                onValueChange={(v) => setFilters(prev => ({ ...prev, type: v as 'all' | 'AUTOMATIC' | 'MANUAL' }))}
              >
                <SelectTrigger className="h-8 w-full px-2">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="AUTOMATIC">AUTOMATIC</SelectItem>
                  <SelectItem value="MANUAL">MANUAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ações (placeholder) */}
            <div />
          </>
        ),
      }}

      toolbar={
        <div className="w-full flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          {/* Contagens */}
          <div className="text-sm text-muted-foreground">
            A mostrar <b>{total === 0 ? 0 : startIdx + 1}</b>–<b>{endIdx}</b> de <b>{total}</b>
          </div>

          {/* Page size + paginação */}
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / página
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)}>
                «
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </Button>

              <span className="px-2 text-sm">
                Página <b>{page}</b> / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                »
              </Button>
            </div>
          </div>
        </div>
      }

      table={{
        columns,
        data: isLoading ? [] : pageItems,
        rowKey: (row) => row.id,
        sortBy,
        sortOrder,
        onSort: handleSort,
        emptyState: tableEmptyState,
        stickyHeader: true,
        tableClassName: 'text-sm',
      }}
    />
  );
};

export default BackupsPage;