// src/pages/ListCompaniesPage.tsx
import React, { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole } from '../types/user';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  fetchCompanies,
  activateDeactivateCompany,
  deleteCompany,
  createCompany,
  checkCompanySlugExists,
  checkCompanyNifExists,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/Select';
import {
  FilePenLine, Mail, Users, LayoutDashboard, Copy, CreditCard, Plus, BriefcaseBusiness, MoreVertical
} from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { toast } from 'react-hot-toast';

import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

import { Drawer } from '../components/patterns/Drawer';
import { ConfirmDialog } from '../components/patterns/ConfirmDialog';
import { cn } from '../lib/utils';

// 🔹 usa o teu hook (já existe no projeto)
import { useDebounce } from '../hooks/useDebounce';

import { isValidPortugueseNIF } from '../lib/ptNif';

// ---------- Larguras ----------
const COLS = {
  name: 28,
  email: 28,
  nif: 8,
  active: 8,
  actions: 28,
} as const;

const FILTER_GRID_TEMPLATE = `
  ${COLS.name}%
  ${COLS.email}%
  ${COLS.nif}%
  ${COLS.active}%
  ${COLS.actions}%
`;

// Tipos
interface CompanyData {
  id: string;
  name: string;
  slug: string;
  email: string;
  nif: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  address?: string;
  phone?: string;
}

type SortBy = 'name' | 'email' | 'nif' | 'active';

// Helper: slugify
function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64);
}

const ListCompaniesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCopied, copy] = useCopyToClipboard();

  // ===== Context menu =====
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 260, height: 280 } });
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);

  // ===== Drawers & Dialogs =====
  const [createOpen, setCreateOpen] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCompanyForDelete, setSelectedCompanyForDelete] = useState<CompanyData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Deactivate confirm
  const [deactOpen, setDeactOpen] = useState(false);
  const [selectedCompanyForDeactivate, setSelectedCompanyForDeactivate] = useState<CompanyData | null>(null);
  const [deactLoading, setDeactLoading] = useState(false);

  // ===== Filtros (header) =====
  const [filters, setFilters] = useState<{
    companyId: 'all' | string;
    email: string;
    nif: string;
    active: 'all' | 'active' | 'inactive';
  }>({
    companyId: 'all',
    email: '',
    nif: '',
    active: 'all',
  });

  // ===== Ordenação =====
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // ===== Dados =====
  const { data: companies = [], isLoading, error } = useQuery<CompanyData[], Error>({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // Options empresas
  const companyOptions = useMemo(() => {
    return companies
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companies]);

  // ===== Mutations =====
  const activateDeactivateMutation = useMutation({
    mutationFn: activateDeactivateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDeactOpen(false);
      setSelectedCompanyForDeactivate(null);
      closeMenu();
    },
    onSettled: () => setDeactLoading(false),
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDeleteOpen(false);
      setSelectedCompanyForDelete(null);
    },
    onSettled: () => setDeleteLoading(false),
  });

  const createCompanyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: (res: any, vars: any) => {
      // Aceita { company } ou objeto direto
      const created = res?.company ?? res;
      const newId: string | undefined = created?.id;

      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', nif: '', slug: '' });

      if (newId) {
        toast.success('Empresa criada com sucesso. A redirecionar…');
        navigate(`/companies/edit/${newId}`, {
          state: { justCreated: true, companyName: vars?.name || created?.name || '' },
          replace: true,
        });
      } else {
        toast.error('Empresa criada, mas não foi possível obter o ID para redirecionar.');
      }
    },
    onError: (err: any) => {
      const msg = err?.message || 'Erro ao criar empresa.';
      toast.error(msg);
    },
  });

  // ===== Context menu handlers =====
  const handleRowContextMenu = (e: React.MouseEvent, company: CompanyData) => {
    e.preventDefault();
    setSelectedCompany(company);
    openAt(e.pageX, e.pageY);
  };

  const openMenuNearElement = (el: HTMLElement, company: CompanyData) => {
    const r = el.getBoundingClientRect();
    setSelectedCompany(company);
    openAt(r.right + window.scrollX, r.top + window.scrollY);
  };

  const handleActivateDeactivate = () => {
    if (!selectedCompany) return;
    if (selectedCompany.isActive) {
      setSelectedCompanyForDeactivate(selectedCompany);
      setDeactOpen(true);
    } else {
      setDeactLoading(true);
      activateDeactivateMutation.mutate({ companyId: selectedCompany.id, isActive: true });
    }
    closeMenu();
  };

  const handleDeactivateClick = () => {
    if (!selectedCompany) return;
    setSelectedCompanyForDeactivate(selectedCompany);
    setDeactOpen(true);
    closeMenu();
  };

  const handleDeleteCompanyClick = () => {
    if (!selectedCompany) return;
    setSelectedCompanyForDelete(selectedCompany);
    setDeleteOpen(true);
    closeMenu();
  };

  // ===== Filtros handlers =====
  const handleSelectChange = (name: 'companyId' | 'active', value: string) => {
    setFilters(prev => ({ ...prev, [name]: value as any }));
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ===== Ordenação handlers =====
  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };
  const sortIndicator = (column: SortBy) =>
    sortBy === column ? (sortOrder === 'ASC' ? '▲' : '▼') : '';

  // ===== Derived =====
  const filteredCompanies = useMemo(() => {
    const base = companies
      .filter(c => (filters.companyId === 'all' ? true : c.id === filters.companyId))
      .filter(c => (filters.email ? c.email.toLowerCase().includes(filters.email.toLowerCase()) : true))
      .filter(c => (filters.nif ? c.nif.toLowerCase().includes(filters.nif.toLowerCase()) : true))
      .filter(c =>
        filters.active === 'all' ? true : filters.active === 'active' ? c.isActive : !c.isActive
      );

    const arr = [...base];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'email': cmp = a.email.localeCompare(b.email); break;
        case 'nif': cmp = a.nif.localeCompare(b.nif); break;
        case 'active': cmp = a.isActive === b.isActive ? 0 : a.isActive ? 1 : -1; break;
        default: cmp = 0;
      }
      return sortOrder === 'ASC' ? cmp : -cmp;
    });

    return arr;
  }, [companies, filters, sortBy, sortOrder]);

  // ===== Colunas =====
  const columns: Column<CompanyData>[] = [
    { key: 'name',   header: 'Nome',   widthPct: COLS.name,   sortable: true },
    { key: 'email',  header: 'Email',  widthPct: COLS.email,  sortable: true },
    { key: 'nif',    header: 'NIF',    widthPct: COLS.nif,    sortable: true, className: 'font-mono text-xs' },
    {
      key: 'active', header: 'Ativa',  widthPct: COLS.active, sortable: true,
      render: (c) => (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-[10px] font-bold uppercase',
            c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
          )}
        >
          {c.isActive ? 'Ativa' : 'Inativa'}
        </span>
      )
    },
    {
      key: 'actions', header: <span className="sr-only">Ações</span>, widthPct: COLS.actions, align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end space-x-1">
          <span className="hidden md:inline-flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild title="Editar Empresa">
              <Link to={`/companies/edit/${c.id}`}><FilePenLine className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="icon" asChild title="Configurar Pagamentos">
              <Link to={`/companies/payment-config/${c.id}`}><CreditCard className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="icon" asChild title="Editar Homepage">
              <Link to={`/companies/homepage/edit/${c.id}`}><LayoutDashboard className="h-4 w-4" /></Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const url = `${window.location.protocol}//${c.slug}.${process.env.REACT_APP_MAIN_DOMAIN}${window.location.port ? ':' + window.location.port : ''}`;
                copy(url);
                toast.success('Link copiado!');
              }}
              title="Copiar Link Público"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" asChild title="Administradores">
              <Link to={`/company-admins/list/${c.id}`}><Users className="h-4 w-4" /></Link>
            </Button>
            {user?.role === UserRole.PLATFORM_ADMIN && (
              <Button variant="ghost" size="icon" asChild title="Configurar SMTP">
                <Link to={`/companies/smtp-config/${c.id}`}><Mail className="h-4 w-4" /></Link>
              </Button>
            )}
          </span>

          {/* Mobile: botão ⋮ abre o mesmo context menu */}
          <button
            className="md:hidden inline-flex p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Mais ações"
            onClick={(e) => openMenuNearElement(e.currentTarget as HTMLElement, c)}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      )
    },
  ];

  const total = companies.length;
  const visiveis = filteredCompanies.length;

  // ===== Estado do Form "Nova Empresa" =====
  const [createForm, setCreateForm] = useState({ name: '', email: '', nif: '', slug: '' });
  const firstCreateRef = useRef<HTMLInputElement>(null);

  // Regras base
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Debounce inputs para validação remota
  const debouncedSlug = useDebounce(createForm.slug.trim().toLowerCase(), 350);
  const debouncedNif = useDebounce(createForm.nif.trim(), 350);

  // Validações remotas (apenas quando drawer aberto e inputs “válidos”)
  const {
    data: slugResp,
    isFetching: checkingSlug,
  } = useQuery({
    queryKey: ['company-validate-slug', debouncedSlug],
    queryFn: () => checkCompanySlugExists(debouncedSlug),
    select: (d: any) => Boolean(d?.exists),
    enabled: createOpen && debouncedSlug.length > 0,
  });

  const nifIsLocallyValid = isValidPortugueseNIF(debouncedNif);

  const {
    data: nifResp,
    isFetching: checkingNif,
  } = useQuery({
    queryKey: ['company-validate-nif', debouncedNif],
    queryFn: () => checkCompanyNifExists(debouncedNif),
    select: (d: any) => Boolean(d?.exists),
    // 👉 só consulta o backend se o NIF passar a validação algorítmica
    enabled: createOpen && nifIsLocallyValid,
  });

  // Erros de formulário
  const createErrors = {
    name: !createForm.name.trim() ? 'Obrigatório' : '',
    email: !createForm.email.trim()
      ? 'Obrigatório'
      : (!emailRegex.test(createForm.email) ? 'Email inválido' : ''),
    nif: !createForm.nif.trim()
      ? 'Obrigatório'
      : (!isValidPortugueseNIF(createForm.nif.trim()) ? 'NIF inválido' : (nifResp ? 'NIF já em uso' : '')),
    slug: !createForm.slug.trim()
      ? 'Obrigatório'
      : (slugResp ? 'Slug já em uso' : ''),
  };

  const validCreate =
    Object.values(createErrors).every((e) => !e) &&
    !checkingSlug &&
    !checkingNif;
    
  const handleCreateSubmit = async () => {
    if (!validCreate || createCompanyMutation.isPending) return;
    await createCompanyMutation.mutateAsync({
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      nif: createForm.nif.trim(),
      slug: createForm.slug.trim().toLowerCase(),
    });
  };

  if (isLoading) return <div className="text-center p-6">A carregar empresas...</div>;
  if (error) return <div className="text-center p-6 text-red-500">Erro: {error.message}</div>;

  // ======= UI =======
  return (
    <>
      <ListPageTemplate<CompanyData>
        header={{
          icon: BriefcaseBusiness,
          title: 'Empresas',
          subtitle: 'Gestão de todas as empresas registadas no sistema.',
          actions: (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova Empresa
            </Button>
          ),
        }}

        filters={{
          colsTemplate: FILTER_GRID_TEMPLATE,
          children: (
            <>
              {/* Empresa */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Empresa</label>
                <Select
                  value={filters.companyId}
                  onValueChange={(value) => handleSelectChange('companyId', value)}
                >
                  <SelectTrigger className="h-8 w-full px-2">
                    <SelectValue placeholder="Selecionar empresa" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">Todas</SelectItem>
                    {companyOptions.map(({ id, name }) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Email</label>
                <Input
                  name="email"
                  placeholder="Pesquisar…"
                  value={filters.email}
                  onChange={handleInputChange}
                  className="h-8 px-2"
                />
              </div>

              {/* NIF */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">NIF</label>
                <Input
                  name="nif"
                  placeholder="Pesquisar…"
                  value={filters.nif}
                  onChange={handleInputChange}
                  className="h-8 px-2"
                />
              </div>

              {/* Ativa */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-600">Ativa</label>
                <Select
                  value={filters.active}
                  onValueChange={(value) => handleSelectChange('active', value)}
                >
                  <SelectTrigger className="h-8 w-full px-2">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="inactive">Inativas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Placeholder p/ alinhar com "Ações" */}
              <div />
            </>
          ),
        }}

        toolbar={
          <>
            <span>
              <strong>{visiveis}</strong> de {total} Empresas
            </span>
            <div className="flex items-center gap-2" />
          </>
        }

        table={{
          columns,
          data: filteredCompanies,
          rowKey: (c) => c.id,
          sortBy,
          sortOrder,
          onSort: (k) => {
            const key = (k as SortBy);
            if (['name', 'email', 'nif', 'active'].includes(key)) handleSort(key as SortBy);
          },
          onRowContextMenu: (e, row) => handleRowContextMenu(e as any, row as CompanyData),
          stickyHeader: true,
          emptyState: (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
              <BriefcaseBusiness className="w-10 h-10 text-brand-500/80" />
              <div>
                <p className="text-sm text-gray-700 font-medium">
                  Ainda não existem empresas com os filtros selecionados.
                </p>
                <p className="text-xs text-gray-500">
                  Ajuste os filtros ou crie uma nova empresa.
                </p>
              </div>
              <Button className="mt-1" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Criar empresa
              </Button>
            </div>
          ),
        }}
      />

      {/* ===== Drawer: Nova Empresa ===== */}
      <Drawer
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova Empresa"
        titleIcon={BriefcaseBusiness}
        subtitle="Crie um registo base; poderá completar os detalhes posteriormente."
        tone="brand"
        size="md"
        initialFocusRef={firstCreateRef}
        headerActions={
          // Exemplo: botão de ajuda — podes remover se não quiseres
          <a
            href="https://docs.geslogic.pt/empresas/criar"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-600 hover:text-brand-700 underline"
          >
            Ajuda
          </a>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createCompanyMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubmit} disabled={!validCreate || createCompanyMutation.isPending}>
              {createCompanyMutation.isPending ? 'A criar…' : 'Criar Empresa'}
            </Button>
          </>
        }
      >
        {/* Conteúdo do formulário (mesma lógica, layout mais agradável) */}
        <div className="space-y-6">
          {/* Nome */}
          <div className="grid gap-1.5">
            <Label htmlFor="company-name">Nome</Label>
            <Input
              id="company-name"
              ref={firstCreateRef}
              data-autofocus
              value={createForm.name}
              onChange={(e) => {
                const name = e.target.value;
                setCreateForm(prev => ({
                  ...prev,
                  name,
                  slug: prev.slug ? prev.slug : slugify(name),
                }));
              }}
              placeholder="Ex.: Clínica Central"
            />
            <div className="min-h-[18px]">
              {createErrors.name ? (
                <p className="text-xs text-red-600">{createErrors.name}</p>
              ) : (
                <p className="text-[11px] text-gray-500">Use um nome claro e reconhecível.</p>
              )}
            </div>
          </div>

          {/* Linha: Email + NIF */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="company-email">Email</Label>
              <Input
                id="company-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="geral@empresa.pt"
              />
              <div className="min-h-[18px]">
                {createErrors.email ? (
                  <p className="text-xs text-red-600">{createErrors.email}</p>
                ) : (
                  <p className="text-[11px] text-gray-500">&nbsp;</p>
                )}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="company-nif">NIF</Label>
              <Input
                id="company-nif"
                value={createForm.nif}
                onChange={(e) => setCreateForm(prev => ({ ...prev, nif: e.target.value }))}
                placeholder="123456789"
                className={createErrors.nif ? 'border-red-500' : ''}
              />
              <div className="min-h-[18px]">
                {createErrors.nif ? (
                  <p className="text-xs text-red-600">{createErrors.nif}</p>
                ) : checkingNif ? (
                  <p className="text-[11px] text-gray-500">A verificar NIF…</p>
                ) : (
                  <p className="text-[11px] text-gray-500">&nbsp;</p>
                )}
              </div>
            </div>
          </div>

          {/* Slug */}
          <div className="grid gap-1.5">
            <Label htmlFor="company-slug">Slug (subdomínio)</Label>
            <Input
              id="company-slug"
              value={createForm.slug}
              onChange={(e) => setCreateForm(prev => ({ ...prev, slug: slugify(e.target.value) }))}
              placeholder="clinica-central"
              className={createErrors.slug ? 'border-red-500' : ''}
            />
            <div className="space-y-1">
              <div className="min-h-[18px]">
                {createErrors.slug ? (
                  <p className="text-xs text-red-600">{createErrors.slug}</p>
                ) : checkingSlug ? (
                  <p className="text-[11px] text-gray-500">A verificar slug…</p>
                ) : (
                  <p className="text-[11px] text-gray-500">&nbsp;</p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                URL pública:{' '}
                <span className="font-mono">
                  https://{createForm.slug || 'subdominio'}.{process.env.REACT_APP_MAIN_DOMAIN}
                </span>
              </p>
            </div>
          </div>
        </div>
      </Drawer>

      {/* ===== Context Menu (portal) ===== */}
      {cm.open && selectedCompany && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          <Link
            to={`/companies/edit/${selectedCompany.id}`}
            className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/70 rounded-[6px] flex items-center gap-2"
            onClick={closeMenu}
          >
            <FilePenLine className="h-4 w-4" />
            Editar
          </Link>

          <Link
            to={`/companies/payment-config/${selectedCompany.id}`}
            className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/70 rounded-[6px] flex items-center gap-2"
            onClick={closeMenu}
          >
            <CreditCard className="h-4 w-4" />
            Config. Pagamentos
          </Link>

          <Link
            to={`/companies/homepage/edit/${selectedCompany.id}`}
            className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/70 rounded-[6px] flex items-center gap-2"
            onClick={closeMenu}
          >
            <LayoutDashboard className="h-4 w-4" />
            Editar página inicial
          </Link>

          <Link
            to={`/company-admins/list/${selectedCompany.id}`}
            className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/70 rounded-[6px] flex items-center gap-2"
            onClick={closeMenu}
          >
            <Users className="h-4 w-4" />
            Administradores
          </Link>

          {user?.role === UserRole.PLATFORM_ADMIN && (
            <Link
              to={`/companies/smtp-config/${selectedCompany.id}`}
              className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/70 rounded-[6px] flex items-center gap-2"
              onClick={closeMenu}
            >
              <Mail className="h-4 w-4" />
              Configurar SMTP
            </Link>
          )}

          {user?.role === UserRole.PLATFORM_ADMIN && (
            <>
              <div className="my-1 h-px bg-gray-800/60" />
              <button
                onClick={selectedCompany.isActive ? handleDeactivateClick : handleActivateDeactivate}
                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/70 rounded-[6px]"
              >
                {selectedCompany.isActive ? 'Desativar' : 'Ativar'}
              </button>
            </>
          )}

          {user?.role === UserRole.PLATFORM_ADMIN && (
            <>
              <div className="my-1 h-px bg-gray-800/60" />
              <ContextMenuItem danger onClick={handleDeleteCompanyClick}>
                Eliminar
              </ContextMenuItem>
            </>
          )}
        </ContextMenu>
      )}

      {/* ===== ConfirmDialog: Eliminar ===== */}
      <ConfirmDialog
        open={deleteOpen && !!selectedCompanyForDelete}
        title="Confirmar Eliminação"
        description={
          selectedCompanyForDelete
            ? <>Tem a certeza que deseja eliminar a empresa <strong>"{selectedCompanyForDelete.name}"</strong>? Esta ação é irreversível.</>
            : undefined
        }
        danger
        loading={deleteLoading || deleteCompanyMutation.isPending}
        requireCheckboxLabel="Compreendo que esta ação é irreversível e desejo continuar."
        onCancel={() => { if (!deleteLoading) setDeleteOpen(false); }}
        onConfirm={() => {
          if (!selectedCompanyForDelete) return;
          setDeleteLoading(true);
          deleteCompanyMutation.mutate(selectedCompanyForDelete.id);
        }}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* ===== ConfirmDialog: (Des)ativar ===== */}
      <ConfirmDialog
        open={deactOpen && !!selectedCompanyForDeactivate}
        title={selectedCompanyForDeactivate?.isActive ? 'Confirmar Desativação' : 'Confirmar Ativação'}
        description={
          selectedCompanyForDeactivate?.isActive
            ? <>Desativar a empresa <strong>"{selectedCompanyForDeactivate.name}"</strong> irá também desativar os administradores associados.</>
            : <>Pretende ativar a empresa <strong>"{selectedCompanyForDeactivate?.name}"</strong>?</>
        }
        danger={!!selectedCompanyForDeactivate?.isActive}
        loading={deactLoading || activateDeactivateMutation.isPending}
        requireCheckboxLabel={selectedCompanyForDeactivate?.isActive ? 'Compreendo as consequências e desejo continuar.' : undefined}
        onCancel={() => { if (!deactLoading) setDeactOpen(false); }}
        onConfirm={() => {
          if (!selectedCompanyForDeactivate) return;
          setDeactLoading(true);
          activateDeactivateMutation.mutate({
            companyId: selectedCompanyForDeactivate.id,
            isActive: !selectedCompanyForDeactivate.isActive,
          });
        }}
        confirmText={selectedCompanyForDeactivate?.isActive ? 'Desativar' : 'Ativar'}
        cancelText="Cancelar"
      />
    </>
  );
};

export default ListCompaniesPage;