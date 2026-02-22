// frontend/src/pages/PolicyDocumentsPage.tsx
import React, { useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Checkbox } from '../components/ui/Checkbox';
import { Label } from '../components/ui/Label';

import { fetchPolicies, deletePolicy, fetchCompanies } from '../services/api';
import { UserRole } from '../types/user';
import { FilePenLine, PlusCircle, Trash2, Shield, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

// ===== Tipos =====
interface PolicyData {
  id: string;
  name: string;
  consentText: string;
  company: { id: string; name: string } | null;
  document?: { id: string; url: string; displayName: string } | null;
}
interface Company { id: string; name: string; }

// ===== Larguras =====
const COLS = {
  name: 24,
  consent: 36,
  scope: 20,
  document: 10,
  actions: 10,
} as const;

const FILTER_GRID_TEMPLATE = `
  ${COLS.name}%
  ${COLS.consent}%
  ${COLS.scope}%
  ${COLS.document}%
  ${COLS.actions}%
` as const;

type SortBy = 'name' | 'consent' | 'scope' | 'document';
type DocFilter = 'all' | 'with' | 'without';
type ScopeFilter = 'all' | 'platform' | string; // companyId ou "platform"

const resolveFileUrl = (rawUrl?: string) => {
  if (!rawUrl) return '';
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const base = process.env.REACT_APP_API_BASE_URL || '';
  if (!base) return rawUrl;
  return `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
};

const PolicyDocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<PolicyData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Filtros e ordenação
  const [filters, setFilters] = useState<{
    name: string;
    consent: string;
    scope: ScopeFilter;    // 'all' | 'platform' | companyId
    document: DocFilter;   // 'all' | 'with' | 'without'
  }>({
    name: '',
    consent: '',
    scope: 'all',
    document: 'all',
  });

  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Queries
  const { data: policies = [], isLoading, error } = useQuery<PolicyData[], Error>({
    queryKey: ['policies'],
    queryFn: fetchPolicies,
    enabled: !!user,
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: !!user,
  });

  const { mutate: deletePolicyMutate, isPending: isDeleting } = useMutation({
    mutationFn: deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      handleCloseDeleteModal();
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao eliminar.'),
  });

  const canManagePolicy = (policy: PolicyData) => {
    if (user?.role === UserRole.PLATFORM_ADMIN) return true;
    if (user?.role === UserRole.COMPANY_ADMIN && policy.company?.id === user.company?.id) return true;
    return false;
  };
  const canViewDocument = (policy: PolicyData) => {
    if (user?.role === UserRole.PLATFORM_ADMIN) return true;
    if (user?.role === UserRole.COMPANY_ADMIN && (!policy.company || policy.company?.id === user.company?.id)) return true;
    return false;
  };

  // Handlers modal delete
  const handleDeleteClick = (policy: PolicyData) => {
    setPolicyToDelete(policy);
    setConfirmDelete(false);
    setShowDeleteModal(true);
  };
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setPolicyToDelete(null);
    setConfirmDelete(false);
  };
  const handleConfirmDeletePolicy = () => {
    if (!policyToDelete || !confirmDelete) return;
    deletePolicyMutate(policyToDelete.id);
  };

  const handleSort = (column: SortBy) => {
    if (sortBy === column) setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };
  const sortIndicator = (column: SortBy) => (sortBy === column ? (sortOrder === 'ASC' ? '▲' : '▼') : '');

  // Derived: filtros + ordenação (client-side)
  const filteredSorted = useMemo(() => {
    let list = [...policies];

    if (filters.name.trim()) {
      const q = filters.name.toLowerCase();
      list = list.filter(p => (p.name || '').toLowerCase().includes(q));
    }
    if (filters.consent.trim()) {
      const q = filters.consent.toLowerCase();
      list = list.filter(p => (p.consentText || '').toLowerCase().includes(q));
    }
    if (filters.scope === 'platform') {
      list = list.filter(p => !p.company);
    } else if (filters.scope !== 'all') {
      list = list.filter(p => p.company?.id === filters.scope);
    }
    if (filters.document === 'with') {
      list = list.filter(p => !!p.document?.url);
    } else if (filters.document === 'without') {
      list = list.filter(p => !p.document?.url);
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'consent':
          cmp = (a.consentText || '').localeCompare(b.consentText || '');
          break;
        case 'scope': {
          const sa = a.company ? a.company.name : 'Plataforma';
          const sb = b.company ? b.company.name : 'Plataforma';
          cmp = sa.localeCompare(sb);
          break;
        }
        case 'document': {
          const pa = a.document?.displayName || '';
          const pb = b.document?.displayName || '';
          const ha = a.document?.url ? 1 : 0;
          const hb = b.document?.url ? 1 : 0;
          cmp = ha - hb;
          if (cmp === 0) cmp = pa.localeCompare(pb);
          break;
        }
        default:
          cmp = 0;
      }
      return sortOrder === 'ASC' ? cmp : -cmp;
    });

    return list;
  }, [policies, filters, sortBy, sortOrder]);

  // Context menu mobile
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 240, height: 140 } });
  const [selected, setSelected] = useState<PolicyData | null>(null);

  const columns: Column<PolicyData>[] = [
    {
      key: 'name', header: 'Nome', widthPct: COLS.name, sortable: true,
      render: (p) => <span className="block w-full truncate" title={p.name}>{p.name}</span>,
    },
    {
      key: 'consent', header: 'Texto de Consentimento', widthPct: COLS.consent, sortable: true,
      render: (p) => <span className="block w-full truncate" title={p.consentText}>{p.consentText}</span>,
    },
    {
      key: 'scope', header: 'Âmbito', widthPct: COLS.scope, sortable: true,
      render: (p) => (p.company ? p.company.name : 'Plataforma'),
    },
    {
      key: 'document', header: 'Documento', widthPct: COLS.document, sortable: true,
      render: (p) => {
        const href = p.document?.url ? resolveFileUrl(p.document.url) : '';
        const canSee = !!href && canViewDocument(p);
        return canSee ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
            title={p.document?.displayName || 'Documento'}
            download
          >
            Ver
          </a>
        ) : (<span className="text-gray-500">N/A</span>);
      },
    },
    {
      key: 'actions', header: <span className="sr-only">Ações</span>, widthPct: COLS.actions, align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          {canManagePolicy(p) ? (
            <>
              <Button variant="ghost" size="icon" asChild title="Editar">
                <Link to={`/policy-documents/edit/${p.id}`}>
                  <FilePenLine className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(p)}
                className="text-red-600 hover:text-red-700"
                title="Apagar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <span className="text-gray-500 text-sm">Visualizar</span>
          )}

          {/* Mobile menu */}
          <button
            className="md:hidden inline-flex p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Mais ações"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setSelected(p);
              openAt(r.right + window.scrollX, r.top + window.scrollY);
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  // Permissões
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">A carregar políticas...</div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-center text-red-500">Erro: {(error as Error).message}</div>
    );
  }

  return (
    <>
      <ListPageTemplate<PolicyData>
        header={{
          icon: Shield,
          title: 'Gestão de Políticas de Privacidade',
          subtitle: 'Crie e gira os documentos de consentimento.',
          actions: (
            <>
              {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                <Button asChild>
                  <Link to="/policy-documents/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova
                  </Link>
                </Button>
              )}
            </>
          ),
        }}

        filters={{
          colsTemplate: FILTER_GRID_TEMPLATE,
          children: (
            <>
              {/* Nome */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] font-medium text-gray-600">Nome</label>
                <Input
                  placeholder="Pesquisar…"
                  value={filters.name}
                  onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                  className="h-8 px-2"
                />
              </div>

              {/* Consent */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] font-medium text-gray-600">Texto de Consentimento</label>
                <Input
                  placeholder="Pesquisar…"
                  value={filters.consent}
                  onChange={(e) => setFilters(prev => ({ ...prev, consent: e.target.value }))}
                  className="h-8 px-2"
                />
              </div>

              {/* Scope */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] font-medium text-gray-600">Âmbito</label>
                <Select
                  value={filters.scope}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, scope: v as ScopeFilter }))}
                >
                  <SelectTrigger className="h-8 w-full px-2">
                    <SelectValue placeholder="Âmbito" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="platform">Plataforma</SelectItem>
                    {(companies as Company[]).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Documento */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] font-medium text-gray-600">Documento</label>
                <Select
                  value={filters.document}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, document: v as DocFilter }))}
                >
                  <SelectTrigger className="h-8 w-full px-2">
                    <SelectValue placeholder="Documento" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="with">Com documento</SelectItem>
                    <SelectItem value="without">Sem documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Placeholder para alinhar com a coluna "Ações" */}
              <div />
            </>
          ),
        }}

        toolbar={
          <>
            <span>
              <strong>{filteredSorted.length}</strong> {filteredSorted.length === 1 ? 'política' : 'políticas'}
            </span>
            <div className="flex items-center gap-2" />
          </>
        }

        table={{
          columns,
          data: filteredSorted,
          rowKey: (p) => p.id,
          sortBy,
          sortOrder,
          onSort: (k) => {
            const key = k as SortBy;
            if (['name', 'consent', 'scope', 'document'].includes(key)) handleSort(key);
          },
          onRowContextMenu: (e, row) => {
            e.preventDefault();
            setSelected(row as PolicyData);
            openAt(e.pageX, e.pageY);
          },
          stickyHeader: true,
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              Sem resultados para os filtros atuais.
            </div>
          ),
          tableClassName: 'table-fixed w-full',
        }}
      />

      {/* Context Menu (mobile) */}
      {cm.open && selected && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          {canManagePolicy(selected) ? (
            <>
              <ContextMenuItem onClick={() => { window.open(selected.document?.url ? resolveFileUrl(selected.document.url) : '#', '_blank'); closeMenu(); }}>
                Ver Documento
              </ContextMenuItem>
              <ContextMenuItem onClick={() => { /* Editar */ window.location.href = `/policy-documents/edit/${selected.id}`; }}>
                Editar
              </ContextMenuItem>
              <ContextMenuItem danger onClick={() => { handleDeleteClick(selected); closeMenu(); }}>
                Apagar
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem onClick={() => { if (selected.document?.url) window.open(resolveFileUrl(selected.document.url), '_blank'); closeMenu(); }}>
                Ver Documento
              </ContextMenuItem>
            </>
          )}
        </ContextMenu>
      )}

      {/* MODAL: Eliminar */}
      {showDeleteModal && policyToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>
                Tem a certeza que deseja eliminar a política "{policyToDelete.name}"?
                Esta ação é irreversível e removerá o registo e o documento associado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirmDeletePolicy"
                  checked={confirmDelete}
                  onCheckedChange={(checked) => setConfirmDelete(Boolean(checked))}
                />
                <Label htmlFor="confirmDeletePolicy">
                  Compreendo que esta ação é irreversível e desejo continuar.
                </Label>
              </div>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={handleCloseDeleteModal}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDeletePolicy} disabled={!confirmDelete || isDeleting}>
                {isDeleting ? 'A Eliminar...' : 'Eliminar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};

export default PolicyDocumentsPage;