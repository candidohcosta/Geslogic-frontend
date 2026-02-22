// frontend/src/pages/CountersListPage.tsx (MIGRADA PARA O LISTPAGETEMPLATE PADRÃO)

import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCounters, fetchCompanies, deleteCounter } from '../services/api';
import { UserRole } from '../types/user';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import { CompanySelect } from '../components/common/CompanySelect';
import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

import { Computer, PlusCircle, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';

interface SimpleServiceData {
  id: string;
  name: string;
}

interface CounterData {
  id: string;
  name: string;
  locationDescription: string | null;
  services: SimpleServiceData[];
}

// --- Larguras de colunas ---
const COLS = {
  name: 30,
  services: 46,
  actions: 12,
} as const;

const FILTER_GRID_TEMPLATE = `
  40% 40% 20%
` as const;

type SortBy = 'name' | 'servicesCount';

const CountersListPage: React.FC = () => {
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

  // Balcões
  const { data: counters = [], isLoading, error } = useQuery<CounterData[], Error>({
    queryKey: ['counters', selectedCompanyId],
    queryFn: () => fetchCounters(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  // State: Eliminar
  const [counterToDelete, setCounterToDelete] = useState<CounterData | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteNameTyped, setDeleteNameTyped] = useState('');
  const { mutate: deleteCounterMutate, isPending: isDeleting, error: deleteError } = useMutation({
    mutationFn: deleteCounter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counters', selectedCompanyId] });
      setCounterToDelete(null);
      setDeleteConfirmChecked(false);
      setDeleteNameTyped('');
    },
  });

  // Filtros + ordenação
  const [filters, setFilters] = useState<{
    name: string;
    service: string;
  }>({ name: '', service: '' });

  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const filteredAndSorted = useMemo(() => {
    const base = counters
      .filter(c =>
        filters.name
          ? c.name.toLowerCase().includes(filters.name.toLowerCase())
          : true,
      )
      .filter(c =>
        filters.service
          ? (c.services?.map(s => s.name.toLowerCase()).join(' ') || '')
              .includes(filters.service.toLowerCase())
          : true,
      );

    const arr = [...base];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'servicesCount':
          cmp = (a.services?.length || 0) - (b.services?.length || 0);
          break;
      }
      return sortOrder === 'ASC' ? cmp : -cmp;
    });
    return arr;
  }, [counters, filters, sortBy, sortOrder]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  // Context Menu (mobile)
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 200, height: 120 } });
  const [selectedCounter, setSelectedCounter] = useState<CounterData | null>(null);
  const openContext = (e: React.MouseEvent, c: CounterData) => {
    e.preventDefault();
    setSelectedCounter(c);
    openAt(e.pageX, e.pageY);
  };

  // Colunas
  const columns: Column<CounterData>[] = [
    {
      key: 'name', header: 'Nome', widthPct: COLS.name, sortable: true,
      render: (c) => c.name,
    },
    {
      // ⚠️ Para a ordenação funcionar com o teu handleSort, a key precisa ser "servicesCount"
      key: 'servicesCount', header: 'Serviços Associados', widthPct: COLS.services, sortable: true,
      render: (c) => (
        <div className="flex flex-wrap gap-1 max-w-[560px]">
          {(c.services || []).length === 0 ? (
            <span className="text-sm text-muted-foreground">Nenhum</span>
          ) : (
            c.services.map((s) => (
              <span
                key={s.id}
                className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[11px] whitespace-nowrap"
                title={s.name}
              >
                {s.name}
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'actions', header: <span className="sr-only">Ações</span>, widthPct: COLS.actions, align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {/* Editar (desktop) */}
          <span className="hidden md:inline-flex">
            <Button asChild variant="ghost" size="icon" title="Editar Balcão">
              <Link to={`/counters/edit/${c.id}`}>
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
              title="Apagar Balcão"
              onClick={() => setCounterToDelete(c)}
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
              setSelectedCounter(c);
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
  const total = counters.length;
  const visiveis = filteredAndSorted.length;

  // Permissões
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <>
      <ListPageTemplate<CounterData>
        header={{
          icon: Computer,
          title: 'Balcões de Atendimento',
          subtitle: 'Gira os balcões de atendimento da sua empresa.',
          actions: (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full max-w-[44rem]">
              <div className="flex-1 min-w-[26rem]">
                {user.role === UserRole.PLATFORM_ADMIN && (
                  <CompanySelect
                    mode="navigate"
                    companies={companies}
                    value={selectedCompanyId || ''}
                    buildHref={(id) => `/counters/company/${id}`}
                    triggerWidthClass="w-full"
                  />
                )}
              </div>

              {selectedCompanyId && (
                <Button asChild className="shrink-0">
                  <Link to={`/counters/new?companyId=${selectedCompanyId}`}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Balcão
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

              <div />
            </>
          ),
        }}

        toolbar={
          <>
            <span>
              <strong>{visiveis}</strong> de {total} balcões
            </span>
            <div className="flex items-center gap-2" />
          </>
        }

        table={{
          columns,
          data: filteredAndSorted,
          rowKey: (c) => c.id,
          sortBy,
          sortOrder,
          onSort: (k) => {
            const key = k as SortBy;
            if (['name', 'servicesCount'].includes(key)) handleSort(key);
          },
          onRowContextMenu: (e, row) => openContext(e as any, row as CounterData),
          stickyHeader: true,
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              {selectedCompanyId
                ? 'Não foram encontrados balcões com os filtros aplicados.'
                : 'Selecione uma empresa para visualizar os balcões.'}
            </div>
          ),
        }}
      />

      {/* ===== Context Menu ===== */}
      {cm.open && selectedCounter && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          <ContextMenuItem onClick={() => { navigate(`/counters/edit/${selectedCounter.id}`); closeMenu(); }}>
            Editar
          </ContextMenuItem>
          <ContextMenuItem danger onClick={() => { setCounterToDelete(selectedCounter); closeMenu(); }}>
            <span className="inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Eliminar</span>
          </ContextMenuItem>
        </ContextMenu>
      )}

      {/* ===== Modal: Eliminar com dupla confirmação ===== */}
      {counterToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md overflow-visible">
            <CardHeader className="px-6 py-4">
              <CardTitle>Eliminar Balcão</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar o balcão "{counterToDelete.name}"?
                Esta ação é <strong>irreversível</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pt-4 pb-6 space-y-4">
              {deleteError && (
                <div className="p-2 text-sm text-red-800 bg-red-100 rounded">
                  {(deleteError as Error).message}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="confirmDeleteCounter"
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  checked={deleteConfirmChecked}
                  onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                />
                <label htmlFor="confirmDeleteCounter">Compreendo e desejo continuar.</label>
              </div>

              <div className="space-y-1">
                <label className="text-sm">Escreva o nome do balcão para confirmar</label>
                <Input
                  placeholder={counterToDelete.name}
                  value={deleteNameTyped}
                  onChange={(e) => setDeleteNameTyped(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setCounterToDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteCounterMutate(counterToDelete.id)}
                disabled={
                  !deleteConfirmChecked ||
                  deleteNameTyped.trim().toLowerCase() !== (counterToDelete.name || '').toLowerCase() ||
                  isDeleting
                }
              >
                {isDeleting ? 'A eliminar…' : 'Eliminar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};

export default CountersListPage;