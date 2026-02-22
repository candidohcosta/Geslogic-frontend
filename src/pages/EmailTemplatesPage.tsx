// frontend/src/pages/EmailTemplatesPage.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEmailTemplates, deleteEmailTemplate, fetchCompanies } from '../services/api';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/Select';
import { Label } from '../components/ui/Label';

import { UserRole } from '../types/user';
import { EmailTemplateType } from '../types/email';
import { useDebounce } from '../hooks/useDebounce';

import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

import {
  FilePenLine, Trash2, PlusCircle, Eye, Mails,
  Search, Tags, FileText, Building2, MoreVertical
} from 'lucide-react';

// --- Tipos ---
interface EmailTemplateItem {
  id: string;
  name: string;
  type: string;
  subject: string;
  company?: { id: string; name: string } | null;
}

// --- Larguras de colunas ---
const COLS = {
  name: 28,
  type: 18,
  subject: 32,
  company: 10,
  actions: 12,
} as const;

const FILTER_GRID_TEMPLATE = `
  25% 20% 35% 20%
` as const;

type SortBy = 'name' | 'type' | 'subject' | 'company.name';

const EmailTemplatesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filtros e ordenação (server-side)
  const [filters, setFilters] = useState({ name: '', subject: '', type: '', companyId: '' });
  const debouncedFilters = useDebounce(filters, 500);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const queryFilters = useMemo(
    () => ({ ...debouncedFilters, sortBy, sortOrder }),
    [debouncedFilters, sortBy, sortOrder]
  );

  const { data: templates = [], isLoading, error } = useQuery<EmailTemplateItem[]>({
    queryKey: ['emailTemplates', queryFilters],
    queryFn: () => fetchEmailTemplates(queryFilters),
    enabled: !!user,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { mutate: deleteTemplate, isPending: isDeleting } = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setShowDeleteModal(false);
      setTemplateToDelete(null);
    },
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSelectFilterChange = (name: string, value: string) =>
    setFilters(prev => ({ ...prev, [name]: value === 'all' ? '' : value }));

  const handleSort = (columnName: SortBy) => {
    if (sortBy === columnName) setSortOrder(curr => (curr === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setSortBy(columnName);
      setSortOrder('ASC');
    }
  };

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplateItem | null>(null);
  const handleDeleteClick = (template: EmailTemplateItem) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };
  const handleConfirmDelete = () => {
    if (templateToDelete) deleteTemplate(templateToDelete.id);
  };

  // Context menu (mobile)
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 220, height: 150 } });
  const [selected, setSelected] = useState<EmailTemplateItem | null>(null);

  const isPlatformAdmin = user?.role === UserRole.PLATFORM_ADMIN;

  const columns: Column<EmailTemplateItem>[] = [
    { key: 'name', header: 'Nome', widthPct: COLS.name, sortable: true, render: (t) => t.name },
    { key: 'type', header: 'Tipo', widthPct: COLS.type, sortable: true, render: (t) => t.type },
    {
      key: 'subject',
      header: 'Assunto',
      widthPct: COLS.subject,
      sortable: true,
      render: (t) => <span className="block w-full truncate" title={t.subject}>{t.subject}</span>,
    },
    ...(isPlatformAdmin
      ? [{
          key: 'company.name',
          header: 'Empresa',
          widthPct: COLS.company,
          sortable: true,
          render: (t: EmailTemplateItem) => t.company?.name || 'Plataforma',
        } as Column<EmailTemplateItem>]
      : []),
    {
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      widthPct: COLS.actions,
      align: 'right',
      render: (t) => {
        const canCompanyAdminEdit =
          user?.role === UserRole.COMPANY_ADMIN && t.company?.id === user?.company?.id;
        const isPlatformTemplate = !t.company;

        return (
          <div className="flex items-center justify-end gap-1">
            {(isPlatformAdmin || canCompanyAdminEdit) && (
              <Button variant="ghost" size="icon" asChild title="Editar">
                <Link to={`/email-templates/edit/${t.id}`}>
                  <FilePenLine className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {(isPlatformAdmin || canCompanyAdminEdit) && (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleDeleteClick(t)}
                title="Apagar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {user?.role === UserRole.COMPANY_ADMIN && isPlatformTemplate && (
              <Button variant="ghost" size="icon" asChild title="Ver (só leitura)">
                <Link to={`/email-templates/edit/${t.id}`}>
                  <Eye className="h-4 w-4 text-gray-400" />
                </Link>
              </Button>
            )}

            {/* Mobile: ⋮ abre context menu */}
            <button
              className="md:hidden inline-flex p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Mais ações"
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setSelected(t);
                openAt(r.right + window.scrollX, r.top + window.scrollY);
              }}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        );
      },
    },
  ];

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <>
      <ListPageTemplate<EmailTemplateItem>
        header={{
          icon: Mails,
          title: 'Gestão de Templates de Email',
          subtitle: 'Crie e edite os modelos de email para a sua comunicação.',
          actions: (
            <div className="flex items-center gap-2">
              <Button asChild className="shrink-0">
                <Link to="/email-templates/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar Novo Template
                </Link>
              </Button>
            </div>
          ),
        }}

        filters={{
          colsTemplate: FILTER_GRID_TEMPLATE,
          children: (
            <>
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                  <Search className="w-3.5 h-3.5" /> Nome
                </label>
                <Input
                  id="filter-name"
                  name="name"
                  placeholder="Pesquisar por nome…"
                  value={filters.name}
                  onChange={handleFilterChange}
                  className="h-8 px-2"
                />
              </div>

              {/* Tipo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                  <Tags className="w-3.5 h-3.5" /> Tipo
                </label>
                <Select
                  value={filters.type || 'all'}
                  onValueChange={(v) => handleSelectFilterChange('type', v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.values(EmailTemplateType).sort().map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assunto */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Assunto
                </label>
                <Input
                  id="filter-subject"
                  name="subject"
                  placeholder="Pesquisar por assunto…"
                  value={filters.subject}
                  onChange={handleFilterChange}
                  className="h-8 px-2"
                />
              </div>

              {/* Empresa (só para Platform Admin) */}
              {isPlatformAdmin && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Empresa
                  </label>
                  <Select
                    value={filters.companyId || 'all'}
                    onValueChange={(v) => handleSelectFilterChange('companyId', v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="platform">Plataforma</SelectItem>
                      {(companies as any[]).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          ),
        }}

        toolbar={
          <>
            <span>
              <strong>{templates.length}</strong> {templates.length === 1 ? 'template' : 'templates'}
            </span>
            <div className="flex items-center gap-2" />
          </>
        }

        table={{
          columns,
          data: templates,
          rowKey: (t) => t.id,
          sortBy,
          sortOrder,
          onSort: (k) => {
            const key = k as SortBy;
            if (['name', 'type', 'subject', 'company.name'].includes(key)) handleSort(key);
          },
          onRowContextMenu: (e, row) => {
            e.preventDefault();
            setSelected(row as EmailTemplateItem);
            openAt(e.pageX, e.pageY);
          },
          stickyHeader: true,
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              {isLoading ? 'A carregar templates...' : 'Sem resultados para os filtros atuais.'}
            </div>
          ),
        }}
      />

      {/* Context Menu (mobile) */}
      {cm.open && selected && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          <ContextMenuItem onClick={() => { navigate(`/email-templates/edit/${selected.id}`); closeMenu(); }}>
            Editar
          </ContextMenuItem>
          <ContextMenuItem danger onClick={() => { handleDeleteClick(selected); closeMenu(); }}>
            Apagar
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { navigate(`/email-templates/edit/${selected.id}`); closeMenu(); }}>
            Ver
          </ContextMenuItem>
        </ContextMenu>
      )}

      {/* Modal de delete */}
      {showDeleteModal && templateToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <div className="px-6 py-4">
              <h3 className="text-base font-semibold leading-none">Confirmar Eliminação</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tem a certeza que deseja apagar o template "{templateToDelete.name}"?
              </p>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'A Apagar...' : 'Apagar Template'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default EmailTemplatesPage;