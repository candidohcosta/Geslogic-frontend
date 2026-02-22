// frontend/src/pages/ActiveSessionsPage.tsx
// Migrada para ListPageTemplate: sem <Page>, com header+toolbar+tabela padronizados.

import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchActiveSessions,
  adminForceCloseSession,
  fetchCompanies,
} from '../services/api';

import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';

import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';

import { CompanySelect } from '../components/common/CompanySelect';

import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

import { MonitorCheck, PowerOff, User as UserIcon, Clock, MoreVertical } from 'lucide-react';
import { showConfirm, showInfo } from '../lib/uiDialogs';

interface SessionData {
  id: string;
  isActive: boolean;
  loginTime: string;
  operator: { firstName: string; lastName: string; email: string };
  counter: { name: string };
  station: { name: string };
}

const COLS = {
  operator: 38,
  counter: 28,
  start: 14,
  actions: 12,
} as const;

const FILTER_GRID_TEMPLATE = `
  60% 40%
` as const;

type SortBy = 'operator' | 'start';

const ActiveSessionsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 220, height: 120 } });

  // Empresas (apenas Platform Admin)
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // Sessões ativas
  const { data: sessions = [], isLoading } = useQuery<SessionData[]>({
    queryKey: ['activeSessions', selectedCompanyId],
    queryFn: () => fetchActiveSessions(selectedCompanyId === 'ALL' ? undefined : selectedCompanyId),
  });

  // Encerrar sessão
  const { mutateAsync: killSession, isPending } = useMutation({
    mutationFn: (id: string) => adminForceCloseSession(id),
    retry: false,
  });


  const handleKill = async (session: SessionData) => {
    const operatorName = `${session.operator.firstName} ${session.operator.lastName}`;

    // 1) Confirmar
    const ok = await showConfirm(
      `Tem a certeza que deseja terminar a sessão de ${operatorName}?`,
      { title: 'GesLogic — Operador', confirmText: 'Terminar', cancelText: 'Cancelar' }
    );
    if (!ok) return;

    try {
      // 2) Executar a mutation
      await killSession(session.id);

      // 3) Atualizar lista
      await queryClient.invalidateQueries({ queryKey: ['activeSessions'] });

      // 4) Mostrar feedback
      await showInfo(`Sessão de ${operatorName} encerrada com sucesso.`, {
        title: 'GesLogic — Operador',
      });
    } catch (err: any) {
      await showInfo(
        `Erro ao encerrar sessão: ${err?.message ?? 'desconhecido'}`,
        { title: 'GesLogic — Operador' }
      );
    }
  };

  // Filtros simples (client-side) — por operador
  const [operatorFilter, setOperatorFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('start');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const filteredAndSorted = useMemo(() => {
    const base = (sessions || [])
      .filter(s =>
        operatorFilter
          ? `${s.operator.firstName} ${s.operator.lastName} ${s.operator.email}`
              .toLowerCase()
              .includes(operatorFilter.toLowerCase())
          : true,
      );

    const arr = [...base];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'operator':
          cmp = `${a.operator.firstName} ${a.operator.lastName}`.localeCompare(
            `${b.operator.firstName} ${b.operator.lastName}`,
          );
          break;
        case 'start':
        default:
          cmp = new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime();
          break;
      }
      return sortOrder === 'ASC' ? cmp : -cmp;
    });
    return arr;
  }, [sessions, operatorFilter, sortBy, sortOrder]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(column);
      setSortOrder(column === 'start' ? 'DESC' : 'ASC'); // por defeito, mais recentes primeiro
    }
  };

  const columns: Column<SessionData>[] = [
    {
      key: 'operator',
      header: 'Operador',
      widthPct: COLS.operator,
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-2 rounded-full">
            <UserIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{s.operator.firstName} {s.operator.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{s.operator.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'counter',
      header: 'Balcão / Posto',
      widthPct: COLS.counter,
      sortable: false,
      render: (s) => (
        <div>
          <p className="font-medium">{s.counter.name}</p>
          <p className="text-sm text-muted-foreground">{s.station.name}</p>
        </div>
      ),
    },
    {
      key: 'start',
      header: 'Início',
      widthPct: COLS.start,
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          {new Date(s.loginTime).toLocaleString('pt-PT')}
        </div>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      widthPct: COLS.actions,
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          {/* Desktop: botão direto */}
          <span className="hidden md:inline-flex">
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                closeMenu();            
                await handleKill(s);
              }}
              disabled={isPending}
              title="Forçar Encerramento"
            >
              <PowerOff className="w-4 h-4 mr-2" />
              Encerrar
            </Button>
          </span>

          {/* Mobile: ⋮ abre context menu */}
          <button
            className="md:hidden inline-flex p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Mais ações"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setSelectedSession(s);
              openAt(r.right + window.scrollX, r.top + window.scrollY);
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  const total = sessions.length;
  const visiveis = filteredAndSorted.length;

  if (!user || ![UserRole.PLATFORM_ADMIN, UserRole.COMPANY_ADMIN].includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <>
      <ListPageTemplate<SessionData>
        header={{
          icon: MonitorCheck,
          title: 'Sessões de Atendimento Ativas',
          subtitle: 'Monitorize os operadores que estão atualmente a trabalhar.',
          actions: (
            <div className="flex items-center gap-3 w-[42rem] max-w-full">
              {user.role === UserRole.PLATFORM_ADMIN && (
                <div className="flex-1 min-w-[26rem]">
                  <CompanySelect
                    mode="controlled"
                    value={selectedCompanyId}
                    onChange={(newId) => setSelectedCompanyId(newId)}
                    companies={[{ id: 'ALL', name: 'Todas as Empresas' }, ...companies]}
                    triggerWidthClass="w-full"
                  />
                </div>
              )}
              {/* COMPANY_ADMIN não mostra ações no header */}
            </div>
          ),
        }}

        filters={{
          colsTemplate: FILTER_GRID_TEMPLATE,
          children: (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Operador</label>
                <Input
                  placeholder="Filtrar por nome/email…"
                  value={operatorFilter}
                  onChange={(e) => setOperatorFilter(e.target.value)}
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
              <strong>{visiveis}</strong> de {total} sessões
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
            if (['operator', 'start'].includes(key)) handleSort(key);
          },
          onRowContextMenu: (e, row) => {
            e.preventDefault();
            setSelectedSession(row);
            openAt(e.pageX, e.pageY);
          },
          stickyHeader: true,
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              {isLoading
                ? 'A carregar sessões...'
                : 'Nenhum operador a trabalhar neste momento.'}
            </div>
          ),
        }}
      />

      {/* Context Menu (mobile) */}
      {cm.open && selectedSession && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          <ContextMenuItem
            danger
            onClick={async () => {
              closeMenu();            
              await handleKill(selectedSession);
            }}
          >
            <span className="inline-flex items-center gap-2"><PowerOff className="w-4 h-4" /> Encerrar</span>
          </ContextMenuItem>
        </ContextMenu>
      )}
    </>
  );
};

export default ActiveSessionsPage;