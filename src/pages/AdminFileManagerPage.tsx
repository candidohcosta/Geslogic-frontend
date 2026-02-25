// src/pages/AdminFileManagerPage.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Loader2,
  Folder,
  File,
  HardDrive,
  AlertTriangle,
  RefreshCw,
  Database,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Download,
  FileJson,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Eye,
  X,
  Search,
} from 'lucide-react';
import { UserRole } from '../types/user';
import {
  listDirectoryContents,
  type FilesystemResponse,
  type FilesystemItem,
  deleteFsFileOrphan,     // api.ts
  getFsFileMetadata,      // api.ts
  downloadFsFile,         // api.ts
} from '../services/api';
import { UtilityPageTemplate } from '../components/templates/UtilityPageTemplate';
import { ConfirmDialog } from '../components/patterns/ConfirmDialog';

/* =========================
 * Helpers & hooks
 * ========================= */

// --- Helper para gerar iniciais a partir de email/nome (ex.: "joao.silva@empresa.com" -> "JS")
function getInitials(emailOrName?: string | null): string {
  if (!emailOrName) return '??';

  // Preferir a parte antes do @ se for email; caso contrário usa a string inteira
  const base = emailOrName.includes('@')
    ? emailOrName.split('@')[0] || emailOrName
    : emailOrName;

  // Normalizar e separar por espaços/pontos/underscore/hífens
  const cleaned = base.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  if (!cleaned) return '??';

  const parts = cleaned.split(/\s+/);
  const first = parts[0]?.charAt(0).toUpperCase() || '';
  const second = parts[1]?.charAt(0).toUpperCase() || '';

  // Se só houver uma parte, tenta apanhar a primeira letra depois de ponto (e.g. 'joao.silva' -> J S)
  if (!second && parts.length === 1) {
    const subParts = cleaned.split(/[._-]+/);
    const a = subParts[0]?.charAt(0).toUpperCase() || '';
    const b = subParts[1]?.charAt(0).toUpperCase() || '';
    return (a + b || a || '??').slice(0, 2);
  }

  const ini = (first + second).slice(0, 2);
  return ini || '??';
}

function formatDateTime(value: string | Date | null): string {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-PT');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/** Download helper */
async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Debounce hook (para valores genéricos) */
function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Context Menu minimalista */
interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  item: FilesystemItem | null;
}

/** Drawer de Preview */
type PreviewState = {
  open: boolean;
  item: FilesystemItem | null;
  url: string | null;
  mimeType: string | null;
  loading: boolean;
  error?: string;
};

const IMG_MIMES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];
const PDF_MIME = 'application/pdf';

/** Rótulo preferido quando não existe companySlug */
const PLATFORM_COMPANY_LABEL = 'Geslogic';

/* =========================
 * Página
 * ========================= */

