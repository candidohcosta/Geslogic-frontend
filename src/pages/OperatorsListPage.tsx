// frontend/src/pages/OperatorsListPage.tsx
// ❗️ Alteração principal: remover <Page> externo e devolver diretamente <ListPageTemplate />

import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOperators,
  fetchCompanies,
  deleteOperator,
  toggleOperatorActive,
  fetchServices,
} from '../services/api';
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

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Users, PlusCircle, MoreVertical, Edit, Trash2, Mail, ToggleLeft, ToggleRight } from 'lucide-react';

// --- Tipos de dados ---
interface OperatorData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  operatorDetails?: {
    allowedServiceIds: string[];
    company?: { id: string; name: string } | null;
  } | null;
}

// --- Larguras de colunas ---
const COLS = {
  name: 28,
  email: 28,
  services: 22,
  status: 10,
  actions: 12,
} as const;

const FILTER_GRID_TEMPLATE = `
  ${COLS.name}% ${COLS.email}% ${COLS.status}% ${COLS.actions}%
` as const;

type SortBy = 'name' | 'email' | 'status' | 'company';

const OperatorsListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const selectedCompanyId = useMemo(() => {
    if (user?.role === UserRole.PLATFORM_ADMIN) return companyIdFromUrl;
    return user?.company?.id;
  }, [user, companyIdFromUrl]);

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: operators = [], isLoading: isLoadingOperators } = useQuery<OperatorData[], Error>({
    queryKey: ['operators', selectedCompanyId],
    queryFn: () => fetchOperators(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['companyServices', selectedCompanyId],
    queryFn: () => fetchServices(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const getServiceNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return ['Todos'];
    return ids
      .map(id => (services as any[]).find((s: { id: string }) => s.id === id)?.name || '(desconhecido)')
      .filter(Boolean);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteOperator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators', selectedCompanyId] });
      setOperatorToDelete(null);
      setDeleteConfirmChecked(false);
      setDeleteEmailTyped('');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (payload: { id: string; isActive: boolean }) => {
      return toggleOperatorActive(payload.id, payload.isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators', selectedCompanyId] });
    },
  });

  // Estado UI (eliminar com dupla confirmação)
  const [operatorToDelete, setOperatorToDelete] = useState<OperatorData | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteEmailTyped, setDeleteEmailTyped] = useState('');

  // Ver Email
  const [viewEmailOperator, setViewEmailOperator] = useState<OperatorData | null>(null);

  // Filtros + ordenação
  const [filters, setFilters] = useState<{
    name: string;
    email: string;
    status: 'all' | 'active' | 'inactive';
  }>({ name: '', email: '', status: 'all' });

  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const filteredAndSorted = useMemo(() => {
    const base = operators
      .filter(o => {
        const name = `${o.firstName} ${o.lastName}`.toLowerCase();
        return filters.name ? name.includes(filters.name.toLowerCase()) : true;
      })
      .filter(o => (filters.email ? (o.email || '').toLowerCase().includes(filters.email.toLowerCase()) : true))
      .filter(o => {
        if (filters.status === 'all') return true;
        return filters.status === 'active' ? o.isActive : !o.isActive;
      });

    const arr = [...base];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case 'email':
          cmp = (a.email || '').localeCompare(b.email || '');
          break;
        case 'status':
          cmp = a.isActive === b.isActive ? 0 : a.isActive ? 1 : -1;
          break;
        default:
          cmp = 0;
      }
      return sortOrder === 'ASC' ? cmp : -cmp;
    });
    return arr;
  }, [operators, filters, sortBy, sortOrder]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  // Context Menu
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 260, height: 240 } });
  const [selectedOperator, setSelectedOperator] = useState<OperatorData | null>(null);

  const openContext = (e: React.MouseEvent, op: OperatorData) => {
    e.preventDefault();
    setSelectedOperator(op);
    openAt(e.pageX, e.pageY);
  };

  const columns: Column<OperatorData>[] = [
    {
      key: 'name', header: 'Nome', widthPct: COLS.name, sortable: true,
      render: (o) => `${o.firstName} ${o.lastName}`,
    },
    {
      key: 'email', header: 'Email', widthPct: COLS.email, sortable: true,
      render: (o) => <span title={o.email}>{o.email}</span>,
    },
    {
      key: 'services',
      header: 'Serviços',
      widthPct: 22,
      sortable: false,
      render: (o) => {
        const names = getServiceNames(o.operatorDetails?.allowedServiceIds || []);
        return (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {names.map((n, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[11px] whitespace-nowrap"
              >
                {n}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: 'status', header: 'Estado', widthPct: COLS.status, sortable: true,
      render: (o) => (
        <span className={['px-2 py-1 rounded text-[11px] font-medium', o.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'].join(' ')}>
          {o.isActive ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'actions', header: <span className="sr-only">Ações</span>, widthPct: COLS.actions, align: 'right',
      render: (o) => (
        <div className="flex items-center justify-end gap-1">
          {/* Editar (desktop) */}
          <span className="hidden md:inline-flex">
            <Button asChild variant="ghost" size="icon" title="Editar Operador">
              <Link to={`/operators/edit/${o.id}`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </span>

          {/* Desativar/Ativar (desktop) */}
          <span className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="icon"
              title={o.isActive ? 'Desativar' : 'Ativar'}
              onClick={() => toggleActiveMutation.mutate({ id: o.id, isActive: !o.isActive })}
            >
              {o.isActive ? <ToggleLeft className="h-4 w-4 text-red-600" /> : <ToggleRight className="h-4 w-4 text-green-600" />}
            </Button>
          </span>

          {/* Eliminar (desktop) */}
          <span className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
              title="Apagar Operador"
              onClick={() => setOperatorToDelete(o)}
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
              setSelectedOperator(o);
              openAt(r.right + window.scrollX, r.top + window.scrollY);
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  const total = operators.length;
  const visiveis = filteredAndSorted.length;

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  const isLoading = isLoadingOperators || (user.role === UserRole.PLATFORM_ADMIN && isLoadingCompanies);

  return (
    <>
      <ListPageTemplate<OperatorData>
        header={{
          icon: Users,
          title: 'Operadores',
          subtitle: 'Utilizadores com permissão para operar os balcões.',
          actions: (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full max-w-[44rem]">
              <div className="flex-1 min-w-[20rem]">
                {user.role === UserRole.PLATFORM_ADMIN && (
                  <CompanySelect
                    mode="navigate"
                    companies={companies}
                    value={selectedCompanyId || ''}
                    buildHref={(id) => `/operators/company/${id}`}
                    triggerWidthClass="w-full"
                  />
                )}
              </div>

              {selectedCompanyId && (
                <Button asChild className="shrink-0">
                  <Link to={`/operators/new?companyId=${selectedCompanyId}`}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Criar Operador
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
                <label className="text-[11px] font-medium text-gray-600">Email</label>
                <Input
                  placeholder="Filtrar por email…"
                  value={filters.email}
                  onChange={(e) => setFilters(s => ({ ...s, email: e.target.value }))}
                  className="h-8 px-2"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Estado</label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters(s => ({ ...s, status: v as any }))}
                >
                  <SelectTrigger className="h-8 w-full px-2">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
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
              <strong>{visiveis}</strong> de {total} operadores
            </span>
            <div className="flex items-center gap-2" />
          </>
        }

        table={{
          columns,
          data: filteredAndSorted,
          rowKey: (o) => o.id,
          sortBy,
          sortOrder,
          onSort: (k) => {
            const key = k as SortBy;
            if (['name', 'email', 'status', 'company'].includes(key)) handleSort(key);
          },
          onRowContextMenu: (e, row) => openContext(e as any, row as OperatorData),
          stickyHeader: true,
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              {!selectedCompanyId
                ? 'Selecione uma empresa para visualizar os operadores.'
                : 'Não foram encontrados operadores com os filtros aplicados.'}
            </div>
          ),
          rowClassName: (row) => row.isActive ? '' : 'bg-amber-50/40',
        }}
      />

      {/* ===== Context Menu ===== */}
      {cm.open && selectedOperator && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          <ContextMenuItem onClick={() => { navigate(`/operators/edit/${selectedOperator.id}`); closeMenu(); }}>
            Editar
          </ContextMenuItem>

          <ContextMenuItem onClick={() => {
            toggleActiveMutation.mutate({ id: selectedOperator.id, isActive: !selectedOperator.isActive });
            closeMenu();
          }}>
            {selectedOperator.isActive ? 'Desativar' : 'Ativar'}
          </ContextMenuItem>

          <div className="my-1 h-px bg-gray-800/60" />

          <ContextMenuItem onClick={() => { setViewEmailOperator(selectedOperator); closeMenu(); }}>
            <span className="inline-flex items-center gap-2"><Mail className="w-4 h-4" /> Ver email</span>
          </ContextMenuItem>

          <ContextMenuItem danger onClick={() => { setOperatorToDelete(selectedOperator); closeMenu(); }}>
            <span className="inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Eliminar</span>
          </ContextMenuItem>
        </ContextMenu>
      )}

      {/* ===== Modal: Ver email ===== */}
      {viewEmailOperator && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md overflow-visible">
            <CardHeader className="px-6 py-4">
              <CardTitle>Email do Operador</CardTitle>
              <CardDescription>Endereço de email do operador selecionado.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pt-4 pb-6">
              <div className="text-sm">{viewEmailOperator.email || '—'}</div>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button onClick={() => setViewEmailOperator(null)}>Fechar</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ===== Modal: Eliminar com dupla confirmação ===== */}
      {operatorToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md overflow-visible">
            <CardHeader className="px-6 py-4">
              <CardTitle>Eliminar Operador</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar o operador "{operatorToDelete.firstName} {operatorToDelete.lastName}"?
                Esta ação é <strong>irreversível</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pt-4 pb-6 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="confirmDeleteOperator"
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  checked={deleteConfirmChecked}
                  onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                />
                <label htmlFor="confirmDeleteOperator">Compreendo e desejo continuar.</label>
              </div>

              <div className="space-y-1">
                <label className="text-sm">Escreva o email do operador para confirmar</label>
                <Input
                  placeholder={operatorToDelete.email}
                  value={deleteEmailTyped}
                  onChange={(e) => setDeleteEmailTyped(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setOperatorToDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(operatorToDelete.id)}
                disabled={
                  !deleteConfirmChecked ||
                  deleteEmailTyped.trim().toLowerCase() !== (operatorToDelete.email || '').toLowerCase() ||
                  deleteMutation.isPending
                }
              >
                {deleteMutation.isPending ? 'A eliminar…' : 'Eliminar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};

export default OperatorsListPage;