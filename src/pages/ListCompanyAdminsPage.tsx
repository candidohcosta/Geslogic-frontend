// frontend/src/pages/ListCompanyAdminsPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCompanyAdmins, activateDeactivateAdmin, deleteCompanyAdmin, adminReset2FA } from '../services/api';
import { UserRole } from '../types/user';

// Páginas/Componentes reusáveis
import CreateCompanyAdminPage from './CreateCompanyAdminPage';

// UI Base
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

// Templates
import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

// Padrões (consistência)
import { Drawer } from '../components/patterns/Drawer';
import { ConfirmDialog } from '../components/patterns/ConfirmDialog';

// Context Menu consistente
import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

// Ícones
import {
  FilePenLine,
  Building,
  ShieldAlert,
  Plus,
  ShieldUser, // header da página
  Users,
} from 'lucide-react';

interface CompanyAdminData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    slug: string;
  };
}

const ListCompanyAdminsPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ====== Estado local (UI) ======
  const [searchQuery, setSearchQuery] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  // ContextMenu (usar o teu hook para posição/portal)
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 240, height: 240 } });
  const [selectedAdmin, setSelectedAdmin] = useState<CompanyAdminData | null>(null);

  // Drawer “Criar Admin”
  const [createOpen, setCreateOpen] = useState(false);

  // ConfirmDialog Eliminar
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAdminForDelete, setSelectedAdminForDelete] = useState<CompanyAdminData | null>(null);

  // ====== Dados ======
  const {
    data: companyAdmins = [],
    isLoading,
    error: queryError,
  } = useQuery<CompanyAdminData[], Error>({
    queryKey: ['companyAdmins', companyId],
    queryFn: () => fetchCompanyAdmins(companyId),
    enabled: !!user,
  });

  const companyNameFromData = companyAdmins.length > 0 ? companyAdmins[0].company?.name : undefined;

  // ====== Mutations ======
  const { mutate: activateDeactivateMutate } = useMutation({
    mutationFn: activateDeactivateAdmin,
    onSuccess: () => {
      setSuccess('Status do administrador atualizado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['companyAdmins', companyId] });
    },
  });

  const {
    mutate: deleteAdminMutate,
    isPending: isDeleting,
  } = useMutation({
    mutationFn: deleteCompanyAdmin,
    onSuccess: () => {
      setSuccess('Administrador eliminado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['companyAdmins', companyId] });
      handleCloseDeleteAdminDialog();
    },
  });

  // ====== Handlers ======
  const handleCreateAdminSuccess = () => {
    setCreateOpen(false);
    queryClient.invalidateQueries({ queryKey: ['companyAdmins', companyId] });
  };

  const handleRowContextMenu = (e: React.MouseEvent, admin: CompanyAdminData) => {
    e.preventDefault();
    if (user?.role === UserRole.COMPANY_ADMIN && admin.id === user.id) return; // não permitir menu no próprio
    setSelectedAdmin(admin);
    openAt(e.pageX, e.pageY);
  };

  const handleActivateDeactivateAdmin = () => {
    if (!selectedAdmin) return;
    activateDeactivateMutate({ adminId: selectedAdmin.id, isActive: !selectedAdmin.isActive });
    closeMenu();
  };

  const handleDeleteAdminClick = () => {
    if (!selectedAdmin) return;
    setSelectedAdminForDelete(selectedAdmin);
    setDeleteOpen(true);
    closeMenu();
  };

  const handleConfirmDeleteAdmin = () => {
    if (!selectedAdminForDelete) return;
    deleteAdminMutate(selectedAdminForDelete.id);
  };

  const handleCloseDeleteAdminDialog = () => {
    setDeleteOpen(false);
    setSelectedAdminForDelete(null);
  };

  // ====== Filtragem (client-side) ======
  const filteredCompanyAdmins = companyAdmins.filter((admin) =>
    [admin.firstName, admin.lastName, admin.email, admin.company?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ====== Guardas de navegação ======
  if (!user) return <Navigate to="/login" />;
  if (isLoading) return <div className="p-6 text-center">A carregar lista de administradores...</div>;
  if (queryError) return <div className="p-6 text-center text-red-600">Erro: {queryError.message}</div>;

  // ====== Colunas ======
  const columns: Column<CompanyAdminData>[] = [
    {
      key: 'name',
      header: 'Nome',
      widthPct: companyId ? 30 : 24,
      sortable: false,
      render: (a) => `${a.firstName} ${a.lastName}`,
    },
    { key: 'email', header: 'Email', widthPct: companyId ? 32 : 26, sortable: false },
    ...(!companyId
      ? [
          {
            key: 'company',
            header: 'Empresa',
            widthPct: 24,
            sortable: false,
            render: (a: CompanyAdminData) => a.company?.name || 'N/A',
          } as Column<CompanyAdminData>,
        ]
      : []),
    {
      key: 'isActive',
      header: 'Ativo',
      widthPct: 10,
      sortable: false,
      render: (a) => (a.isActive ? 'Sim' : 'Não'),
      align: 'center',
    },
    {
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      widthPct: companyId ? 28 : 16,
      align: 'right',
      render: (a) => (
        <div className="flex items-center justify-end space-x-1">
          <Button variant="ghost" size="icon" asChild title="Editar Administrador">
            <Link to={a.id === user?.id ? '/edit-profile' : `/company-admins/edit/${a.id}`}>
              <FilePenLine className="h-4 w-4" />
            </Link>
          </Button>
          {a.company?.id && (
            <Button variant="ghost" size="icon" asChild title="Editar Empresa">
              <Link to={`/companies/edit/${a.company.id}`}>
                <Building className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      ),
    },
  ];

  const total = companyAdmins.length;
  const visiveis = filteredCompanyAdmins.length;

  return (
    <>
      <ListPageTemplate<CompanyAdminData>
        header={{
          icon: ShieldUser,
          title: companyId
            ? `Administradores da Empresa: ${companyNameFromData || '...'}`
            : 'Gestão de Administradores',
          subtitle: companyId
            ? `Apresenta os administradores da empresa '${companyNameFromData || '...'}'.`
            : 'Lista de todos os administradores de empresa registados no sistema.',
          actions:
            user.role === UserRole.PLATFORM_ADMIN && companyId ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Voltar
                  </Button>
                  <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Criar Administrador
                  </Button>
                </>
              </div>
            ) : null,
        }}
        filters={{
          colsTemplate: '1fr',
          children: (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-600">Pesquisar</label>
              <Input
                type="text"
                placeholder="Pesquisar por nome, email ou empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
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
          data: filteredCompanyAdmins,
          rowKey: (a) => a.id,
          stickyHeader: true,
          onRowContextMenu: (e, row) => handleRowContextMenu(e as any, row as CompanyAdminData),
          emptyState: (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
              <Users className="w-10 h-10 text-brand-500/80" />
              <div>
                <p className="text-sm text-gray-700 font-medium">Nenhum administrador encontrado.</p>
                <p className="text-xs text-gray-500">Ajuste a pesquisa ou crie um novo administrador.</p>
              </div>
              {user.role === UserRole.PLATFORM_ADMIN && companyId && (
                <Button className="mt-1" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Criar Administrador
                </Button>
              )}
            </div>
          ),
        }}
      />

      {/* ===== Drawer: Criar Administrador ===== */}
      <Drawer
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Criar Administrador"
        titleIcon={ShieldUser}
        subtitle={companyNameFromData ? <>Empresa: <b>{companyNameFromData}</b></> : undefined}
        tone="brand"
        size="md"
        headerActions={
          <a
            href="https://docs.geslogic.pt/company-admins/criar"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-600 hover:text-brand-700 underline"
          >
            Ajuda
          </a>
        }
        footer={
          <Button variant="outline" onClick={() => setCreateOpen(false)}>
            Fechar
          </Button>
        }
      >
        {/* Mantém a tua página de criação embebida no Drawer */}
        {companyId && (
          <CreateCompanyAdminPage
            onClose={handleCreateAdminSuccess}
            preselectedCompanyId={companyId}
          />
        )}
      </Drawer>

      {/* ===== Context Menu (uniformizado) ===== */}
      {cm.open && selectedAdmin && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          {user.role === UserRole.PLATFORM_ADMIN && (
            <Link
              to={`/company-admins/edit/${selectedAdmin.id}`}
              state={{ admin: selectedAdmin }}
              className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/70 rounded-[6px] flex items-center gap-2"
              onClick={closeMenu}
            >
              <FilePenLine className="h-4 w-4" />
              Editar Admin
            </Link>
          )}

          {user.role === UserRole.PLATFORM_ADMIN && selectedAdmin.company?.id && (
            <Link
              to={`/companies/edit/${selectedAdmin.company.id}`}
              className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/70 rounded-[6px] flex items-center gap-2"
              onClick={closeMenu}
            >
              <Building className="h-4 w-4" />
              Editar Empresa
            </Link>
          )}

          {(user.role === UserRole.PLATFORM_ADMIN ||
            (user.role === UserRole.COMPANY_ADMIN && selectedAdmin.id !== user.id)) && (
            <button
              onClick={() => {
                handleActivateDeactivateAdmin();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/70 rounded-[6px]"
            >
              {selectedAdmin.isActive ? 'Desativar' : 'Ativar'}
            </button>
          )}

          {user.role === UserRole.PLATFORM_ADMIN && (
            <>
              <div className="my-1 h-px bg-gray-800/60" />
              <ContextMenuItem danger onClick={handleDeleteAdminClick}>
                Eliminar
              </ContextMenuItem>
            </>
          )}

          {user.role === UserRole.PLATFORM_ADMIN && (
            <button
              className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-900/10 rounded-[6px] flex items-center gap-2"
              onClick={async () => {
                const target = selectedAdmin;
                const message = `Tem a certeza que deseja DESATIVAR a proteção 2FA do utilizador:

Nome: ${target.firstName} ${target.lastName}
Email: ${target.email}

A conta ficará desprotegida até nova configuração.`;
                if (window.confirm(message)) {
                  try {
                    await adminReset2FA(target.id);
                    alert(`O 2FA de ${target.firstName} foi removido com sucesso.`);
                    closeMenu();
                    queryClient.invalidateQueries({ queryKey: ['companyAdmins', companyId] });
                  } catch {
                    alert('Erro ao fazer reset.');
                  }
                }
              }}
            >
              <ShieldAlert className="w-4 h-4" />
              Reset 2FA
            </button>
          )}
        </ContextMenu>
      )}

      {/* ===== ConfirmDialog: Eliminar Admin (corrigido, sem checked/onCheckedChange) ===== */}
      <ConfirmDialog
        open={deleteOpen && !!selectedAdminForDelete}
        title="Confirmar Eliminação"
        description={
          selectedAdminForDelete ? (
            <>
              Tem a certeza que deseja eliminar o administrador{' '}
              <strong>
                {selectedAdminForDelete.firstName} {selectedAdminForDelete.lastName}
              </strong>{' '}
              ({selectedAdminForDelete.email})? Esta ação é irreversível.
            </>
          ) : undefined
        }
        danger
        loading={isDeleting}
        requireCheckboxLabel="Compreendo que esta ação é irreversível e desejo continuar."
        onCancel={handleCloseDeleteAdminDialog}
        onConfirm={handleConfirmDeleteAdmin}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* Mensagem de sucesso (opcional) */}
      {success && (
        <div className="mt-3 mx-4 p-3 text-sm rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
          {success}
        </div>
      )}
    </>
  );
};

export default ListCompanyAdminsPage;