const AdminFileManagerPage: React.FC = () => {
  const { user } = useAuth();

  const [currentPath, setCurrentPath] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const filesPerPage = 7; // paginação client-side

  // Refs para sincronizar o scroll horizontal
  const breadcrumbScrollRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);

  // Filtros (client-side) + pesquisa (debounced) + sort
  const [queryText, setQueryText] = useState('');
  const debouncedQuery = useDebounce(queryText, 350); // 3 chars + 350ms
  const [companyFilter, setCompanyFilter] = useState<'ALL' | string>('ALL');
  const [showOnlyDirs, setShowOnlyDirs] = useState(false);
  const [showOnlyFiles, setShowOnlyFiles] = useState(false);
  const [showOnlyOrphans, setShowOnlyOrphans] = useState(false);
  const [showOnlyWithDbRef, setShowOnlyWithDbRef] = useState(false);

  type SortKey = 'name' | 'displayName' | 'createdAt' | 'size' | 'hasDbRef' | 'owner' | 'isOrphan';
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // ===== IMPORTANTE: NUNCA retornar antes dos hooks. Guard calculado aqui:
  const isForbidden = !user || user.role !== UserRole.PLATFORM_ADMIN;

  // ===== Carregar TODAS as páginas do diretório (Opção B)
  type AllDirData = {
    contents: FilesystemItem[];
    totalFiles: number;      // do servidor (primeira página) se existir
    totalItems: number;      // idem
  };

  const AGG_PAGE_SIZE = 200; // pedir páginas grandes ao backend para reduzir nº de requests

  const fetchAllDirectory = async (): Promise<AllDirData> => {
    // 1) primeira página para saber totalPages
    const first: FilesystemResponse = await listDirectoryContents(currentPath, 1, AGG_PAGE_SIZE);
    const totalPages = first.totalPages ?? 1;

    if (totalPages <= 1) {
      return {
        contents: first.contents ?? [],
        totalFiles: first.totalFiles ?? (first.contents?.filter(i => i.isFile).length ?? 0),
        totalItems: first.totalItems ?? (first.contents?.length ?? 0),
      };
    }

    // 2) páginas restantes em paralelo
    const restPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const rest = await Promise.all(
      restPages.map((p) => listDirectoryContents(currentPath, p, AGG_PAGE_SIZE))
    );

    const allContents: FilesystemItem[] = [
      ...(first.contents ?? []),
      ...rest.flatMap(r => r.contents ?? []),
    ];

    return {
      contents: allContents,
      totalFiles: first.totalFiles ?? allContents.filter(i => i.isFile).length,
      totalItems: first.totalItems ?? allContents.length,
    };
  };

  const {
    data: agg,
    isLoading,
    error,
    refetch: refetchAll,
  } = useQuery<AllDirData, Error>({
    queryKey: ['adminFilesystem_all', currentPath],
    queryFn: fetchAllDirectory,
    enabled: !!currentPath && !isForbidden,
    staleTime: 30_000,
  });

  // Sincroniza scroll horizontal (breadcrumb ⇄ header ⇄ body)
  useEffect(() => {
    const els = [breadcrumbScrollRef.current, headerScrollRef.current, bodyScrollRef.current].filter(
      Boolean
    ) as HTMLDivElement[];
    if (els.length < 2) return;

    let syncing = false;
    const handlers = els.map((el) => {
      const onScroll = () => {
        if (syncing) return;
        syncing = true;
        const left = el.scrollLeft;
        els.forEach((other) => {
          if (other !== el) other.scrollLeft = left;
        });
        syncing = false;
      };
      el.addEventListener('scroll', onScroll, { passive: true });
      return { el, onScroll };
    });

    return () => {
      handlers.forEach(({ el, onScroll }) => el.removeEventListener('scroll', onScroll));
    };
  }, [currentPath, agg?.contents?.length]);

  const handleOpenFolder = (folderName: string) => {
    setCurrentPage(1);
    setCurrentPath((prev) => (prev ? `${prev}/${folderName}` : folderName));
  };

  const handleGoBack = () => {
    const pathParts = currentPath.split('/');
    if (pathParts.length > 1) {
      setCurrentPage(1);
      setCurrentPath(pathParts.slice(0, -1).join('/'));
    } else {
      setCurrentPath('');
    }
  };

  const segments = currentPath ? currentPath.split('/') : [];

  // ─────────────────────────────────────────────────────────
  // ELIMINAR ÓRFÃOS — estado e handlers
  // ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<FilesystemItem | null>(null);
  const [confirmOrphanOpen, setConfirmOrphanOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const runRefetchSafely = async () => {
    await refetchAll();
  };

  const handleConfirmDeleteOrphan = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFsFileOrphan(currentPath, deleteTarget.name);
      setConfirmOrphanOpen(false);
      setDeleteTarget(null);
      await runRefetchSafely();
    } catch (e: any) {
      alert(e?.message || 'Falha a eliminar ficheiro órfão.');
    } finally {
      setDeleting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // DOWNLOAD / PREVIEW
  // ─────────────────────────────────────────────────────────
  const handleDownload = async (item: FilesystemItem) => {
    if (item.isDirectory) return;
    try {
      const blob = await downloadFsFile(currentPath, item.name);
      await downloadBlob(blob, item.name);
    } catch (e: any) {
      alert(e?.message || 'Falha ao descarregar ficheiro.');
    }
  };

  const handleExportJson = async (item: FilesystemItem) => {
    if (item.isDirectory) return;
    try {
      const meta = await getFsFileMetadata(currentPath, item.name);
      if (meta?.disk?.fullPath) delete meta.disk.fullPath; // saneamento
      const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
      await downloadBlob(blob, `${item.name}.metadata.json`);
    } catch (e: any) {
      alert(e?.message || 'Falha ao obter metadata.');
    }
  };

  const [preview, setPreview] = useState<PreviewState>({
    open: false,
    item: null,
    url: null,
    mimeType: null,
    loading: false,
  });

  const closePreview = () =>
    setPreview({ open: false, item: null, url: null, mimeType: null, loading: false });

  const openPreview = async (item: FilesystemItem) => {
    if (item.isDirectory) return;
    const mimeGuess =
      item.dbReference?.mimeType ||
      (item.name.toLowerCase().endsWith('.pdf') ? PDF_MIME : null);

    setPreview({
      open: true,
      item,
      url: null,
      mimeType: mimeGuess,
      loading: true,
    });

    try {
      const blob = await downloadFsFile(currentPath, item.name);
      const url = URL.createObjectURL(blob);
      setPreview((p) => ({ ...p, url, loading: false }));
    } catch (e: any) {
      setPreview((p) => ({ ...p, loading: false, error: e?.message || 'Falha no preview.' }));
    }
  };

  useEffect(() => {
    return () => {
      if (preview.url) URL.revokeObjectURL(preview.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────
  // MENU DE CONTEXTO
  // ─────────────────────────────────────────────────────────
  const [ctx, setCtx] = useState<ContextMenuState>({ open: false, x: 0, y: 0, item: null });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const closeCtx = useCallback(() => {
    setCtx((prev) => ({ ...prev, open: false, item: null }));
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCtx(); };
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const menu = containerRef.current.querySelector('#file-ctx-menu');
      if (menu && !menu.contains(e.target as Node)) closeCtx();
    };
    document.addEventListener('keydown', onEsc);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.removeEventListener('mousedown', onClick);
    };
  }, [closeCtx]);

  const openContextMenu = (e: React.MouseEvent, item: FilesystemItem) => {
    e.preventDefault();
    const clickX = e.clientX;
    const clickY = e.clientY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuW = 220;
    const menuH = 8 * 40;
    const x = Math.min(clickX, vw - menuW - 8);
    const y = Math.min(clickY, vh - menuH - 8);
    setCtx({ open: true, x, y, item });
  };

  /** Meta derivada e segura para contagens */
  const totalFilesServer = agg?.totalFiles ?? 0;
  const allItems = agg?.contents ?? [];

  // Empresas a partir do conteúdo completo (companySlug), com fallback "Geslogic"
  const companyOptions = useMemo(() => {
    const set = new Set<string>();

    for (const it of allItems) {
      // ⚠️ ignorar órfãos para o dropdown de empresa
      if (!it.dbReference) continue;

      if (it.companySlug && it.companySlug.trim() !== '') {
        set.add(it.companySlug);
      } else {
        // ficheiro com dono (dbReference) mas sem slug => Plataforma/Sistema
        set.add(PLATFORM_COMPANY_LABEL); // "Geslogic"
      }
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'));
  }, [allItems]);

  // Pesquisa: só ativa quando >= 3 chars
  const normalizedQuery = useMemo(() => {
    const q = (debouncedQuery || '').trim();
    return q.length >= 3 ? q.toLowerCase() : '';
  }, [debouncedQuery]);

  // Filtragem sobre TODO O DIRETÓRIO (não apenas a página)
  const filtered = useMemo(() => {
    return allItems.filter((it) => {
      if (showOnlyDirs && !it.isDirectory) return false;
      if (showOnlyFiles && !it.isFile) return false;
      if (showOnlyOrphans && !it.isOrphan) return false;
      if (showOnlyWithDbRef && !it.dbReference) return false;

      if (companyFilter !== 'ALL') {
        // ✅ quando filtramos por empresa, órfãos ficam sempre de fora
        if (!it.dbReference) return false;

        const effectiveSlug =
          it.companySlug && it.companySlug.trim() !== ''
            ? it.companySlug
            : PLATFORM_COMPANY_LABEL; // "Geslogic" apenas para ficheiros COM dbRef

        if (effectiveSlug !== companyFilter) return false;
      }

      if (normalizedQuery) {
        const name = (it.name || '').toLowerCase();
        const display = (it.dbReference?.displayName || '').toLowerCase();
        if (!name.includes(normalizedQuery) && !display.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [
    allItems,
    showOnlyDirs,
    showOnlyFiles,
    showOnlyOrphans,
    showOnlyWithDbRef,
    companyFilter,
    normalizedQuery,
  ]);

  // Ordenação (client-side)
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getVal = (it: FilesystemItem) => {
      switch (sortBy) {
        case 'name': return (it.name || '').toLowerCase();
        case 'displayName': return (it.dbReference?.displayName || '').toLowerCase();
        case 'createdAt': return it.createdAt ? new Date(it.createdAt).getTime() : 0;
        case 'size': return it.size ?? 0;
        case 'hasDbRef': return it.dbReference ? 1 : 0;
        case 'owner': {
          const email = it.dbReference?.uploadedBy?.email || '';
          const slugLabel = (it.companySlug && it.companySlug.trim() !== '')
            ? it.companySlug
            : PLATFORM_COMPANY_LABEL;
          return (email || slugLabel).toLowerCase();
        }
        case 'isOrphan': return it.isOrphan ? 1 : 0;
        default: return 0;
      }
    };
    arr.sort((a, b) => {
      const v1 = getVal(a);
      const v2 = getVal(b);
      if (v1 < v2) return sortOrder === 'ASC' ? -1 : 1;
      if (v1 > v2) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortBy, sortOrder]);

  // Paginação client-side sobre a lista ordenada e filtrada
  const totalFiltered = sorted.length;
  const totalPagesClient = Math.max(1, Math.ceil(totalFiltered / filesPerPage));
  const startIdx = (currentPage - 1) * filesPerPage;
  const pageItems = sorted.slice(startIdx, startIdx + filesPerPage);

  // Reset de página quando filtros/sort/pesquisa mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [companyFilter, showOnlyDirs, showOnlyFiles, showOnlyOrphans, showOnlyWithDbRef, normalizedQuery, sortBy, sortOrder]);

  const onHeaderSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(key);
      setSortOrder('ASC');
    }
  };

  const SortIcon = ({ active }: { active: boolean }) =>
    active ? (sortOrder === 'ASC' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)
           : <span className="inline-block w-3.5 h-3.5 opacity-0" />;

  // ======== RENDER ========

  // ⚠️ Apenas aqui é permitido "sair" — sem violar regras dos hooks
  if (isForbidden) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <UtilityPageTemplate
      header={{
        icon: HardDrive,
        title: 'Gestor de Ficheiros do Sistema',
        subtitle: 'Navegue pelos ficheiros do sistema, identifique órfãos e audite o uso.',
        actions: (
          <Button onClick={() => refetchAll()} disabled={isLoading || currentPath === ''} variant="outline" aria-label="Atualizar">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
        ),
      }}
      accent={{ options: true, secondary: false, content: true, contentPadding: false }}
      secondaryBar={
        currentPath !== '' ? (
          <>
            {/* Breadcrumb */}
            <div className="pb-2">
              <div className="bg-gray-50 p-2 rounded-lg border">
                <div ref={breadcrumbScrollRef} className="overflow-x-auto max-w-full">
                  <div className="flex items-center gap-2 min-w-max px-1">
                    {/* Raiz */}
                    <button
                      type="button"
                      className={`text-sm ${currentPath === '' ? 'font-semibold text-gray-900' : 'text-blue-700 hover:underline'}`}
                      onClick={() => setCurrentPath('')}
                      title="/"
                    >
                      /
                    </button>

                    {/* Segmentos */}
                    {segments.map((seg, idx) => {
                      const pathUpTo = segments.slice(0, idx + 1).join('/');
                      const isLast = idx === segments.length - 1;
                      return (
                        <div key={pathUpTo} className="flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          {isLast ? (
                            <span className="text-sm font-semibold text-gray-900 truncate max-w-[220px]" title={pathUpTo}>
                              {seg}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="text-sm text-blue-700 hover:underline truncate max-w-[220px]"
                              onClick={() => setCurrentPath(pathUpTo)}
                              title={pathUpTo}
                            >
                              {seg}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros (client-side) + Pesquisa + Empresa */}
            <div className="bg-white border rounded-lg p-3 mb-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {/* Pesquisa (debounced, ativa com >=3 chars) */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                    <input
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="Pesquisar por nome no disco ou nome original… (mín. 3 chars)"
                      className="w-full pl-8 pr-3 h-9 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {normalizedQuery && (
                    <span className="text-[11px] text-gray-500 whitespace-nowrap">
                      {`A filtrar por “${normalizedQuery}”`}
                    </span>
                  )}
                </div>

                {/* Empresa (companySlug ou Geslogic) */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 w-[120px]">Empresa</label>
                  <select
                    className="h-9 text-sm border rounded-md px-2 flex-1"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value as 'ALL' | string)}
                  >
                    <option value="ALL">Todas</option>
                    {companyOptions.map(slug => (
                      <option key={slug} value={slug}>{slug}</option>
                    ))}
                  </select>
                </div>

                {/* Switches */}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showOnlyDirs}
                      onChange={(e) => { setShowOnlyDirs(e.target.checked); if (e.target.checked) setShowOnlyFiles(false); }}
                    />
                    Só diretórios
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showOnlyFiles}
                      onChange={(e) => { setShowOnlyFiles(e.target.checked); if (e.target.checked) setShowOnlyDirs(false); }}
                    />
                    Só ficheiros
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showOnlyOrphans}
                      onChange={(e) => setShowOnlyOrphans(e.target.checked)}
                    />
                    Só órfãos
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showOnlyWithDbRef}
                      onChange={(e) => setShowOnlyWithDbRef(e.target.checked)}
                    />
                    Só com BD Ref
                  </label>
                </div>
              </div>
            </div>

            {/* Header das colunas (sticky) + Voltar */}
            <div className="bg-white rounded-lg border relative">
              <button
                type="button"
                onClick={handleGoBack}
                className="absolute left-2 top-1.5 inline-flex items-center justify-center rounded-md p-1 text-gray-600 hover:bg-gray-100"
                title="Voltar um nível"
                aria-label="Voltar um nível"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div ref={headerScrollRef} className="overflow-x-auto max-w-full">
                <table className="w-full table-fixed min-w-[1200px]">
                  <colgroup>
                    <col className="w-[340px]" /> {/* Nome no Disco (sticky) */}
                    <col className="w-[240px]" />
                    <col className="w-[140px]" />
                    <col className="w-[110px]" />
                    <col className="w-[90px]" />
                    <col className="w-[300px]" />
                    <col className="w-[100px]" />
                    <col className="w-[140px]" />
                  </colgroup>
                  <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b">
                    <tr>
                      {/* th sticky (alinha com td sticky) */}
                      <th className="sticky left-0 z-30 bg-gray-50/95 px-6 py-3 pl-10 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider border-r">
                        <button className="inline-flex items-center gap-1" onClick={() => onHeaderSort('name')}>
                          Nome no Disco
                          <SortIcon active={sortBy === 'name'} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        <button className="inline-flex items-center gap-1" onClick={() => onHeaderSort('displayName')}>
                          Nome Original
                          <SortIcon active={sortBy === 'displayName'} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        <button className="inline-flex items-center gap-1" onClick={() => onHeaderSort('createdAt')}>
                          Data
                          <SortIcon active={sortBy === 'createdAt'} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        <button className="inline-flex items-center gap-1" onClick={() => onHeaderSort('size')}>
                          Tamanho
                          <SortIcon active={sortBy === 'size'} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        <button className="inline-flex items-center gap-1" onClick={() => onHeaderSort('hasDbRef')}>
                          BD Ref.
                          <SortIcon active={sortBy === 'hasDbRef'} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        <button className="inline-flex items-center gap-1" onClick={() => onHeaderSort('owner')}>
                          Dono (Empresa)
                          <SortIcon active={sortBy === 'owner'} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        <button className="inline-flex items-center gap-1" onClick={() => onHeaderSort('isOrphan')}>
                          Órfão?
                          <SortIcon active={sortBy === 'isOrphan'} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-600 uppercase tracking-wider pr-4">
                        Ações
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
          </>
        ) : null
      }
    >
      {/* ===== BODY ===== */}
      <div ref={containerRef} className="max-w-full overflow-x-hidden">
        {currentPath === '' ? (
          // Escolher diretório inicial
          <Card className="p-10 text-center space-y-4">
            <h3 className="text-base font-semibold leading-none">Selecione o Diretório de Auditoria</h3>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button onClick={() => handleOpenFolder('public')} className="bg-blue-600 hover:bg-blue-700">
                <Folder className="h-5 w-5 mr-2" /> Aceder /public
              </Button>
              <Button onClick={() => handleOpenFolder('backups_tenants')} className="bg-yellow-600 hover:bg-yellow-700">
                <Database className="h-5 w-5 mr-2" /> Aceder /backups_tenants
              </Button>
            </div>
          </Card>
        ) : (
          // Explorador de Ficheiros
          <Card className="overflow-hidden">
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-gray-500 mt-2">A carregar conteúdo...</p>
                </div>
              ) : error ? (
                <div className="text-red-600 p-4 bg-red-50 border border-red-200 rounded">
                  <p className="font-semibold">Erro ao carregar diretório:</p>
                  <p>{error.message}</p>
                </div>
              ) : allItems.length === 0 ? (
                <p className="text-gray-500 italic p-4">Este diretório está vazio.</p>
              ) : (
                <>
                  {/* Viewer com scroll horizontal (sincronizado com header) */}
                  <div className="rounded-md border overflow-x-auto max-w-full" ref={bodyScrollRef}>
                    <table className="w-full table-fixed min-w-[1200px]">
                      <colgroup>
                        <col className="w-[340px]" /> {/* sticky col */}
                        <col className="w-[240px]" />
                        <col className="w-[140px]" />
                        <col className="w-[110px]" />
                        <col className="w-[90px]" />
                        <col className="w-[300px]" />
                        <col className="w-[100px]" />
                        <col className="w-[140px]" />
                      </colgroup>

                      <thead className="sr-only">
                        <tr>
                          <th>Nome no Disco</th>
                          <th>Nome Original</th>
                          <th>Data</th>
                          <th>Tamanho</th>
                          <th>BD Ref.</th>
                          <th>Dono (Empresa)</th>
                          <th>Órfão?</th>
                          <th>Ações</th>
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y divide-gray-100">
                        {pageItems.map((item: FilesystemItem) => {
                          const onRowClick = () => item.isDirectory && handleOpenFolder(item.name);
                          const onRowContextMenu = (e: React.MouseEvent) => {
                            if (item.isDirectory) return;
                            openContextMenu(e, item);
                          };

                          // Owner info com label unificado (slug ou Geslogic)
                          const ownerEmail = item.dbReference?.uploadedBy?.email || '';
                          const ownerSlugLabel = (item.companySlug && item.companySlug.trim() !== '')
                            ? item.companySlug
                            : PLATFORM_COMPANY_LABEL;
                          const ownerDisplay = ownerEmail ? `${ownerEmail} (${ownerSlugLabel})` : '-';

                          return (
                            <tr
                              key={item.name}
                              className={`group hover:bg-gray-50 ${item.isDirectory ? 'cursor-pointer' : 'cursor-default'}`}
                              onClick={onRowClick}
                              onContextMenu={onRowContextMenu}
                            >
                              {/* Primeira coluna sticky */}
                              <td className="sticky left-0 z-10 bg-white border-r px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                <div className="flex items-center gap-2 max-w-[300px]">
                                  {item.isDirectory ? (
                                    <Folder className="h-4 w-4 text-blue-500 shrink-0" />
                                  ) : (
                                    <File className="h-4 w-4 text-gray-500 shrink-0" />
                                  )}
                                  <span className="truncate" title={item.name}>
                                    {item.name}
                                  </span>
                                </div>
                              </td>

                              {/* Nome original */}
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                <span className="truncate block max-w-[220px]" title={item.dbReference?.displayName || '-'}>
                                  {item.dbReference?.displayName || '-'}
                                </span>
                              </td>

                              {/* Data */}
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                {item.isFile ? formatDateTime(item.createdAt) : '-'}
                              </td>

                              {/* Tamanho */}
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                {item.isFile ? formatFileSize(item.size) : '-'}
                              </td>

                              {/* BD Ref */}
                              <td className="px-6 py-3 whitespace-nowrap text-sm">
                                {item.dbReference ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs text-green-700 border-green-200 bg-green-50">
                                    Sim
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs text-gray-600 border-gray-200">
                                    Não
                                  </span>
                                )}
                              </td>

                              {/* Dono (avatar sintético + texto) */}
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                                {ownerEmail ? (
                                  <div className="flex items-center gap-2 max-w-[280px]">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                      {getInitials(ownerEmail)}
                                    </div>
                                    <span className="truncate" title={ownerDisplay}>
                                      {ownerDisplay}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>

                              {/* Órfão? */}
                              <td className="px-6 py-3 whitespace-nowrap text-sm">
                                {item.isOrphan ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-800">
                                    <AlertTriangle className="h-3.5 w-3.5 mr-1" /> SIM
                                  </span>
                                ) : (
                                  <span className="text-gray-600">Não</span>
                                )}
                              </td>

                              {/* AÇÕES */}
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {!item.isDirectory && (
                                  <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                                    {/* Preview */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => { e.stopPropagation(); openPreview(item); }}
                                      aria-label="Pré-visualizar"
                                      title="Pré-visualizar"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>

                                    {/* Download */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                                      aria-label="Descarregar"
                                      title="Descarregar"
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>

                                    {/* JSON */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => { e.stopPropagation(); handleExportJson(item); }}
                                      aria-label="Exportar metadata JSON"
                                      title="Exportar metadata JSON"
                                    >
                                      <FileJson className="w-4 h-4" />
                                    </Button>

                                    {/* Eliminar órfão */}
                                    {item.isOrphan && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteTarget(item);
                                          setConfirmOrphanOpen(true);
                                        }}
                                        aria-label="Eliminar órfão"
                                        title="Eliminar órfão"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                      </Button>
                                    )}

                                    {/* … menu */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                        const x = rect.left;
                                        const y = rect.bottom + 4;
                                        setCtx({ open: true, x, y, item });
                                      }}
                                      aria-label="Mais ações"
                                      title="Mais ações"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação (client-side) */}
                  {totalPagesClient > 1 && (
                    <div className="flex justify-end items-center gap-2 pt-4">
                      <span className="text-sm text-gray-600">
                        Página {currentPage} de {totalPagesClient} — {totalFiltered} itens filtrados
                        {totalFilesServer ? ` (de ${totalFilesServer} ficheiros no diretório)` : ''}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPagesClient, p + 1))}
                        disabled={currentPage === totalPagesClient}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}

                  {totalPagesClient <= 1 && (
                    <div className="flex justify-end items-center pt-4">
                      <span className="text-sm text-gray-600">
                        Total de {totalFiltered} itens (filtrados)
                        {totalFilesServer ? ` — ${totalFilesServer} ficheiros no diretório.` : '.'}
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* MENU DE CONTEXTO */}
        {ctx.open && ctx.item && !ctx.item.isDirectory && (
          <div
            id="file-ctx-menu"
            className="fixed z-[60] min-w-[220px] rounded-md border bg-white shadow-xl py-1"
            style={{ left: `${ctx.x}px`, top: `${ctx.y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
              onClick={() => { handleDownload(ctx.item!); closeCtx(); }}
            >
              <Download className="w-4 h-4" /> Descarregar
            </button>
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
              onClick={() => { handleExportJson(ctx.item!); closeCtx(); }}
            >
              <FileJson className="w-4 h-4" /> Exportar JSON
            </button>
            {ctx.item.isOrphan && (
              <>
                <div className="my-1 border-t" />
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-red-50 text-red-700 flex items-center gap-2"
                  onClick={() => {
                    setDeleteTarget(ctx.item);
                    setConfirmOrphanOpen(true);
                    closeCtx();
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Eliminar (órfão)
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* PREVIEW DRAWER */}
      {preview.open && (
        <div className="fixed inset-0 z-[70] flex">
          <div className="flex-1 bg-black/40" onClick={closePreview} />
          <div className="w-full sm:w-[520px] md:w-[640px] lg:w-[720px] h-full bg-white shadow-2xl border-l p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0">
                <div className="text-sm text-gray-500">Pré-visualização</div>
                <div className="font-semibold truncate" title={preview.item?.name}>{preview.item?.name}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={closePreview} aria-label="Fechar">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 border rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
              {preview.loading ? (
                <div className="flex flex-col items-center justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-sm text-gray-500 mt-2">A preparar preview…</div>
                </div>
              ) : preview.error ? (
                <div className="text-center text-sm text-red-600 p-4">{preview.error}</div>
              ) : preview.url ? (
                IMG_MIMES.includes(preview.mimeType || '') ? (
                  <img src={preview.url} alt="preview" className="max-w-full max-h-full object-contain" />
                ) : (preview.mimeType === PDF_MIME) ? (
                  <iframe src={preview.url} title="PDF" className="w-full h-full" />
                ) : (
                  <div className="p-6 text-sm text-gray-600 text-center">
                    Pré-visualização não suportada. Pode descarregar o ficheiro ou ver o JSON de metadata.
                  </div>
                )
              ) : (
                <div className="p-6 text-sm text-gray-600">Sem conteúdo para mostrar.</div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Tipo: {preview.mimeType || (preview.item?.dbReference?.mimeType || '-') }
              </div>
              <div className="flex items-center gap-2">
                {preview.item && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => preview.item && handleDownload(preview.item)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descarregar
                    </Button>
                    {!preview.item.isDirectory && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => preview.item && handleExportJson(preview.item)}
                      >
                        <FileJson className="w-4 h-4 mr-2" />
                        Metadata JSON
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Eliminar Órfão */}
      <ConfirmDialog
        open={confirmOrphanOpen}
        title="Eliminar ficheiro órfão"
        description={
          <>
            <p>Vai eliminar permanentemente o ficheiro do disco:</p>
            <p className="mt-1 font-mono text-sm">{deleteTarget?.name}</p>
            <p className="mt-2 text-xs text-gray-500">
              Esta operação remove apenas do disco. Não existem registos na base de dados associados.
            </p>
          </>
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger
        loading={deleting}
        onConfirm={handleConfirmDeleteOrphan}
        onCancel={() => { setConfirmOrphanOpen(false); setDeleteTarget(null); }}
      />
    </UtilityPageTemplate>
  );
};

export default AdminFileManagerPage;