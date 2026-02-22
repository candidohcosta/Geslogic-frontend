// src/pages/PlatformAdminsPage.tsx
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { InfoModal } from '../components/ui/InfoModal';

import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import {
  ShieldUser, ShieldCheck, Plus, MoreVertical, Mail, Trash2,
} from 'lucide-react';

import {
  fetchPlatformAdmins,
  togglePlatformAdminActive,
  sendPlatformAdminPasswordResetEmail,
  deletePlatformAdmin,
} from '../services/api';

import { UserData, PlatformAdminType } from '../types/user';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Context Menu
import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

const COLS = {
  name: 30,
  email: 32,
  role: 18,
  status: 10,
  actions: 10,
} as const;

const FILTER_GRID_TEMPLATE = `
  ${COLS.name}% ${COLS.email}% ${COLS.role}% ${COLS.status}% ${COLS.actions}%
`;

type SortBy = 'name' | 'email' | 'role' | 'status';

const adminTypeLabel = (t?: PlatformAdminType) => {
  switch (t) {
    case PlatformAdminType.SUPER_ADMIN: return 'Super Admin';
    case PlatformAdminType.SUPPORT_L2:  return 'Suporte N2';
    case PlatformAdminType.AUDITOR:     return 'Auditor';
    case PlatformAdminType.FINANCE:     return 'Financeiro';
    default: return 'Super Admin';
  }
};

const PlatformAdminsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const [viewEmailAdmin, setViewEmailAdmin] = useState<UserData | null>(null);

  const [deleteAdmin, setDeleteAdmin] = useState<UserData | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteEmailTyped, setDeleteEmailTyped] = useState('');

  const [filters, setFilters] = useState<{
    name: string;
    email: string;
    role: 'all' | PlatformAdminType;
    status: 'all' | 'active' | 'inactive';
  }>({
    name: '',
    email: '',
    role: 'all',
    status: 'all',
  });

  const { data: admins = [], isLoading } = useQuery<UserData[], Error>({
    queryKey: ['platformAdmins'],
    queryFn: fetchPlatformAdmins,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      togglePlatformAdminActive(payload.id, payload.isActive),
    onSuccess: () => {
      toast.success('Estado atualizado.');
      queryClient.invalidateQueries({ queryKey: ['platformAdmins'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao atualizar estado.'),
  });

  const sendResetMutation = useMutation({
    mutationFn: (id: string) => sendPlatformAdminPasswordResetEmail(id),
    onSuccess: () => toast.success('Email de reset enviado.'),
    onError: (err: any) => toast.error(err?.message || 'Falha ao enviar reset de password.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlatformAdmin(id),
    onSuccess: () => {
      toast.success('Administrador eliminado.');
      queryClient.invalidateQueries({ queryKey: ['platformAdmins'] });
      setDeleteAdmin(null);
      setDeleteConfirmChecked(false);
      setDeleteEmailTyped('');
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao eliminar administrador.'),
  });

  const filteredAndSorted = useMemo(() => {
    const base = admins
      .filter(a => {
        const name = `${a.firstName} ${a.lastName}`.toLowerCase();
        return filters.name ? name.includes(filters.name.toLowerCase()) : true;
      })
      .filter(a => (filters.email ? (a.email || '').toLowerCase().includes(filters.email.toLowerCase()) : true))
      .filter(a => (filters.role === 'all' ? true : (a.platformAdminDetails?.adminType === filters.role)))
      .filter(a => {
        if (filters.status === 'all') return true;
        return filters.status === 'active' ? a.isActive : !a.isActive;
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
        case 'role':
          cmp = (a.platformAdminDetails?.adminType || '').localeCompare(b.platformAdminDetails?.adminType || '');
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
  }, [admins, filters, sortBy, sortOrder]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else { setSortBy(column); setSortOrder('ASC'); }
  };

  // Context Menu
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 260, height: 240 } });
  const [selectedAdmin, setSelectedAdmin] = useState<UserData | null>(null);

  const openContext = (e: React.MouseEvent, admin: UserData) => {
    e.preventDefault();
    setSelectedAdmin(admin);
    openAt(e.pageX, e.pageY);
  };

  const isSelf = selectedAdmin && currentUser && selectedAdmin.id === currentUser.id;

  const columns: Column<UserData>[] = [
    { key: 'name', header: 'Nome', widthPct: COLS.name, sortable: true,
      render: (a) => `${a.firstName} ${a.lastName}` },
    { key: 'email', header: 'Email', widthPct: COLS.email, sortable: true,
      render: (a) => <span title={a.email}>{a.email}</span> },
    { key: 'role', header: 'Tipo de Acesso', widthPct: COLS.role, sortable: true,
      render: (a) => (
        <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-medium bg-blue-100 text-blue-800 gap-1">
          <ShieldCheck className="h-3 w-3" />
          {adminTypeLabel(a.platformAdminDetails?.adminType as PlatformAdminType)}
        </span>
      ) },
    { key: 'status', header: 'Estado', widthPct: COLS.status, sortable: true,
      render: (a) => (
        <span className={['px-2 py-1 rounded text-[11px] font-medium', a.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'].join(' ')}>
          {a.isActive ? 'Ativo' : 'Inativo'}
        </span>
      ) },
    {
      key: 'actions', header: <span className="sr-only">Ações</span>, widthPct: COLS.actions, align: 'right',
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          <span className="hidden md:inline-flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              title="Editar"
              onClick={() => navigate(`/platform-admins/edit/${a.id}`, { state: { admin: a } })}
            >
              <ShieldUser className="w-4 h-4" />
            </Button>
          </span>

          {/* Mobile: ⋮ abre o menu */}
          <button
            className="md:hidden inline-flex p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Mais ações"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setSelectedAdmin(a);
              openAt(r.right + window.scrollX, r.top + window.scrollY);
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  const total = admins.length;
  const visiveis = filteredAndSorted.length;

  if (isLoading) {
    return <div className="p-6">A carregar administradores…</div>;
  }

  return (
    <>
      <ListPageTemplate<UserData>
        header={{
          icon: ShieldUser,
          title: 'Administradores da Plataforma',
          subtitle: 'Utilizadores com acesso global de gestão.',
          actions: (
            <Button onClick={() => navigate('/platform-admins/create')}>
              <Plus className="mr-2 h-4 w-4" /> Novo Administrador
            </Button>
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
                <label className="text-[11px] font-medium text-gray-600">Tipo de Acesso</label>
                <Select
                  value={String(filters.role)}
                  onValueChange={(v) => setFilters(s => ({ ...s, role: v as any }))}
                >
                  <SelectTrigger className="h-8 w-full px-2">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value={PlatformAdminType.SUPER_ADMIN}>Super Admin</SelectItem>
                    <SelectItem value={PlatformAdminType.SUPPORT_L2}>Suporte N2</SelectItem>
                    <SelectItem value={PlatformAdminType.AUDITOR}>Auditor</SelectItem>
                    <SelectItem value={PlatformAdminType.FINANCE}>Financeiro</SelectItem>
                  </SelectContent>
                </Select>
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
              <strong>{visiveis}</strong> de {total} administradores
            </span>
            <div className="flex items-center gap-2" />
          </>
        }

        table={{
          columns,
          data: filteredAndSorted,
          rowKey: (a) => a.id,
          sortBy,
          sortOrder,
          onSort: (k) => {
            const key = k as SortBy;
            if (['name', 'email', 'role', 'status'].includes(key)) {
              if (sortBy === key) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
              else { setSortBy(key); setSortOrder('ASC'); }
            }
          },
          onRowContextMenu: (e, row) => openContext(e as any, row as UserData),
          stickyHeader: true,
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              Não foram encontrados administradores com os filtros aplicados.
            </div>
          ),
          rowClassName: (row) => row.isActive ? '' : 'bg-amber-50/40',
        }}
      />

      {/* Context Menu */}
      {cm.open && selectedAdmin && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          <ContextMenuItem onClick={() => { navigate(`/platform-admins/edit/${selectedAdmin.id}`, { state: { admin: selectedAdmin } }); closeMenu(); }}>
            Editar
          </ContextMenuItem>

          <div className="my-1 h-px bg-gray-800/60" />

          <ContextMenuItem
            onClick={() => {
              if (currentUser && selectedAdmin.id === currentUser.id) return;
              toggleActiveMutation.mutate({ id: selectedAdmin.id, isActive: !selectedAdmin.isActive });
              closeMenu();
            }}
            className={currentUser && selectedAdmin.id === currentUser.id ? 'opacity-50 cursor-not-allowed' : undefined}
            aria-disabled={currentUser && selectedAdmin.id === currentUser.id ? true : undefined}
            title={currentUser && selectedAdmin.id === currentUser.id ? 'Não pode desativar a sua própria conta' : undefined}
          >
            {selectedAdmin.isActive ? 'Desativar' : 'Ativar'}
          </ContextMenuItem>

          <ContextMenuItem onClick={() => { setViewEmailAdmin(selectedAdmin); closeMenu(); }}>
            <span className="inline-flex items-center gap-2"><Mail className="w-4 h-4" /> Ver email</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => { sendResetMutation.mutate(selectedAdmin.id); closeMenu(); }}>
            Enviar email de reset
          </ContextMenuItem>

          <div className="my-1 h-px bg-gray-800/60" />

          <ContextMenuItem
            danger
            onClick={() => {
              if (currentUser && selectedAdmin.id === currentUser.id) return;
              setDeleteAdmin(selectedAdmin);
              setDeleteConfirmChecked(false);
              setDeleteEmailTyped('');
              closeMenu();
            }}
            className={currentUser && selectedAdmin.id === currentUser.id ? 'opacity-50 cursor-not-allowed' : undefined}
            aria-disabled={currentUser && selectedAdmin.id === currentUser.id ? true : undefined}
            title={currentUser && selectedAdmin.id === currentUser.id ? 'Não pode eliminar a sua própria conta' : undefined}
          >
            <span className="inline-flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Eliminar
            </span>
          </ContextMenuItem>
        </ContextMenu>
      )}

      {/* Modal “Ver email” */}
      {viewEmailAdmin && (
        <InfoModal
          title="Email do Administrador"
          message={viewEmailAdmin.email || '—'}
          onConfirm={() => setViewEmailAdmin(null)}
        />
      )}

      {/* Modal “Eliminar” */}
      {deleteAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDeleteAdmin(null)}
        >
          <Card className="w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b border-red-500/40">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-700">Eliminar Administrador</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="text-sm text-gray-700">
                Tem a certeza que deseja eliminar <strong>{deleteAdmin.firstName} {deleteAdmin.lastName}</strong> ({deleteAdmin.email})?
                Esta ação é <strong>irreversível</strong>.
              </p>

              <div className="flex items-center gap-2">
                <input
                  id="confirmDeleteAdmin"
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  checked={deleteConfirmChecked}
                  onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                />
                <label htmlFor="confirmDeleteAdmin" className="text-sm">Compreendo e desejo continuar.</label>
              </div>

              <div className="space-y-1">
                <label className="text-sm">Escreva o email do administrador para confirmar</label>
                <Input
                  placeholder={deleteAdmin.email}
                  value={deleteEmailTyped}
                  onChange={(e) => setDeleteEmailTyped(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDeleteAdmin(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteAdmin.id)}
                  disabled={
                    !deleteConfirmChecked ||
                    deleteEmailTyped.trim().toLowerCase() !== (deleteAdmin.email || '').toLowerCase() ||
                    (currentUser && deleteAdmin.id === currentUser.id) ||
                    deleteMutation.isPending
                  }
                >
                  {deleteMutation.isPending ? 'A eliminar…' : 'Eliminar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default PlatformAdminsPage;