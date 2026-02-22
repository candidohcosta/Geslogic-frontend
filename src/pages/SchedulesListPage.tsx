// frontend/src/pages/SchedulesListPage.tsx

import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchSchedules,
  fetchCompanies,
  deleteSchedule,
  toggleScheduleActive,   // <--- IMPORTANTE
} from '../services/api';

import { UserRole } from '../types/user';
import { PriorityRuleType } from '../types/schedules';
import { translatePriorityRuleType } from '../lib/translations';

import { Page } from '../components/layout/Page';
import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import { CompanySelect } from '../components/common/CompanySelect';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';

import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

import {
  PlusCircle,
  Edit,
  Trash2,
  MoreVertical,
  OctagonMinus,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ---- Tipos ----
interface ScheduleData {
  id: string;
  description: string;
  userType: { id: string; name: string };
  ruleType: PriorityRuleType;
  isActive: boolean;
  timeSlots: any[];
}

// ---- Larguras ----
const COLS = {
  description: 26,
  userType: 18,
  ruleType: 18,
  slots: 12,
  status: 8,
  actions: 18,
} as const;

// ---- Grid filtros ----
const FILTER_GRID_TEMPLATE = `
  ${COLS.description}% ${COLS.userType}% ${COLS.ruleType}% ${COLS.status}% ${COLS.actions}%
` as const;

type SortBy = 'description' | 'userType' | 'ruleType' | 'slots' | 'status';

const SchedulesListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const selectedCompanyId = useMemo(() => {
    return user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;
  }, [user, companyIdFromUrl]);

  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleData | null>(null);

  const [filters, setFilters] = useState<{
    description: string;
    userType: string;
    ruleType: 'all' | PriorityRuleType;
    status: 'all' | 'active' | 'inactive';
  }>({
    description: '',
    userType: '',
    ruleType: 'all',
    status: 'all',
  });

  const [sortBy, setSortBy] = useState<SortBy>('description');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // ===== Queries =====
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: schedules = [], isLoading, error } = useQuery<ScheduleData[], Error>({
    queryKey: ['schedules', selectedCompanyId],
    queryFn: () => fetchSchedules(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  // ===== Mutation DELETE =====
  const deleteScheduleMutation = useMutation<void, Error, string>({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', selectedCompanyId] });
      setScheduleToDelete(null);
    },
  });

  // ===== Mutation TOGGLE ACTIVE =====
  const toggleActiveScheduleMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      toggleScheduleActive(payload.id, payload.isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', selectedCompanyId] });
    },
  });

  // ===== Ordenação e Filtros =====
  const filteredAndSorted = useMemo(() => {
    const base = schedules
      .filter(s =>
        filters.description
          ? s.description.toLowerCase().includes(filters.description.toLowerCase())
          : true,
      )
      .filter(s =>
        filters.userType
          ? s.userType?.name?.toLowerCase().includes(filters.userType.toLowerCase())
          : true,
      )
      .filter(s => (filters.ruleType === 'all' ? true : s.ruleType === filters.ruleType))
      .filter(s => {
        if (filters.status === 'all') return true;
        return filters.status === 'active' ? s.isActive : !s.isActive;
      });

    const arr = [...base];
    arr.sort((a, b) => {
      let cmp = 0;

      switch (sortBy) {
        case 'description':
          cmp = (a.description || '').localeCompare(b.description || '');
          break;
        case 'userType':
          cmp = (a.userType?.name || '').localeCompare(b.userType?.name || '');
          break;
        case 'ruleType':
          cmp = translatePriorityRuleType(a.ruleType).localeCompare(
            translatePriorityRuleType(b.ruleType),
          );
          break;
        case 'slots':
          cmp = (a.timeSlots?.length || 0) - (b.timeSlots?.length || 0);
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
  }, [schedules, filters, sortBy, sortOrder]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  // ===== Context Menu =====
  const { state: cm, openAt, close: closeMenu } = useContextMenu({
    estimatedSize: { width: 220, height: 160 },
  });
  const [selectedRow, setSelectedRow] = useState<ScheduleData | null>(null);

  const openContext = (e: React.MouseEvent, row: ScheduleData) => {
    e.preventDefault();
    setSelectedRow(row);
    openAt(e.pageX, e.pageY);
  };

  // ===== Colunas =====
  const columns: Column<ScheduleData>[] = [
    {
      key: 'description',
      header: 'Descrição',
      widthPct: COLS.description,
      sortable: true,
      render: s => s.description,
    },
    {
      key: 'userType',
      header: 'Tipo de Utente',
      widthPct: COLS.userType,
      sortable: true,
      render: s => s.userType?.name || '—',
    },
    {
      key: 'ruleType',
      header: 'Tipo de Regra',
      widthPct: COLS.ruleType,
      sortable: true,
      render: s => translatePriorityRuleType(s.ruleType),
    },
    {
      key: 'slots',
      header: 'Nº Intervalos',
      widthPct: COLS.slots,
      sortable: true,
      render: s => s.timeSlots?.length ?? 0,
    },
    {
      key: 'status',
      header: 'Estado',
      widthPct: COLS.status,
      sortable: true,
      render: s => (
        <span
          className={[
            'px-2 py-1 rounded text-[11px] font-medium',
            s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
          ].join(' ')}
        >
          {s.isActive ? 'Ativa' : 'Inativa'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      widthPct: COLS.actions,
      align: 'right',
      render: (s) => (
        <div className="flex justify-end items-center gap-1">

          {/* Editar (desktop) */}
          <span className="hidden md:inline-flex">
            <Button asChild variant="ghost" size="icon" title="Editar regra">
              <Link to={`/schedules/edit/${s.id}`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </span>

          {/* Ativar / Desativar (MESMO ESTILO DOS OPERADORES) */}
          <span className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="icon"
              title={s.isActive ? "Desativar regra" : "Ativar regra"}
              onClick={() =>
                toggleActiveScheduleMutation.mutate({
                  id: s.id,
                  isActive: !s.isActive,
                })
              }
            >
              {s.isActive ? (
                <ToggleLeft className="h-4 w-4 text-red-600" />
              ) : (
                <ToggleRight className="h-4 w-4 text-green-600" />
              )}
            </Button>
          </span>

          {/* Apagar (desktop) */}
          <span className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
              title="Apagar regra"
              onClick={() => setScheduleToDelete(s)}
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
              setSelectedRow(s);
              openAt(r.right + window.scrollX, r.top + window.scrollY);
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  // ===== Contadores =====
  const total = schedules.length;
  const visiveis = filteredAndSorted.length;

  // ===== Permissões =====
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Page>
      <ListPageTemplate<ScheduleData>
        header={{
          icon: OctagonMinus,
          title: 'Regras de Prioridade',
          subtitle: 'Gira as regras de prioridade de atendimento.',
          actions: (
            <div className="flex items-center gap-3 w-[42rem] max-w-full">
              {/* Empresa */}
              <div className="flex-1 min-w-[26rem]">
                {user.role === UserRole.PLATFORM_ADMIN && (
                  <CompanySelect
                    mode="navigate"
                    companies={companies}
                    value={selectedCompanyId || ''}
                    buildHref={id => `/schedules/company/${id}`}
                    triggerWidthClass="w-full"
                  />
                )}
              </div>

              {/* Criar */}
              {selectedCompanyId && (
                <Button asChild>
                  <Link to={`/schedules/new?companyId=${selectedCompanyId}`}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Regra
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
              {/* Descrição */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Descrição</label>
                <Input
                  placeholder="Filtrar por descrição…"
                  value={filters.description}
                  onChange={e => setFilters(s => ({ ...s, description: e.target.value }))}
                  className="h-8 px-2"
                />
              </div>

              {/* Tipo de Utente */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Tipo de Utente</label>
                <Input
                  placeholder="Filtrar por tipo…"
                  value={filters.userType}
                  onChange={e => setFilters(s => ({ ...s, userType: e.target.value }))}
                  className="h-8 px-2"
                />
              </div>

              {/* Tipo de Regra */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Regra</label>
                <Select
                  value={filters.ruleType}
                  onValueChange={v => setFilters(s => ({ ...s, ruleType: v as any }))}
                >
                  <SelectTrigger className="h-8 w-full px-2">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.values(PriorityRuleType).map(rt => (
                      <SelectItem key={rt} value={rt}>
                        {translatePriorityRuleType(rt as PriorityRuleType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Estado</label>
                <Select
                  value={filters.status}
                  onValueChange={v => setFilters(s => ({ ...s, status: v as any }))}
                >
                  <SelectTrigger className="h-8 w-full px-2">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
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
              <strong>{visiveis}</strong> de {total} regras
            </span>
            <div />
          </>
        }

        table={{
          columns,
          data: filteredAndSorted,
          rowKey: s => s.id,
          sortBy,
          sortOrder,
          onSort: k => {
            if (['description', 'userType', 'ruleType', 'slots', 'status'].includes(k)) {
              handleSort(k as SortBy);
            }
          },
          stickyHeader: true,
          onRowContextMenu: (e, row) => openContext(e as any, row as ScheduleData),
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              Não foram encontradas regras com os filtros aplicados.
            </div>
          ),
        }}
      />

      {/* ===== Context Menu ===== */}
      {cm.open && selectedRow && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>

          <ContextMenuItem
            onClick={() => {
              navigate(`/schedules/edit/${selectedRow.id}`);
              closeMenu();
            }}
          >
            Editar
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => {
              toggleActiveScheduleMutation.mutate({
                id: selectedRow.id,
                isActive: !selectedRow.isActive,
              });
              closeMenu();
            }}
          >
            {selectedRow.isActive ? "Desativar" : "Ativar"}
          </ContextMenuItem>

          <ContextMenuItem
            danger
            onClick={() => {
              setScheduleToDelete(selectedRow);
              closeMenu();
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Eliminar
            </span>
          </ContextMenuItem>

        </ContextMenu>
      )}

      {/* ===== Modal: Eliminação ===== */}
      {scheduleToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar a regra "{scheduleToDelete.description}"?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">Esta ação não pode ser revertida.</p>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setScheduleToDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deleteScheduleMutation.isPending}
                onClick={() => deleteScheduleMutation.mutate(scheduleToDelete.id)}
              >
                {deleteScheduleMutation.isPending ? 'A Apagar...' : 'Apagar Regra'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </Page>
  );
};

export default SchedulesListPage;