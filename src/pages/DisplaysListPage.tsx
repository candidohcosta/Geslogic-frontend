// frontend/src/pages/DisplaysListPage.tsx

import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDisplays,
  fetchCompanies,
  deleteDisplay,
  fetchAggregatedUptimeDetailed
} from '../services/api';
import { UserRole } from '../types/user';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/Select';

import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import { CompanySelect } from '../components/common/CompanySelect';
import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { PlusCircle, Edit, Trash2, Tv, MoreVertical } from 'lucide-react';

interface SimpleCounterData { id: string; name: string; }

interface DisplayData {
  id: string;
  name: string;
  deviceSecret: string;
  layoutFormat: string;
  isActive: boolean;
  counters: SimpleCounterData[];
  isOnline?: boolean;
}

interface AggregatedUptimeDevice {
  id: string;
  type: 'KIOSK' | 'DISPLAY';
  totalUptimePercent: string;
  hourlyUptime: any[];
}

interface DisplayWithUptime extends DisplayData {
  totalUptimePercent: string;
  hourlyUptime: any[];
}

// Larguras
const COLS = {
  name: 28,
  counters: 34,
  uptime: 14,
  status: 12,
  actions: 12,
} as const;

const FILTER_GRID_TEMPLATE = `
  40% 40% 20%
` as const;

type SortBy = 'name' | 'uptime' | 'status';

const DisplaysListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const [uptimeDays, setUptimeDays] = useState('7');
  const [displayToDelete, setDisplayToDelete] = useState<DisplayData | null>(null);

  const selectedCompanyId =
    user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: displays = [], isLoading, error: displaysError } = useQuery<DisplayData[], Error>({
    queryKey: ['displays', selectedCompanyId],
    queryFn: () => fetchDisplays(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: uptimeData = [] } = useQuery<AggregatedUptimeDevice[]>({
    queryKey: ['devicesUptimeDetailed', selectedCompanyId, uptimeDays],
    queryFn: () => fetchAggregatedUptimeDetailed(selectedCompanyId!, Number(uptimeDays)),
    enabled: !!selectedCompanyId,
  });

  const displaysWithUptime = useMemo(() => {
    const uptimeMap = new Map(
      (uptimeData || [])
        .filter((d) => d.type === 'DISPLAY')
        .map((d) => [d.id, d])
    );

    return displays.map((display) => {
      const info = uptimeMap.get(display.id);
      return {
        ...display,
        totalUptimePercent: info?.totalUptimePercent || '0.00%',
        hourlyUptime: info?.hourlyUptime || []
      } as DisplayWithUptime;
    });
  }, [displays, uptimeData]);

  const { mutate: deleteDisplayMutate, isPending: isDeleting, error: deleteError } = useMutation({
    mutationFn: deleteDisplay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['displays', selectedCompanyId] });
      setDisplayToDelete(null);
    },
  });

  // Filtros/ordenação
  const [filters, setFilters] = useState<{ name: string; counter: string }>({ name: '', counter: '' });
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const filteredAndSorted = useMemo(() => {
    const base = displaysWithUptime
      .filter(d => (filters.name ? d.name.toLowerCase().includes(filters.name.toLowerCase()) : true))
      .filter(d => (filters.counter
        ? (d.counters?.map(c => c.name.toLowerCase()).join(' ') || '').includes(filters.counter.toLowerCase())
        : true));

    const arr = [...base];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'uptime': {
          const an = parseFloat((a.totalUptimePercent || '0').replace('%', '')) || 0;
          const bn = parseFloat((b.totalUptimePercent || '0').replace('%', '')) || 0;
          cmp = an - bn;
          break;
        }
        case 'status':
          cmp = a.isOnline === b.isOnline ? 0 : a.isOnline ? 1 : -1;
          break;
      }
      return sortOrder === 'ASC' ? cmp : -cmp;
    });
    return arr;
  }, [displaysWithUptime, filters, sortBy, sortOrder]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  // Context Menu (mobile)
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 200, height: 120 } });
  const [selectedDisplay, setSelectedDisplay] = useState<DisplayData | null>(null);
  const openContext = (e: React.MouseEvent, d: DisplayData) => {
    e.preventDefault();
    setSelectedDisplay(d);
    openAt(e.pageX, e.pageY);
  };

  const columns: Column<DisplayWithUptime>[] = [
    { key: 'name', header: 'Nome', widthPct: COLS.name, sortable: true, render: (d) => d.name },
    {
      key: 'counters', header: 'Balcões', widthPct: COLS.counters, sortable: false,
      render: (d) => (
        <div className="flex flex-wrap gap-1 max-w-[520px]">
          {(d.counters || []).length === 0 ? (
            <span className="text-sm text-muted-foreground">Nenhum</span>
          ) : (
            d.counters.map(c => (
              <span key={c.id} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[11px] whitespace-nowrap" title={c.name}>
                {c.name}
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'uptime', header: 'Uptime', widthPct: COLS.uptime, sortable: true,
      render: (d) => <span className="font-bold text-green-700">{d.totalUptimePercent}</span>,
    },
    {
      key: 'status', header: 'Status', widthPct: COLS.status, sortable: true, align: 'center',
      render: (d) => (
        <div className="flex items-center justify-center">
          <div className={`w-3 h-3 rounded-full ${d.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      ),
    },
    {
      key: 'actions', header: <span className="sr-only">Ações</span>, widthPct: COLS.actions, align: 'right',
      render: (d) => (
        <div className="flex justify-end items-center gap-1">
          <span className="hidden md:inline-flex">
            <Button asChild variant="ghost" size="icon" title="Editar Display">
              <Link to={`/displays/edit/${d.id}`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </span>

          <span className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
              title="Apagar Display"
              onClick={() => setDisplayToDelete(d)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </span>

          {/* Mobile: ⋮ abre context menu */}
          <button
            className="md:hidden inline-flex p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Mais ações"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setSelectedDisplay(d);
              openAt(r.right + window.scrollX, r.top + window.scrollY);
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  const total = displaysWithUptime.length;
  const visiveis = filteredAndSorted.length;

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <>
      <ListPageTemplate<DisplayWithUptime>
        header={{
          icon: Tv,
          title: 'Displays Públicos',
          subtitle: 'Gira os ecrãs de chamada de senhas.',
          actions: (
            <div className="flex items-center gap-3 w-[42rem] max-w-full">
              <div className="flex-1 min-w-[26rem]">
                {user.role === UserRole.PLATFORM_ADMIN && (
                  <CompanySelect
                    mode="navigate"
                    companies={companies}
                    value={selectedCompanyId || ''}
                    buildHref={(id) => `/displays/company/${id}`}
                    triggerWidthClass="w-full"
                  />
                )}
              </div>

              {selectedCompanyId && (
                <Button asChild className="shrink-0">
                  <Link to={`/displays/new?companyId=${selectedCompanyId}`}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                  </Link>
                </Button>
              )}
            </div>
          ),
        }}

        filters={{
          colsTemplate: FILTER_GRID_TEMPLATE,
          children: (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Nome</label>
                <Input
                  placeholder="Filtrar por nome…"
                  value={filters.name}
                  onChange={(e) => setFilters(s => ({ ...s, name: e.target.value }))}
                  className="h-8 px-2"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Balcão</label>
                <Input
                  placeholder="Filtrar por balcão associado…"
                  value={filters.counter}
                  onChange={(e) => setFilters(s => ({ ...s, counter: e.target.value }))}
                  className="h-8 px-2"
                />
              </div>

              {/* Uptime selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Uptime (dias)</label>
                <Select value={uptimeDays} onValueChange={setUptimeDays}>
                  <SelectTrigger className="h-8 w-full px-2 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1D</SelectItem>
                    <SelectItem value="7">7D</SelectItem>
                    <SelectItem value="30">30D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ),
        }}

        toolbar={
          <>
            <span>
              <strong>{visiveis}</strong> de {total} displays
            </span>
            <div className="flex items-center gap-2" />
          </>
        }

        table={{
          columns,
          data: filteredAndSorted,
          rowKey: (d) => d.id,
          sortBy,
          sortOrder,
          onSort: (k) => {
            const key = k as SortBy;
            if (['name', 'uptime', 'status'].includes(key)) handleSort(key);
          },
          onRowContextMenu: (e, row) => openContext(e as any, row as DisplayData),
          stickyHeader: true,
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              {selectedCompanyId
                ? 'Não foram encontrados displays com os filtros aplicados.'
                : 'Selecione uma empresa para visualizar os displays.'}
            </div>
          ),
        }}
      />

      {/* ===== Context Menu ===== */}
      {cm.open && selectedDisplay && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          <ContextMenuItem onClick={() => { navigate(`/displays/edit/${selectedDisplay.id}`); closeMenu(); }}>
            Editar
          </ContextMenuItem>
          <ContextMenuItem danger onClick={() => { setDisplayToDelete(selectedDisplay); closeMenu(); }}>
            Eliminar
          </ContextMenuItem>
        </ContextMenu>
      )}

      {/* ===== Modal: Eliminar ===== */}
      {displayToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="px-6 py-4">
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar o display "{displayToDelete.name}"?
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 pt-4 pb-6">
              <p className="text-sm text-red-600">
                Esta ação não pode ser revertida.
              </p>
              {deleteError && (
                <p className="text-sm text-red-600 mt-2">
                  Erro: {(deleteError as Error).message}
                </p>
              )}
            </CardContent>

            <CardFooter className="px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDisplayToDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteDisplayMutate(displayToDelete.id)}
                disabled={isDeleting}
              >
                {isDeleting ? 'A Apagar...' : 'Apagar Display'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};

export default DisplaysListPage;
