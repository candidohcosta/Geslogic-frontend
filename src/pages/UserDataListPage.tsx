// frontend/src/pages/UserDataListPage.tsx
// REORGANIZADA COM ListPageTemplate + Context Menu (padrão OperatorsListPage)

import React, { useState, useMemo, useRef } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUserTypeById,
  fetchUserData,
  uploadUserDataCsv,
  deleteUserData,
} from '../services/api';
import { UserRole } from '../types/user';

import { Page } from '../components/layout/Page';
import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column } from '../components/templates/types';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Download, Upload, PlusCircle, Edit, Trash2, ArrowLeft,
  Users
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';

// 🟦 Context menu (mesmo padrão do OperatorsListPage)
import { useContextMenu } from '../components/context-menu/useContextMenu';
import ContextMenu from '../components/context-menu/ContextMenu';
import { ContextMenuItem } from '../components/context-menu/ContextMenuItem';

// ---- Tipos locais (compatíveis com a tua API) ----
interface FieldDefinition { id: string; fieldName: string; }
interface FieldValue { fieldDefinition: { id: string }, value: string }
interface UserDataItem { id: string; fieldValues: FieldValue[]; }
interface UserTypeDetails {
  id: string;
  name: string;
  fieldDefinitions: FieldDefinition[];
}

