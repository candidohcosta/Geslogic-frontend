// frontend/src/pages/ServicesListPage.tsx (MIGRADA PARA O LISTPAGETEMPLATE PADRÃO)

import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchServices, fetchCompanies, deleteService } from '../services/api';
import { UserRole } from '../types/user';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';

import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import { CompanySelect } from '../components/common/CompanySelect';
import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

import { Blocks, PlusCircle, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';

interface ServiceData {
  id: string;
  name: string;
  ticketPrefix: string;
  maxTicketsPerDay: number | null;
  isIssuingSuspended: boolean;
}

// --- Larguras de colunas ---
const COLS = {
  name: 32,
  prefix: 16,
  limit: 18,
  suspended: 12,
  actions: 12,
} as const;

const FILTER_GRID_TEMPLATE = `
  40% 20% 40%
` as const;

type SortBy = 'name' | 'prefix' | 'limit' | 'suspended';

const ServicesListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const selectedCompanyId =
    user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;

  // Empresas (só quando PLATFORM_ADMIN)
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // Serviços
  const { data: services = [], isLoading, error } = useQuery<ServiceData[], Error>({
    queryKey: ['services', selectedCompanyId],
    queryFn: () => fetchServices(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  // State: Eliminar
  const [serviceToDelete, setServiceToDelete] = useState<ServiceData | null>(null);
  const { mutate: deleteServiceMutate, isPending: isDeleting, error: deleteError } = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', selectedCompanyId] });
      setServiceToDelete(null);
    },
  });

  // Filtros + ordenação
  const [filters, setFilters] = useState<{
    name: string;
    suspended: 'all' | 'yes' | 'no';
  }>({ name: '', suspended: 'all' });

  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const filteredAndSorted = useMemo(() => {
    const base = services
      .filter(s =>
        filters.name
          ? s.name.toLowerCase().includes(filters.name.toLowerCase())
          : true,
      )
      .filter(s => {
        if (filters.suspended === 'all') return true;
        return filters.suspended === 'yes' ? s.isIssuingSuspended : !s.isIssuingSuspended;
      });

    const arr = [...base];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'prefix':
          cmp = a.ticketPrefix.localeCompare(b.ticketPrefix);
          break;
        case 'limit':
          // nulls vão para o fim
          if (a.maxTicketsPerDay == null && b.maxTicketsPerDay == null) cmp = 0;
          else if (a.maxTicketsPerDay == null) cmp = 1;
          else if (b.maxTicketsPerDay == null) cmp = -1;
          else cmp = a.maxTicketsPerDay - b.maxTicketsPerDay;
          break;
        case 'suspended':
          cmp = a.isIssuingSuspended === b.isIssuingSuspended ? 0 : a.isIssuingSuspended ? 1 : -1;
          break;
      }
      return sortOrder === 'ASC' ? cmp : -cmp;
    });
    return arr;
  }, [services, filters, sortBy, sortOrder]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  // Context Menu (mobile)
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 220, height: 160 } });
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
  const openContext = (e: React.MouseEvent, s: ServiceData) => {
    e.preventDefault();
    setSelectedService(s);
    openAt(e.pageX, e.pageY);
  };

  // Colunas
  const columns: Column<ServiceData>[] = [
    {
      key: 'name', header: 'Nome', widthPct: COLS.name, sortable: true,
      render: (s) => s.name,
    },
    {
      key: 'ticketPrefix', header: 'Prefixo', widthPct: COLS.prefix, sortable: true,
      render: (s) => s.ticketPrefix,
    },
    {
      key: 'maxTicketsPerDay', header: 'Limite Diário', widthPct: COLS.limit, sortable: true,
      render: (s) => s.maxTicketsPerDay ?? 'N/A',
    },
    {
      key: 'isIssuingSuspended', header: 'Suspenso', widthPct: COLS.suspended, sortable: true,
      render: (s) => (
        <span
          className={[
            'px-2 py-1 rounded text-[11px] font-medium',
            s.isIssuingSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800',
          ].join(' ')}
        >
          {s.isIssuingSuspended ? 'Sim' : 'Não'}
        </span>
      ),
    },
    {
      key: 'actions', header: <span className="sr-only">Ações</span>, widthPct: COLS.actions, align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          {/* Editar (desktop) */}
          <span className="hidden md:inline-flex">
            <Button asChild variant="ghost" size="icon" title="Editar Serviço">
              <Link to={`/services/edit/${s.id}`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </span>

          {/* Eliminar (desktop) */}
          <span className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
              title="Apagar Serviço"
              onClick={() => setServiceToDelete(s)}
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
              setSelectedService(s);
              openAt(r.right + window.scrollX, r.top + window.scrollY);
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  // Contagem p/ toolbar
  const total = services.length;
  const visiveis = filteredAndSorted.length;

  // Permissões
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <ListPageTemplate<ServiceData>
      header={{
        icon: Blocks,
        title: 'Serviços de Atendimento',
        subtitle: 'Gira os serviços oferecidos pela sua empresa.',
        actions: (
          <div className="flex items-center gap-3 w-[42rem] max-w-full">
            <div className="flex-1 min-w-[26rem]">
              {user.role === UserRole.PLATFORM_ADMIN && (
                <CompanySelect
                  mode="navigate"
                  companies={companies}
                  value={selectedCompanyId || ''}
                  buildHref={(id) => `/services/company/${id}`}
                  triggerWidthClass="w-full"
                />
              )}
            </div>

            {selectedCompanyId && (
              <Button asChild className="shrink-0">
                <Link to={`/services/new?companyId=${selectedCompanyId}`}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Serviço
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
              <label className="text-[11px] font-medium text-gray-600">Suspenso</label>
              <Select
                value={filters.suspended}
                onValueChange={(v) => setFilters(s => ({ ...s, suspended: v as any }))}
              >
                <SelectTrigger className="h-8 w-full px-2">
                  <SelectValue placeholder="Suspenso" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Sim</SelectItem>
                  <SelectItem value="no">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div />
          </>
        ),
      }}

      toolbar={
        <>
          <span>
            <strong>{visiveis}</strong> de {total} serviços
          </span>
          <div className="flex items-center gap-2" />
        </>
      }

      table={{
        columns,
        data: filteredAndSorted,
        rowKey: (s) => s.id,
        sortBy,
        sortOrder,
        onSort: (k) => {
          const key = k as SortBy;
          if (['name', 'prefix', 'limit', 'suspended'].includes(key)) handleSort(key);
        },
        onRowContextMenu: (e, row) => openContext(e as any, row as ServiceData),
        stickyHeader: true,
        emptyState: (
          <div className="py-10 text-center text-sm text-gray-700">
            {selectedCompanyId
              ? 'Não foram encontrados serviços com os filtros aplicados.'
              : 'Selecione uma empresa para visualizar os serviços.'}
          </div>
        ),
      }}
    />

    // ===== Context Menu =====
  );
};

export default ServicesListPage;