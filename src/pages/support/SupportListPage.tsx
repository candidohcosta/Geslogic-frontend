// frontend/src/pages/support/SupportListPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchSupportTickets, markSupportSeen } from '../../services/api';
import type { SupportTicket } from '../../types/support';
import { SupportTicketStatus } from '../../types/support';
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

const FILTER_GRID_TEMPLATE = `
  60% 40%
` as const;

const PAGE_SIZE = 5;

const SupportListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);

  // Marca “módulo visto” ao entrar (apaga sino global no servidor)
  useEffect(() => {
    markSupportSeen().catch(() => {});
  }, []);

  // Query (lista paginada a 5)
  const { data: response, isLoading, error } = useQuery<{
    data: SupportTicketWithUnread[];
    meta: { total: number; page: number; lastPage: number };
  }>({
    queryKey: ['supportTickets', statusFilter, page, debouncedSearch, PAGE_SIZE],
    queryFn: () =>
      fetchSupportTickets({
        status: statusFilter !== 'ALL' ? (statusFilter as SupportTicketStatus) : undefined,
        page,
        limit: PAGE_SIZE, // 👈 força 5 por página
        search: debouncedSearch,
      }),
  });

  const tickets = useMemo<SupportTicketWithUnread[]>(
    () => response?.data || [],
    [response],
  );
  const meta = response?.meta || { total: 0, page: 1, lastPage: 1 };

  // Socket para refresh da lista
  useEffect(() => {
    if (!user) return;
    const { socket, joinList, leaveList } = createSupportChannel();

    const onConnect = () => {
      joinList(user.company?.id ?? null);
    };
    const onRefresh = () => {
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'supportTickets',
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

  // Colunas (ListPageTemplate)
  const columns: Column<SupportTicketWithUnread>[] = [
    {
      key: 'idCol',
      header: 'ID',
      widthPct: 10,
      render: (t) => <span className="font-mono text-gray-600">#{t.sequentialId}</span>,
    },
    {
      key: 'subject',
      header: 'Assunto',
      widthPct: 40,
      render: (t) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{t.subject}</span>
          {t.unreadCount && t.unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] px-1.5 h-4 min-w-[1rem]">
              {t.unreadCount}
            </span>
          )}
          {user?.role === UserRole.PLATFORM_ADMIN && t.targetLevel === 'PLATFORM' && (
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
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: 'priority',
      header: 'Prioridade',
      widthPct: 12,
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'creator',
      header: 'Criado Por',
      widthPct: 13,
      render: (t) => (
        <div className="text-sm text-gray-700">
          {t.creator.firstName} {t.creator.lastName}
          <div className="text-xs text-gray-400 truncate">{t.creator.email}</div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Data',
      widthPct: 10,
      render: (t) => (
        <span className="text-sm text-gray-600">
          {new Date(t.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

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

  const filters = {
    colsTemplate: FILTER_GRID_TEMPLATE,
    children: (
      <>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-gray-600">Pesquisar</label>
          <Input
            placeholder="Assunto ou ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-8 px-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-gray-600">Estado</label>
          <select
            className="h-8 px-2 border rounded-md text-sm"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">Todos</option>
            <option value={SupportTicketStatus.OPEN}>Abertos</option>
            <option value={SupportTicketStatus.IN_PROGRESS}>Em Análise</option>
            <option value={SupportTicketStatus.WAITING_RESPONSE}>Aguarda Resposta</option>
            <option value={SupportTicketStatus.RESOLVED}>Resolvidos</option>
            <option value={SupportTicketStatus.CLOSED}>Fechados</option>
          </select>
        </div>
      </>
    ),
  };

  const toolbar = (
    <>
      <span>
        <strong>{tickets.length}</strong> de {meta.total} resultados (pág. {meta.page}/{meta.lastPage})
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({
              predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'supportTickets',
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

  const table = {
    columns,
    data: tickets,
    rowKey: (t: SupportTicketWithUnread) => t.id,
    onRowClick: (t: SupportTicketWithUnread) => navigate(`/support/${t.id}`),
    stickyHeader: true,
    emptyState: (
      <div className="py-10 text-center text-sm text-gray-700">
        {isLoading ? 'A carregar pedidos de apoio…' : 'Não existem pedidos de apoio para os filtros atuais.'}
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