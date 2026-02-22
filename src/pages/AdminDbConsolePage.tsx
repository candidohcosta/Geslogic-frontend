// frontend/src/pages/AdminDbConsolePage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import {
  Loader2,
  Database,
  Play,
  HelpCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  WrapText,
  Minus,
  Download,
} from 'lucide-react';
import { UserRole } from '../types/user';
import { executeSqlQuery, DbQueryResult, fetchTableList, TableListResponse } from '../services/api';
import { UtilityPageTemplate } from '../components/templates/UtilityPageTemplate';

const PAGE_SIZES = [25, 50, 100];

const AdminDbConsolePage: React.FC = () => {
  const { user } = useAuth();

  const [sqlQuery, setSqlQuery] = useState('SELECT id, name, slug FROM companies LIMIT 10;');

  const [results, setResults] = useState<any[] | null>(null);
  const [rawData, setRawData] = useState<any | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [wrapMode, setWrapMode] = useState<'wrap' | 'nowrap'>('wrap'); // <- Toggle Linha/Quebra
  const [error, setError] = useState<string | null>(null);

  // Paginação client-side
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  // Modal “Ver Tabelas” (carrega apenas quando abre)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const { data: tableData, isLoading: isTableLoading } = useQuery<TableListResponse, Error>({
    queryKey: ['dbTables'],
    queryFn: fetchTableList,
    enabled: isHelpModalOpen,
  });

  useEffect(() => {
    setPage(1);
  }, [results, pageSize]);

  // --- Normalizador de resposta (aceita { result }, { rows }, { columns, rows }, array direto…) ---
  function coerceToRows(data: any): any[] {
    if (!data) return [];

    // 1) { result: [...] } OU { result: { rows|data|columns+rows } }
    if (data?.result) {
      if (Array.isArray(data.result)) return data.result;
      if (Array.isArray(data.result?.rows)) return data.result.rows;
      if (Array.isArray(data.result?.data)) return data.result.data;
      if (Array.isArray(data.result?.columns) && Array.isArray(data.result?.rows)) {
        const cols: string[] = data.result.columns;
        const rowsArr: any[][] = data.result.rows;
        return rowsArr.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
      }
    }

    // 2) { rows: [...] } OU { data: [...] }
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.data)) return data.data;

    // 3) { columns: [...], rows: [...] }
    if (Array.isArray(data?.columns) && Array.isArray(data?.rows)) {
      const cols: string[] = data.columns;
      const rowsArr: any[][] = data.rows;
      return rowsArr.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
    }

    // 4) array direto
    if (Array.isArray(data)) return data;

    // 5) objeto único → embrulhar
    if (typeof data === 'object') return [data];

    return [];
  }

  // Execução da query (apenas SELECT)
  const executeMutation = useMutation<DbQueryResult, Error, string>({
    mutationFn: (sql: string) => executeSqlQuery(sql),
    onSuccess: (data) => {
      setRawData(data);
      const rows = coerceToRows(data);
      setResults(rows);
      setError(null);
    },
    onError: (err) => {
      setResults(null);
      setRawData(null);
      setError(err.message || 'Erro desconhecido ao executar a query.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowRaw(false);

    // Aceita SELECT e CTEs (WITH ... SELECT), ignorando comentários iniciais (-- … e /* … */)
    const onlySelectRegex = /^\s*(?:--.*\n|\/\*[\s\S]*?\*\/\s*)*(with\b[\s\S]*?select\b|select\b)/i;
    if (!onlySelectRegex.test(sqlQuery)) {
      setError("Apenas queries 'SELECT' (ou CTEs que terminem em SELECT) são permitidas.");
      return;
    }

    const normalized = sqlQuery.trim().replace(/;+\s*$/, ''); // remove ; finais
    executeMutation.mutate(normalized);
  };

  // Cabeçalhos (união das chaves das primeiras 50 linhas por performance)
  const headers = useMemo(() => {
    const data = results ?? [];
    if (!Array.isArray(data) || data.length === 0) return [];
    if (typeof data[0] === 'object' && data[0] !== null) {
      const keys = new Set<string>();
      data.slice(0, 50).forEach((row) => Object.keys(row || {}).forEach((k) => keys.add(k)));
      return Array.from(keys);
    }
    return ['valor'];
  }, [results]);

  // Paginação client-side
  const total = results?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = total === 0 ? 0 : Math.min(page * pageSize, total);
  const pageRows = useMemo(
    () => (results ?? []).slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [results, page, pageSize]
  );

  // Export CSV (todas as linhas)
  const exportCsv = () => {
    const rows = results ?? [];
    if (!rows.length) return;

    const cols = headers.length ? headers : Object.keys(rows[0] ?? {});
    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      let s = typeof val === 'object' ? JSON.stringify(val) : String(val);
      // normaliza quebras de linha e aspas
      s = s.replace(/\r?\n/g, ' ').replace(/"/g, '""');
      // envolver em aspas se contiver delimitadores
      if (/[",;\t]/.test(s)) s = `"${s}"`;
      return s;
    };

    const headerLine = cols.map(escape).join(',');
    const lines = rows.map((r) => cols.map((c) => escape((r as any)[c])).join(','));
    const csv = [headerLine, ...lines].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileBase = (sqlQuery.split(/\s+/).slice(0, 3).join('_') || 'query').replace(/[^\w\-]+/g, '_');
    a.href = url;
    a.download = `${fileBase}_result.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyRaw = async () => {
    if (!rawData) return;
    const text = JSON.stringify(rawData, null, 2);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback para contexts sem permissões de clipboard
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      // noop
    }
  };

  // Classes dinâmicas da tabela conforme “Linha/Quebra”
  const tableClass =
    wrapMode === 'wrap'
      ? 'min-w-full table-fixed divide-y divide-gray-200' // quebra: ocupa largura do contentor e permite wrap
      : 'w-max table-auto divide-y divide-gray-200';      // uma linha: mede conteúdo e activa scroll X

  const cellClass =
    wrapMode === 'wrap'
      ? 'whitespace-pre-wrap break-words'                 // mostra tudo com quebras
      : 'whitespace-nowrap overflow-hidden text-ellipsis';// compacta numa linha com reticências

  // Apenas Platform Admin pode aceder
  if (!user || user.role !== UserRole.PLATFORM_ADMIN) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <UtilityPageTemplate
      header={{
        icon: Database,
        title: 'Console SQL (Admin)',
        subtitle: (
          <>
            Execute queries SQL diretamente na base de dados (apenas <code className="font-mono">SELECT</code> por
            segurança).
          </>
        ),
        actions: (
          <Button variant="outline" onClick={() => setIsHelpModalOpen(true)}>
            <HelpCircle className="h-4 w-4 mr-2" /> Ver Tabelas
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
    >
      {/* ⚠️ Cadeia flex com min-w-0 para permitir shrink (senão “rebenta” e o scroll interno não aparece) */}
      <div className="h-full min-h-0 min-w-0">
        <Card className="h-full min-w-0 flex flex-col overflow-hidden">
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-lg">Executar Query SQL</CardTitle>
            <CardDescription>
              Insira a sua query <code className="font-mono">SELECT</code>. Resultados são mostrados abaixo.
            </CardDescription>
          </CardHeader>

          {/* GRID: 1) editor, 2) toolbar (erros/paginação), 3) resultados (1fr) */}
          <CardContent className="flex-1 min-h-0 min-w-0 grid grid-rows-[auto_auto_1fr] gap-4 px-6 pt-4 pb-6">
            {/* Editor + barra de ações (linha 1) */}
            <form onSubmit={handleSubmit} className="grid grid-rows-[auto_auto] gap-3 min-w-0">
              <Textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                minRows={3}
                maxRows={12}
                placeholder="Ex: SELECT * FROM users WHERE company_id = '...' LIMIT 10;"
                className="font-mono leading-6"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    const fakeEvt = { preventDefault() {} } as React.FormEvent;
                    handleSubmit(fakeEvt);
                  }
                }}
              />

              {/* Barra sticky do botão no fundo do Card */}
              <div
                className="
                  sticky bottom-0 left-0
                  -mx-6 -mb-6 px-6 pb-4 pt-2
                  bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60
                  border-t z-20
                "
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={executeMutation.isPending || !sqlQuery.trim()}>
                    {executeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A Executar...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" /> Executar SELECT
                      </>
                    )}
                  </Button>

                  {/* Ferramentas JSON + Toggle de Quebra + Export CSV */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRaw((v) => !v)}
                    title={showRaw ? 'Ocultar JSON' : 'Ver JSON'}
                    disabled={!rawData}
                  >
                    {showRaw ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showRaw ? 'Ocultar JSON' : 'Ver JSON'}
                  </Button>

                  <Button type="button" variant="outline" onClick={copyRaw} title="Copiar JSON" disabled={!rawData}>
                    <Copy className="h-4 w-4 mr-2" /> Copiar JSON
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWrapMode((m) => (m === 'wrap' ? 'nowrap' : 'wrap'))}
                    title={wrapMode === 'wrap' ? 'Uma linha por célula' : 'Quebra de linha por célula'}
                    disabled={!results || results.length === 0}
                  >
                    {wrapMode === 'wrap' ? (
                      <>
                        <Minus className="h-4 w-4 mr-2" /> Uma linha
                      </>
                    ) : (
                      <>
                        <WrapText className="h-4 w-4 mr-2" /> Quebra
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={exportCsv}
                    title="Exportar CSV (todas as linhas)"
                    disabled={!results || results.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" /> Exportar CSV
                  </Button>
                </div>
              </div>
            </form>

            {/* Erros (linha 2 top, quando existem) */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex gap-2">
                <AlertTriangle className="h-5 w-5 mt-[2px]" />
                <div>
                  <p className="font-semibold">Erro na Query:</p>
                  <p className="font-mono text-sm break-all">{error}</p>
                </div>
              </div>
            )}

            {/* Toolbar de resultados (contagens + paginação) — linha 2 (se não houver erro) */}
            {!error && (
              <div className="px-3 py-2 text-xs sm:text-sm text-gray-700 border rounded-md bg-gray-50 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  {results == null
                    ? 'Pronto para executar.'
                    : (
                      <>
                        A mostrar <b>{startIdx}</b>–<b>{endIdx}</b> de <b>{total}</b> registos
                      </>
                    )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>{n} / página</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(1)}
                      title="Primeira"
                    >
                      «
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      title="Anterior"
                    >
                      ‹
                    </Button>

                    <span className="px-2">
                      Página <b>{Math.min(page, totalPages)}</b> / {totalPages}
                    </span>

                    <Button
                      variant="outline" size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      title="Próxima"
                    >
                      ›
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(totalPages)}
                      title="Última"
                    >
                      »
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* RESULTADOS (linha 3 = 1fr, com overflow próprio) */}
            <div className="min-h-0 min-w-0 rounded-md border overflow-hidden">
              <div className="h-full w-full min-w-0 overflow-y-auto">
                <div className="w-full min-w-0 overflow-x-auto">
                  {!results ? (
                    <div className="p-6 text-sm text-gray-500">
                      Escreva uma query <code className="font-mono">SELECT</code> e clique em <b>Executar</b>.
                    </div>
                  ) : pageRows.length === 0 ? (
                    <div className="p-6 text-gray-500 italic">Nenhum resultado encontrado nesta página.</div>
                  ) : (
                    <table className={tableClass}>
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          {headers.map((header) => (
                            <th
                              key={header}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider bg-gray-50 whitespace-nowrap"
                              title={header}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y divide-gray-200">
                        {pageRows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="align-top">
                            {headers.length > 1 || (typeof row === 'object' && row !== null) ? (
                              headers.map((h, colIndex) => (
                                <td
                                  key={`${rowIndex}-${colIndex}`}
                                  className={`px-4 py-2 text-sm text-gray-800 font-mono ${cellClass}`}
                                >
                                  {(() => {
                                    const value = (row as any)?.[h];
                                    return typeof value === 'object' && value !== null
                                      ? JSON.stringify(value, null, 2)
                                      : String(value ?? '');
                                  })()}
                                </td>
                              ))
                            ) : (
                              <td className={`px-4 py-2 text-sm text-gray-800 font-mono ${cellClass}`}>
                                {String(row)}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* JSON bruto (debug/útil) */}
                  {showRaw && rawData && (
                    <div className="p-4">
                      <pre className="text-xs bg-gray-900 text-green-200 p-3 rounded overflow-x-auto">
{JSON.stringify(rawData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== MODAL “VER TABELAS” ===== */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Tabelas da Base de Dados</CardTitle>
              <CardDescription>Lista de todas as entidades mapeadas pelo TypeORM.</CardDescription>
            </CardHeader>
            <CardContent>
              {isTableLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> A carregar tabelas...
                </div>
              ) : tableData && tableData.tables && tableData.tables.length > 0 ? (
                <div className="max-h-80 overflow-y-auto border p-2 rounded">
                  <ul className="space-y-1">
                    {tableData.tables.map((tableName) => (
                      <li
                        key={tableName}
                        className="text-sm font-mono p-1 bg-gray-50 rounded hover:bg-gray-100"
                      >
                        {tableName}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhuma tabela encontrada ou erro na resposta.</p>
              )}
            </CardContent>
            <CardHeader className="pt-0 border-t mt-4 flex justify-end">
              <Button variant="default" onClick={() => setIsHelpModalOpen(false)}>
                Fechar
              </Button>
            </CardHeader>
          </Card>
        </div>
      )}
    </UtilityPageTemplate>
  );
};

export default AdminDbConsolePage;