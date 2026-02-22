// frontend/src/pages/UserTypesListPage.tsx
import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUserTypes,
  fetchCompanies,
  deleteUserType,
  toggleUserTypeActive,
  // Se já tiveres estes endpoints no teu api.ts, usa-os:
  // updateUserType, toggleUserTypeActive
} from '../services/api';
import { UserRole } from '../types/user';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

import { Page } from '../components/layout/Page';
import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import { CompanySelect } from '../components/common/CompanySelect';
import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';

import { Contact, PlusCircle, Users, Edit, Trash2, MoreVertical, ToggleLeft, ToggleRight } from 'lucide-react';

// Tipos (adapta se já existirem globalmente)
interface UserTypeData {
  id: string;
  name: string;
  isActive?: boolean;
  company?: { id: string; name: string } | null;
  userCount?: number;
}

// Larguras (com Empresa para Platform Admin)
const COLS = {
  name: 50,
  company: 20,
  actions: 30,
} as const;

const FILTER_GRID_TEMPLATE = `
  ${COLS.name}% ${COLS.actions}%
` as const;

type SortBy = 'name' | 'status';

const UserTypesListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const selectedCompanyId =
    user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;

  // Empresas
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // Tipos de utente (sempre filtrados pela empresa)
  const { data: userTypes = [], isLoading, error } = useQuery<UserTypeData[], Error>({
    queryKey: ['userTypes', selectedCompanyId],
    queryFn: () => fetchUserTypes(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteUserType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes', selectedCompanyId] });
      setToDelete(null);
      setDeleteConfirmChecked(false);
      setDeleteNameTyped('');
    },
  });

  // ⚠️ Se já tiveres updateUserType/toggleUserTypeActive no services/api, usa-os aqui.
  const toggleActiveMutation = useMutation({
    mutationFn: async (payload: { id: string; isActive: boolean }) => {
//      const { updateUserType } = await import('../services/api');
      return toggleUserTypeActive(payload.id, payload.isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes', selectedCompanyId] });
    },
  });

  // Estado UI (eliminar com dupla confirmação)
  const [toDelete, setToDelete] = useState<UserTypeData | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteNameTyped, setDeleteNameTyped] = useState('');

  // Filtro + ordenação
  const [filters, setFilters] = useState<{ name: string }>({ name: '' });
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const filteredAndSorted = useMemo(() => {
    const base = userTypes.filter(t => {
      return filters.name ? t.name.toLowerCase().includes(filters.name.toLowerCase()) : true;
    });

    const arr = [...base];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'status':
          cmp = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
        default:
          cmp = 0;
      }
      return sortOrder === 'ASC' ? cmp : -cmp;
    });
    return arr;
  }, [userTypes, filters, sortBy, sortOrder]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else { setSortBy(column); setSortOrder('ASC'); }
  };

  // Context Menu
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 240, height: 200 } });
  const [selectedType, setSelectedType] = useState<UserTypeData | null>(null);

  const openContext = (e: React.MouseEvent, item: UserTypeData) => {
    e.preventDefault();
    setSelectedType(item);
    openAt(e.pageX, e.pageY);
  };

  // Colunas (Empresa só Platform Admin)
  const columns: Column<UserTypeData>[] = [
    {
      key: 'name', header: 'Nome do Tipo de Utente', widthPct: user?.role === UserRole.PLATFORM_ADMIN ? COLS.name : 70, sortable: true,
      render: (t) => t.name,
    },
    {
      key: "count",
      header: "Nº Utentes",
      widthPct: 20,
      sortable: false,
      render: (t) => t.userCount ?? 0,
    },
    {
      key: "status",
      header: "Estado",
      widthPct: 20,
      sortable: true,
      render: (t) => (
        <span className={[
          "px-2 py-1 rounded text-[11px] font-medium",
          t.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
        ].join(" ")}>
          {t.isActive ? "Ativo" : "Inativo"}
        </span>
      ),
    },
    {
      key: 'actions', header: <span className="sr-only">Ações</span>, widthPct: user?.role === UserRole.PLATFORM_ADMIN ? COLS.actions : 30, align: 'right',
      render: (t) => (
        <div className="flex justify-end items-center gap-1">
          {/* Gerir Utentes */}
          <span className="hidden md:inline-flex">
            <Button asChild variant="ghost" size="icon" title="Gerir Utentes">
              <Link to={`/user-data/by-type/${t.id}`}>
                <Users className="h-4 w-4" />
              </Link>
            </Button>
          </span>

          {/* Editar */}
          <span className="hidden md:inline-flex">
            <Button asChild variant="ghost" size="icon" title="Editar Tipo de Utente">
              <Link to={`/user-types/edit/${t.id}`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </span>

          {/* (Des)Ativar */}
          <span className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="icon"
              title={t.isActive ? 'Desativar' : 'Ativar'}
              onClick={() => {
                const current = !!t.isActive;
                toggleActiveMutation.mutate({ id: t.id, isActive: !current });
              }}
            >
              {t.isActive ? <ToggleLeft className="h-4 w-4 text-red-600" /> : <ToggleRight className="h-4 w-4 text-green-600" />}
            </Button>
          </span>

          {/* Eliminar com dupla confirmação */}
          <span className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
              title="Apagar Tipo de Utente"
              onClick={() => setToDelete(t)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </span>

          {/* Mobile: ⋮ */}
          <button
            className="md:hidden inline-flex p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Mais ações"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setSelectedType(t);
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
  const total = userTypes.length;
  const visiveis = filteredAndSorted.length;

  // Permissões
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  const isPageLoading = isLoading || (user.role === UserRole.PLATFORM_ADMIN && isLoadingCompanies);

  return (
    <>
      <ListPageTemplate<UserTypeData>
        header={{
          icon: Contact,
          title: 'Tipos de Utente',
          subtitle: 'Gira os "moldes" de utentes para a sua empresa.',
          actions: (
            <div className="flex items-center gap-3 w-[42rem] max-w-full">
              <div className="flex-1 min-w-[26rem]">
                {user.role === UserRole.PLATFORM_ADMIN && (
                  <CompanySelect
                    mode="navigate"
                    companies={companies}
                    value={selectedCompanyId || ''}
                    buildHref={(id) => `/user-types/company/${id}`}
                    triggerWidthClass="w-full"
                  />
                )}
              </div>

              {selectedCompanyId && (
                <Button asChild className="shrink-0">
                  <Link to={`/user-types/new?companyId=${selectedCompanyId}`}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Tipo
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
                  onChange={(e) => setFilters({ name: e.target.value })}
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
              <strong>{visiveis}</strong> de {total} tipos
            </span>
            <div className="flex items-center gap-2" />
          </>
        }

        table={{
          columns,
          data: filteredAndSorted,
          rowKey: (t) => t.id,
          sortBy,
          sortOrder,
          onSort: (k) => {
            const key = k as SortBy;
            if (['name', 'status'].includes(key)) handleSort(key);
          },
          onRowContextMenu: (e, row) => openContext(e as any, row as UserTypeData),
          stickyHeader: true,
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              Não foram encontrados tipos com os filtros aplicados.
            </div>
          ),
        }}
      />

      {/* ===== Context Menu ===== */}
      {cm.open && selectedType && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          <ContextMenuItem onClick={() => { navigate(`/user-data/by-type/${selectedType.id}`); closeMenu(); }}>
            Gerir Utentes
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { navigate(`/user-types/edit/${selectedType.id}`); closeMenu(); }}>
            Editar
          </ContextMenuItem>
          <ContextMenuItem onClick={() => {
            const current = !!selectedType.isActive;
            toggleActiveMutation.mutate({ id: selectedType.id, isActive: !current });
            closeMenu();
          }}>
            {selectedType.isActive ? 'Desativar' : 'Ativar'}
          </ContextMenuItem>
          <ContextMenuItem danger onClick={() => { setToDelete(selectedType); closeMenu(); }}>
            <span className="inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Eliminar</span>
          </ContextMenuItem>
        </ContextMenu>
      )}

      {/* ===== Modal: Eliminar com dupla confirmação ===== */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md overflow-visible">
            <CardHeader className="px-6 py-4">
              <CardTitle>Eliminar Tipo de Utente</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar o tipo de utente "{toDelete.name}"?
                Esta ação é <strong>irreversível</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pt-4 pb-6 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="confirmDeleteType"
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  checked={deleteConfirmChecked}
                  onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                />
                <label htmlFor="confirmDeleteType">Compreendo e desejo continuar.</label>
              </div>

              <div className="space-y-1">
                <label className="text-sm">Escreva o nome do tipo para confirmar</label>
                <Input
                  placeholder={toDelete.name}
                  value={deleteNameTyped}
                  onChange={(e) => setDeleteNameTyped(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setToDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(toDelete.id)}
                disabled={
                  !deleteConfirmChecked ||
                  deleteNameTyped.trim().toLowerCase() !== (toDelete.name || '').toLowerCase() ||
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

export default UserTypesListPage;