// frontend/src/pages/KiosksListPage.tsx

import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchKiosks,
  fetchCompanies,
  deleteKiosk,
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
import { PlusCircle, Edit, Trash2, Tablet, MoreVertical } from 'lucide-react';

interface SimpleServiceData { id: string; name: string; }

interface KioskData {
  id: string;
  name: string;
  deviceSecret: string;
  isActive: boolean;
  services: SimpleServiceData[];
  isOnline?: boolean;
}

interface AggregatedUptimeDevice {
  id: string;
  type: 'KIOSK' | 'DISPLAY';
  totalUptimePercent: string;
  hourlyUptime: any[];
}

interface KioskWithUptime extends KioskData {
  totalUptimePercent: string;
  hourlyUptime: any[];
}

// Larguras de coluna
const COLS = {
  name: 28,
  services: 34,
  uptime: 14,
  status: 12,
  actions: 12,
} as const;

const FILTER_GRID_TEMPLATE = `
  40% 40% 20%
` as const;

type SortBy = 'name' | 'uptime' | 'status';

const KiosksListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const [uptimeDays, setUptimeDays] = useState('7');
  const [kioskToDelete, setKioskToDelete] = useState<KioskData | null>(null);

  const selectedCompanyId =
    user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: kiosks = [], isLoading, error: kiosksError } = useQuery<KioskData[], Error>({
    queryKey: ['kiosks', selectedCompanyId],
    queryFn: () => fetchKiosks(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: uptimeData = [], isLoading: isLoadingUptime } =
    useQuery<AggregatedUptimeDevice[]>({
      queryKey: ['devicesUptimeDetailed', selectedCompanyId, uptimeDays],
      queryFn: () => fetchAggregatedUptimeDetailed(selectedCompanyId!, Number(uptimeDays)),
      enabled: !!selectedCompanyId,
    });

  const kiosksWithUptime = useMemo(() => {
    const uptimeMap = new Map((uptimeData || []).map((d: any) => [d.id, d]));
    return kiosks.map(kiosk => {
      const info = uptimeMap.get(kiosk.id);
      return {
        ...kiosk,
        totalUptimePercent: info?.totalUptimePercent || '0.00%',
        hourlyUptime: info?.hourlyUptime || []
      } as KioskWithUptime;
    });
  }, [kiosks, uptimeData]);

  const { mutate: deleteKioskMutate, isPending: isDeleting, error: deleteError } = useMutation({
    mutationFn: deleteKiosk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosks', selectedCompanyId] });
      setKioskToDelete(null);
    },
  });

  // Filtros e ordenação
  const [filters, setFilters] = useState<{ name: string; service: string }>({ name: '', service: '' });
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const filteredAndSorted = useMemo(() => {
    const base = kiosksWithUptime
      .filter(k => (filters.name ? k.name.toLowerCase().includes(filters.name.toLowerCase()) : true))
      .filter(k => (filters.service
        ? (k.services?.map(s => s.name.toLowerCase()).join(' ') || '').includes(filters.service.toLowerCase())
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
  }, [kiosksWithUptime, filters, sortBy, sortOrder]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  // Context Menu (mobile)
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 200, height: 120 } });
  const [selectedKiosk, setSelectedKiosk] = useState<KioskData | null>(null);
  const openContext = (e: React.MouseEvent, k: KioskData) => {
    e.preventDefault();
    setSelectedKiosk(k);
    openAt(e.pageX, e.pageY);
  };

  const columns: Column<KioskWithUptime>[] = [
    {
      key: 'name', header: 'Nome', widthPct: COLS.name, sortable: true,
      render: (k) => k.name,
    },
    {
      key: 'services', header: 'Serviços', widthPct: COLS.services, sortable: false,
      render: (k) => (
        <div className="flex flex-wrap gap-1 max-w-[520px]">
          {(k.services || []).length === 0 ? (
            <span className="text-sm text-muted-foreground">Nenhum</span>
          ) : (
            k.services.map(s => (
              <span key={s.id} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[11px] whitespace-nowrap" title={s.name}>
                {s.name}
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'uptime', header: 'Uptime', widthPct: COLS.uptime, sortable: true,
      render: (k) => <span className="font-bold text-green-700">{k.totalUptimePercent}</span>,
    },
    {
      key: 'status', header: 'Status', widthPct: COLS.status, sortable: true, align: 'center',
      render: (k) => (
        <div className="flex items-center justify-center">
          <div className={`w-3 h-3 rounded-full ${k.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      ),
    },
    {
      key: 'actions', header: <span className="sr-only">Ações</span>, widthPct: COLS.actions, align: 'right',
      render: (k) => (
        <div className="flex justify-end items-center gap-1">
          <span className="hidden md:inline-flex">
            <Button asChild variant="ghost" size="icon" title="Editar Quiosque">
              <Link to={`/kiosks/edit/${k.id}`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </span>

          <span className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
              title="Apagar Quiosque"
              onClick={() => setKioskToDelete(k)}
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
              setSelectedKiosk(k);
              openAt(r.right + window.scrollX, r.top + window.scrollY);
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  const total = kiosksWithUptime.length;
  const visiveis = filteredAndSorted.length;

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <>
      <ListPageTemplate<KioskWithUptime>
        header={{
          icon: Tablet,
          title: 'Quiosques',
          subtitle: 'Gira os dispositivos de emissão de senhas.',
          actions: (
            <div className="flex items-center gap-3 w-[42rem] max-w-full">
              <div className="flex-1 min-w-[26rem]">
                {user.role === UserRole.PLATFORM_ADMIN && (
                  <CompanySelect
                    mode="navigate"
                    companies={companies}
                    value={selectedCompanyId || ''}
                    buildHref={(id) => `/kiosks/company/${id}`}
                    triggerWidthClass="w-full"
                  />
                )}
              </div>

              {selectedCompanyId && (
                <Button asChild className="shrink-0">
                  <Link to={`/kiosks/new?companyId=${selectedCompanyId}`}>
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
                <label className="text-[11px] font-medium text-gray-600">Serviço</label>
                <Input
                  placeholder="Filtrar por serviço associado…"
                  value={filters.service}
                  onChange={(e) => setFilters(s => ({ ...s, service: e.target.value }))}
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
              <strong>{visiveis}</strong> de {total} quiosques
            </span>
            <div className="flex items-center gap-2" />
          </>
        }

        table={{
          columns,
          data: filteredAndSorted,
          rowKey: (k) => k.id,
          sortBy,
          sortOrder,
          onSort: (k) => {
            const key = k as SortBy;
            if (['name', 'uptime', 'status'].includes(key)) handleSort(key);
          },
          onRowContextMenu: (e, row) => openContext(e as any, row as KioskData),
          stickyHeader: true,
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              {selectedCompanyId
                ? 'Não foram encontrados quiosques com os filtros aplicados.'
                : 'Selecione uma empresa para visualizar os quiosques.'}
            </div>
          ),
        }}
      />

      {/* ===== Context Menu ===== */}
      {cm.open && selectedKiosk && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          <ContextMenuItem onClick={() => { navigate(`/kiosks/edit/${selectedKiosk.id}`); closeMenu(); }}>
            Editar
          </ContextMenuItem>
          <ContextMenuItem danger onClick={() => { setKioskToDelete(selectedKiosk); closeMenu(); }}>
            Eliminar
          </ContextMenuItem>
        </ContextMenu>
      )}

      {/* ===== Modal: Eliminar ===== */}
      {kioskToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="px-6 py-4">
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar o quiosque "{kioskToDelete.name}"?
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
              <Button variant="outline" onClick={() => setKioskToDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={() => deleteKioskMutate(kioskToDelete.id)}
              >
                {isDeleting ? 'A Apagar...' : 'Apagar Quiosque'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};

export default KiosksListPage;