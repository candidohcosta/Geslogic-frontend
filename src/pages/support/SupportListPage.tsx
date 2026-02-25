// src/pages/support/SupportListPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchSupportTickets,
  markSupportSeen,
  fetchCompanies,
} from '../../services/api';

import type { SupportTicket } from '../../types/support';
import {
  SupportTicketStatus,
  SupportTicketPriority,
} from '../../types/support';

import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';

import { ListPageTemplate } from '../../components/templates/ListPageTemplate';
import type { Column } from '../../components/templates/types';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MessageSquare, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../../lib/support-utils';
import { createSupportChannel } from '../../lib/sockets/support';

type SupportTicketWithUnread = SupportTicket & { unreadCount?: number };

function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const PAGE_SIZE = 5;

const SupportListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filtros
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [onlyUnread, setOnlyUnread] = useState(false);

  // Ordenação (modo binário ASC ⇄ DESC)
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Pesquisa e paginação
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);

  // Empresas (para filtro de Platform Admin)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>(
    [],
  );

  // Marca “módulo visto” ao entrar
  useEffect(() => {
    markSupportSeen().catch(() => {});
  }, []);

  // Carregar empresas (apenas Plataforma)
  useEffect(() => {
    if (user?.role !== UserRole.PLATFORM_ADMIN) return;

    fetchCompanies()
      .then((list) => setCompanies(list ?? []))
      .catch(() => setCompanies([]));
  }, [user?.role]);

  // Query (lista)
  const { data: response, isLoading, error } = useQuery<{
    data: SupportTicketWithUnread[];
    meta: { total: number; page: number; lastPage: number };
  }>({
    queryKey: [
      'supportTickets',
      statusFilter,
      priorityFilter,
      companyFilter,
      onlyUnread, // (apenas afeta a vista, não vai à API)
      sortBy,     // (ordenamos no frontend)
      sortOrder,  // (ordenamos no frontend)
      page,
      debouncedSearch,
      PAGE_SIZE,
    ],
    queryFn: () =>
      fetchSupportTickets({
        status:
          statusFilter !== 'ALL' && statusFilter !== 'ALL_EXCEPT_CLOSED'
            ? (statusFilter as SupportTicketStatus)
            : undefined,

        excludeClosed:
          statusFilter === 'ALL_EXCEPT_CLOSED' ? true : undefined,

        priority:
          priorityFilter !== 'ALL'
            ? (priorityFilter as SupportTicketPriority)
            : undefined,

        companyId:
          user?.role === UserRole.PLATFORM_ADMIN &&
          companyFilter !== 'ALL'
            ? companyFilter
            : undefined,

        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
      }),
  });

  const tickets = response?.data ?? [];
  const meta = response?.meta ?? { total: 0, page: 1, lastPage: 1 };

  // Ordenação local no frontend (binária: ASC ⇄ DESC)
  const sortedTickets = useMemo(() => {
    if (!sortBy) return tickets;

    const getVal = (obj: any, key: string) => {
      if (key === 'createdAt') return new Date(obj.createdAt).getTime();
      return obj[key];
    };

    return [...tickets].sort((a, b) => {
      const v1 = getVal(a, sortBy);
      const v2 = getVal(b, sortBy);

      // Normalizar strings
      const n1 = typeof v1 === 'string' ? v1.toLowerCase() : v1;
      const n2 = typeof v2 === 'string' ? v2.toLowerCase() : v2;

      if (n1 < n2) return sortOrder === 'ASC' ? -1 : 1;
      if (n1 > n2) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });
  }, [tickets, sortBy, sortOrder]);

  // “Só não lidos”
  const visibleTickets = useMemo(() => {
    if (!onlyUnread) return sortedTickets;
    return sortedTickets.filter(
      (t: SupportTicketWithUnread) => t.unreadCount && t.unreadCount > 0,
    );
  }, [sortedTickets, onlyUnread]);

  // Socket para refresh da lista
  useEffect(() => {
    if (!user) return;

    const { socket, joinList, leaveList } = createSupportChannel();

    const onConnect = () => joinList(); // <- sem argumentos
    const onRefresh = () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'supportTickets',
      });
    };

    socket.on('connect', onConnect);
    socket.on('refreshList', onRefresh);

    return () => {
      try { leaveList(); } catch {}
      socket.off('connect', onConnect);
      socket.off('refreshList', onRefresh);
    };
  }, [user, queryClient]);

  // Handler de sort ao clicar na coluna
  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(columnKey);
      setSortOrder('ASC');
    }
  };

  // Colunas
  const columns: Column<SupportTicketWithUnread>[] = [
    {
      key: 'sequentialId',
      header: 'ID',
      widthPct: 10,
      sortable: true,
      render: (t) => (
        <span className="font-mono text-gray-600">#{t.sequentialId}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Assunto',
      widthPct: 40,
      sortable: true,
      render: (t) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{t.subject}</span>
          {t.unreadCount && t.unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] px-1.5 h-4 min-w-[1rem]">
              {t.unreadCount}
            </span>
          )}
          {user?.role === UserRole.PLATFORM_ADMIN &&
            t.targetLevel === 'PLATFORM' && (
              <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                Plataforma
              </span>
            )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      widthPct: 15,
      sortable: true,
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: 'priority',
      header: 'Prioridade',
      widthPct: 12,
      sortable: true,
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'createdAt',
      header: 'Data',
      widthPct: 10,
      sortable: true,
      render: (t) => (
        <span className="text-sm text-gray-600">
          {new Date(t.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  // Header
  const header = {
    icon: MessageSquare,
    title: 'Central de Apoio',
    subtitle: 'Gestão de pedidos de suporte.',
    actions: (
      <Button onClick={() => navigate('/support/new')}>
        <Plus className="w-4 h-4 mr-2" /> Novo Pedido
      </Button>
    ),
  };

  // Filtros (Estado, Prioridade, Empresa, Só não lidos, Pesquisa)
  const filters = {
    colsTemplate: undefined,
    children: (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Pesquisa */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-gray-600">
            Pesquisar
          </label>
          <Input
            placeholder="Assunto ou ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2"
          />
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-gray-600">Estado</label>
          <select
            className="h-8 px-2 border rounded-md text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Todos</option>
            <option value="ALL_EXCEPT_CLOSED">Todos exceto fechados</option>
            <option value={SupportTicketStatus.OPEN}>Abertos</option>
            <option value={SupportTicketStatus.IN_PROGRESS}>Em Análise</option>
            <option value={SupportTicketStatus.WAITING_RESPONSE}>Aguarda resposta</option>
            <option value={SupportTicketStatus.RESOLVED}>Resolvidos</option>
            <option value={SupportTicketStatus.CLOSED}>Fechados</option>
          </select>
        </div>

        {/* Prioridade */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-gray-600">
            Prioridade
          </label>
          <select
            className="h-8 px-2 border rounded-md text-sm"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Todas</option>
            <option value={SupportTicketPriority.LOW}>Baixa</option>
            <option value={SupportTicketPriority.NORMAL}>Normal</option>
            <option value={SupportTicketPriority.HIGH}>Alta</option>
            <option value={SupportTicketPriority.CRITICAL}>Crítica</option>
          </select>
        </div>

        {/* Empresa (apenas Plataforma) */}
        {user?.role === UserRole.PLATFORM_ADMIN && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-600">Empresa</label>
            <select
              className="h-8 px-2 border rounded-md text-sm"
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Todas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Só Não Lidos */}
        <div className="flex items-end gap-2 mt-4">
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={() => setOnlyUnread(!onlyUnread)}
          />
          <label className="text-sm text-gray-700">Só não lidos</label>
        </div>
      </div>
    ),
  };

  // Toolbar / Paginação
  const toolbar = (
    <>
      <span>
        <strong>{visibleTickets.length}</strong> de {meta.total} resultados (pág.{' '}
        {meta.page}/{meta.lastPage})
      </span>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({
              predicate: (q) =>
                Array.isArray(q.queryKey) &&
                q.queryKey[0] === 'supportTickets',
            });
          }}
        >
          Atualizar
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
            disabled={page >= meta.lastPage || isLoading}
            title="Próxima"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );

  // Tabela
  const table = {
    columns,
    data: visibleTickets,
    rowKey: (t: SupportTicketWithUnread) => t.id,
    onSort: handleSort,
    sortBy,       // string | undefined
    sortOrder,    // 'ASC' | 'DESC'
    onRowClick: (t: SupportTicketWithUnread) => navigate(`/support/${t.id}`),
    stickyHeader: true,
    emptyState: (
      <div className="py-10 text-center text-sm text-gray-700">
        {isLoading
          ? 'A carregar pedidos de apoio…'
          : 'Não existem pedidos de apoio para os filtros atuais.'}
      </div>
    ),
  };

  if (error) {
    return (
      <ListPageTemplate<SupportTicketWithUnread>
        header={header}
        filters={filters}
        toolbar={<span className="text-red-600 text-sm">Erro ao carregar tickets.</span>}
        table={{ ...table, data: [] }}
      />
    );
  }

  return (
    <ListPageTemplate<SupportTicketWithUnread>
      header={header}
      filters={filters}
      toolbar={toolbar}
      table={table}
    />
  );
};

export default SupportListPage;