const UserDataListPage: React.FC = () => {
  const { userTypeId } = useParams<{ userTypeId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ===== Estado =====
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [dataToDelete, setDataToDelete] = useState<UserDataItem | null>(null);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [filterText, setFilterText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ===== Queries =====
  const { data: userTypeDetails, isLoading: isLoadingType } = useQuery<UserTypeDetails>({
    queryKey: ['userType', userTypeId],
    queryFn: () => fetchUserTypeById(userTypeId!),
    enabled: !!userTypeId,
  });

  const { data: userData = [], isLoading: isLoadingData } = useQuery<UserDataItem[], Error>({
    queryKey: ['userData', userTypeId],
    queryFn: () => fetchUserData(userTypeId!),
    enabled: !!userTypeId,
  });

  // ===== Mutations =====
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadUserDataCsv(userTypeId!, file),
    onSuccess: (result: any) => {
      setImportSummary(result);
      queryClient.invalidateQueries({ queryKey: ['userData', userTypeId] });
      setFileToUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error) => {
      setImportSummary({ errors: [{ line: 'N/A', message: (error as Error).message }] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUserData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData', userTypeId] });
      setDataToDelete(null);
    },
  });

  // ===== Handlers =====
  const handleTriggerFile = () => {
    fileInputRef.current?.click();
  };

  const handleSelectedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileToUpload(f);
  };

  const handleUpload = () => {
    if (fileToUpload) uploadMutation.mutate(fileToUpload);
  };

  const handleExport = () => {
    if (!userTypeDetails) return;
    const headers = userTypeDetails.fieldDefinitions.map((def) => def.fieldName);

    // Construir CSV com BOM e linhas
    const BOM = '\uFEFF';
    const rows = [headers.join(',')];

    userData.forEach((item) => {
      const line = headers.map((h) => {
        const def = userTypeDetails.fieldDefinitions.find(d => d.fieldName === h);
        const val = def
          ? (item.fieldValues.find(fv => fv.fieldDefinition.id === def.id)?.value ?? '')
          : '';
        // Escapar aspas e separar com vírgula
        const safe = String(val).replace(/"/g, '""');
        return `"${safe}"`;
      }).join(',');
      rows.push(line);
    });

    const blob = new Blob([BOM + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const base = userTypeDetails?.name?.replace(/\s+/g, '_').toLowerCase() || 'utentes';
    link.download = `export_${base}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDeleteClick = (dataItem: UserDataItem) => setDataToDelete(dataItem);
  const handleConfirmDelete = () => dataToDelete && deleteMutation.mutate(dataToDelete.id);

  // ===== Filtro rápido (texto em qualquer campo visível) =====
  const filtered = useMemo(() => {
    if (!filterText.trim()) return userData;
    const t = filterText.toLowerCase();
    return userData.filter((item) => {
      return item.fieldValues.some(fv => String(fv.value ?? '').toLowerCase().includes(t));
    });
  }, [userData, filterText]);

  // ===== Colunas dinâmicas =====
  const columns: Column<UserDataItem>[] = useMemo(() => {
    const defs = userTypeDetails?.fieldDefinitions ?? [];
    const cols: Column<UserDataItem>[] = defs.map((def) => ({
      key: def.id,
      header: def.fieldName,
      widthPct: Math.max(10, Math.floor(60 / Math.max(1, defs.length))), // distribuição simples
      sortable: false,
      render: (row) => row.fieldValues.find(fv => fv.fieldDefinition.id === def.id)?.value ?? '',
    }));

    // Coluna Ações (mantida)
    cols.push({
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      widthPct: 20,
      align: 'right',
      render: (row) => (
        <div className="flex justify-end items-center gap-1">
          <Button asChild variant="ghost" size="icon" title="Editar Ficha">
            <Link to={`/user-data/edit/${row.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:text-red-700"
            title="Apagar Ficha"
            onClick={() => handleDeleteClick(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    });

    return cols;
  }, [userTypeDetails, userData]);

  // ===== Context Menu (mesmo padrão do OperatorsListPage) =====
  const { state: cm, openAt, close: closeMenu } = useContextMenu({ estimatedSize: { width: 240, height: 120 } });
  const [selectedRow, setSelectedRow] = useState<UserDataItem | null>(null);

  const openContext = (e: React.MouseEvent, row: UserDataItem) => {
    e.preventDefault();
    // guarda a linha selecionada e abre na posição atual do rato
    setSelectedRow(row);
    openAt(e.pageX, e.pageY);
  };

  // ===== Permissões =====
  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  if (isLoadingType) return <p className="px-4 py-6">A carregar tipo de utente...</p>;

  // ===== Layout com ListPageTemplate =====
  return (
    <Page>
      <ListPageTemplate<UserDataItem>
        header={{
          icon: Users, // ícone só para consistência visual (o botão Voltar está ao lado)
          title: `Gestão de Utentes — ${userTypeDetails?.name}`,
          subtitle: 'Importe, visualize e gere as fichas de utente para este tipo.',
          actions: (
            <div className="flex items-center gap-2">
              {/* Importar */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleSelectedFile}
              />
              <Button
                variant="outline"
                onClick={handleTriggerFile}
                title="Importar CSV"
                className="inline-flex items-center gap-2"
              >
                <Upload className="h-4 w-4" /> Importar CSV
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!fileToUpload || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'A importar…' : 'Processar CSV'}
              </Button>

              {/* Exportar */}
              <Button
                variant="outline"
                onClick={handleExport}
                title="Exportar CSV"
                className="inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>

              {/* Adicionar Utente */}
              <Button asChild>
                <Link to={`/user-data/new?userTypeId=${userTypeId}`}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Utente
                </Link>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                title="Voltar"
                className="inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
            </div>
          ),
        }}

        // Filtros simples (texto livre)
        filters={{
          colsTemplate: '1fr',
          children: (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-600">Pesquisar</label>
              <Input
                placeholder="Procurar em qualquer campo visível…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="h-8 px-2"
              />
            </div>
          ),
        }}

        // Toolbar com contagem
        toolbar={
          <>
            <span>
              <strong>{filtered.length}</strong> de {userData.length} fichas
            </span>
            <div className="flex items-center gap-2" />
          </>
        }

        table={{
          columns,
          data: filtered,
          rowKey: (row) => row.id,
          stickyHeader: true,
          emptyState: (
            <div className="py-10 text-center text-sm text-gray-700">
              Não foram encontradas fichas para este tipo.
            </div>
          ),
          // 👇 Right-click em qualquer ponto da linha abre o contexto nessa posição
          onRowContextMenu: (e, row) => openContext(e as React.MouseEvent, row as UserDataItem),
        }}
      />

      {/* ===== Context Menu (Editar / Apagar) ===== */}
      {cm.open && selectedRow && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={closeMenu}>
          <ContextMenuItem
            onClick={() => {
              navigate(`/user-data/edit/${selectedRow.id}`);
              closeMenu();
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Edit className="w-4 h-4" /> Editar ficha
            </span>
          </ContextMenuItem>

          <ContextMenuItem
            danger
            onClick={() => {
              setDataToDelete(selectedRow);
              closeMenu();
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Apagar ficha
            </span>
          </ContextMenuItem>
        </ContextMenu>
      )}

      {/* ===== Modal: Confirmar Eliminação ===== */}
      {dataToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>Tem a certeza que deseja apagar esta ficha?</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">Esta ação não pode ser revertida.</p>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setDataToDelete(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'A Apagar...' : 'Apagar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ===== Modal: Sumário de Importação ===== */}
      {importSummary && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Resultado da Importação</CardTitle>
              <CardDescription>O ficheiro foi processado com os seguintes resultados:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-gray-100 rounded"><strong>Total Linhas:</strong> {importSummary.totalRows ?? 0}</div>
                <div className="p-2 bg-green-100 rounded"><strong>Criados:</strong> {importSummary.created ?? 0}</div>
                <div className="p-2 bg-blue-100 rounded"><strong>Atualizados:</strong> {importSummary.updated ?? 0}</div>
                <div className="p-2 bg-yellow-100 rounded"><strong>Ignorados:</strong> {importSummary.skipped ?? 0}</div>
              </div>

              {importSummary.errors && importSummary.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Detalhes dos Erros:</h4>
                  <div className="space-y-1 text-sm text-red-700 max-h-48 overflow-y-auto border p-2 rounded">
                    {importSummary.errors.map((err: any, idx: number) => (
                      <p key={idx}><strong>Linha {err.line}:</strong> {err.message}</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={() => setImportSummary(null)}>Fechar</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </Page>
  );
};

export default UserDataListPage;