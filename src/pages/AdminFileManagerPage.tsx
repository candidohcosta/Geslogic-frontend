// src/pages/AdminFileManagerPage.tsx
import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { UserRole } from '../types/user';
import { listDirectoryContents, FilesystemResponse, FilesystemItem } from '../services/api';
import { UtilityPageTemplate } from '../components/templates/UtilityPageTemplate';

const AdminFileManagerPage: React.FC = () => {
  const { user } = useAuth();

  const [currentPath, setCurrentPath] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const filesPerPage = 7;

  // Refs para sincronizar o scroll horizontal
  const breadcrumbScrollRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, error, refetch } = useQuery<FilesystemResponse, Error>({
    queryKey: ['adminFilesystem', currentPath, currentPage, filesPerPage],
    queryFn: () => listDirectoryContents(currentPath, currentPage, filesPerPage),
    enabled: !!currentPath,
  });

  // Sincroniza scroll horizontal
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
  }, [currentPath, data?.contents?.length, data?.totalPages]);

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

  const handlePageChange = (newPage: number) => setCurrentPage(newPage);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const segments = currentPath ? currentPath.split('/') : [];

  if (!user || user.role !== UserRole.PLATFORM_ADMIN) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <UtilityPageTemplate
      header={{
        icon: HardDrive,
        title: 'Gestor de Ficheiros do Sistema',
        subtitle: 'Navegue pelos ficheiros do sistema, identifique órfãos e audite o uso.',
        actions: (
          <Button onClick={() => refetch()} disabled={isLoading || currentPath === ''} variant="outline">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
        ),
      }}
      accent={{
        // opções (ex.: se tiveres toggles/selects passados em optionsBar)
        options: true,          // (default) igual ao teu FiltersArea
        secondary: false,       // ativa se quiseres acento na barra secundária
        content: true,          // 👈 acento no bloco principal
        contentPadding: false,  // 👈 false porque o children já é um <Card/>
        brandClassName: 'border-t-brand-500', // podes trocar por outra cor se quiseres
      }}      
      secondaryBar={
        currentPath !== '' ? (
          <>
            {/* Breadcrumb */}
            <div className="pb-2">
              <div className="bg-gray-50 p-2 rounded-lg border">
                <div ref={breadcrumbScrollRef} className="overflow-x-auto">
                  <div className="flex items-center gap-2 min-w-max">
                    {/* Raiz */}
                    <button
                      type="button"
                      className={`text-sm ${
                        currentPath === '' ? 'font-semibold text-gray-900' : 'text-blue-700 hover:underline'
                      }`}
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
                            <span className="text-sm font-semibold text-gray-900" title={pathUpTo}>
                              {seg}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="text-sm text-blue-700 hover:underline"
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

            {/* Labels de colunas + botão voltar */}
            <div className="bg-gray-50 rounded-lg border relative">
              <button
                type="button"
                onClick={handleGoBack}
                className="absolute left-2 top-1.5 inline-flex items-center justify-center rounded-md p-1 text-gray-600 hover:bg-gray-100"
                title="Voltar um nível"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div ref={headerScrollRef} className="overflow-x-auto">
                <table className="table-fixed">
                  <colgroup>
                    <col className="w-[520px]" />
                    <col className="w-[420px]" />
                    <col className="w-[120px]" />
                    <col className="w-[100px]" />
                    <col className="w-[480px]" />
                    <col className="w-[100px]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="px-6 py-3 pl-9 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        Nome no Disco
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        Nome Original
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        Tamanho
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        BD Ref.
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        Dono (Empresa)
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        Órfão?
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
            ) : data && data.contents.length === 0 ? (
              <p className="text-gray-500 italic p-4">Este diretório está vazio.</p>
            ) : (
              <>
                {/* Viewer com scroll horizontal (sincronizado com header) */}
                <div className="rounded-md border overflow-x-auto" ref={bodyScrollRef}>
                  <table className="table-fixed">
                    <colgroup>
                      <col className="w-[520px]" />
                      <col className="w-[420px]" />
                      <col className="w-[120px]" />
                      <col className="w-[100px]" />
                      <col className="w-[480px]" />
                      <col className="w-[100px]" />
                    </colgroup>

                    <thead className="sr-only">
                      <tr>
                        <th>Nome no Disco</th>
                        <th>Nome Original</th>
                        <th>Tamanho</th>
                        <th>BD Ref.</th>
                        <th>Dono (Empresa)</th>
                        <th>Órfão?</th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                      {data?.contents.map((item: FilesystemItem) => (
                        <tr
                          key={item.name}
                          className={`hover:bg-gray-50 ${item.isDirectory ? 'cursor-pointer' : ''}`}
                          onClick={() => item.isDirectory && handleOpenFolder(item.name)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2 max-w-[520px]">
                              {item.isDirectory ? (
                                <Folder className="h-5 w-5 text-blue-500" />
                              ) : (
                                <File className="h-5 w-5 text-gray-500" />
                              )}
                              <span className="truncate" title={item.name}>
                                {item.name}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span
                              className="truncate block max-w-[420px]"
                              title={item.dbReference?.displayName || '-'}
                            >
                              {item.dbReference?.displayName || '-'}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.isFile ? formatFileSize(item.size) : '-'}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.dbReference ? 'Sim' : 'Não'}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span
                              className="truncate block max-w-[480px]"
                              title={
                                item.dbReference
                                  ? `${item.dbReference.uploadedBy?.email} (${item.companySlug || (item.dbReference.uploadedBy?.role === UserRole.PLATFORM_ADMIN ? 'Plat. Admin' : 'Sistema')})`
                                  : '-'
                              }
                            >
                              {item.dbReference
                                ? `${item.dbReference.uploadedBy?.email} (${item.companySlug || (item.dbReference.uploadedBy?.role === UserRole.PLATFORM_ADMIN ? 'Plat. Admin' : 'Sistema')})`
                                : '-'}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.isOrphan ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3 mr-1" /> SIM
                              </span>
                            ) : (
                              'Não'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                {data && data.totalPages > 1 && (
                  <div className="flex justify-end items-center gap-2 pt-4">
                    <span className="text-sm text-gray-600">
                      Página {data.currentPage} de {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === data.totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}

                {data && data.totalFiles > 0 && data.totalPages <= 1 && (
                  <div className="flex justify-end items-center pt-4">
                    <span className="text-sm text-gray-600">
                      Total de {data.totalFiles} ficheiros neste diretório.
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </UtilityPageTemplate>
  );
};

export default AdminFileManagerPage;