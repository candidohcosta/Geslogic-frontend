// src/pages/SystemHealthPage.tsx
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  checkFileSystemConsistency,
  cleanOrphanFiles,
  cleanOrphanRecords,
  cleanFunctionallyOrphanRecords,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Loader2,
  ShieldCheck as ShieldCheckIcon,
  ShieldAlert,
  RefreshCw,
  HardDrive,
  Database,
  Activity,
  Cpu,
  MailWarning,
  Copy,
  EyeOff,
  Eye,
  X,
  ShieldCheck,
} from 'lucide-react';
import { UserRole } from '../types/user';
import { UtilityPageTemplate } from '../components/templates/UtilityPageTemplate';

// --- INTERFACES ---
interface OrphanRecord {
  id: string;
  displayName: string;
  storageFileName: string;
  uploadedBy: string;
}

interface ConsistencyCheckResult {
  diskCheck: { totalFiles: number; orphanCount: number; orphanFiles: string[] };
  databaseCheck: { totalRecords: number; orphanCount: number; orphanRecords: OrphanRecord[] };
  functionalOrphanCheck: { orphanCount: number; orphanRecords: any[] };
  apiHealth: { uptimePercent: string; status: 'HEALTHY' | 'UNSTABLE' };
  serverResources: {
    memory: { total: string; used: string; percent: string };
    database: { size: string };
    storage: { used: string; free: string };
    uptime: string;
    cpuCount: number;
    platform: string;
  };
  stability: {
    recentErrors: number;
    latency: string;
    activeSockets: { kiosks: number; displays: number; total: number };
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
  advanced: {
    cpuLoad: string;
    dbConnections: number;
    mailErrors: number;
    failedLogins: number;
  };
  isConsistent: boolean;
}

const SystemHealthPage: React.FC = () => {
  const { user } = useAuth();

  const [isDryRun, setIsDryRun] = React.useState(true);
  const [filesScope, setFilesScope] = React.useState<'uploads' | 'backups' | 'all'>('uploads');

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState<string>('');
  const [modalData, setModalData] = React.useState<any>(null);
  const [showRawJson, setShowRawJson] = React.useState(false);

  // Fechar modal via ESC
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- Helper: copiar JSON para clipboard ---
  const copyJson = async () => {
    if (!modalData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(modalData, null, 2));
    } catch {
      // noop
    }
  };

  // --- Helper: resumo amigável por tipo de resposta ---
  function renderSummary(data: any): React.ReactNode {
    if (!data) return null;

    if (data.actions) {
      const items: React.ReactNode[] = [];

      if (data.actions.uploads) {
        const m = data.actions.uploads;
        items.push(
          <li key="uploads" className="leading-tight">
            <strong>Uploads</strong>: {m.moved?.length ?? 0} ficheiro(s) {data.dryRun ? 'a mover' : 'movido(s)'} para Trash
            {typeof m.totalBytesMoved === 'number' ? ` • ${m.totalBytesMoved.toLocaleString()} bytes` : ''}
          </li>,
        );
      }

      if (data.actions.backupsOrphans) {
        const d = data.actions.backupsOrphans.disk;
        const b = data.actions.backupsOrphans.db;
        items.push(
          <li key="backups-orphans" className="leading-tight">
            <strong>Backups órfãos</strong>: ficheiros {d?.deleted?.length ?? 0} • registos BD {b?.deletedCount ?? 0}
          </li>,
        );
      }

      if (data.actions.backupsRetention) {
        const d = data.actions.backupsRetention.filesRes;
        const b = data.actions.backupsRetention.dbRes;
        items.push(
          <li key="backups-ret" className="leading-tight">
            <strong>Retenção &gt; 30 dias</strong>: ficheiros {d?.deleted?.length ?? 0} • registos BD {b?.deletedCount ?? 0}
          </li>,
        );
      }

      return <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">{items}</ul>;
    }

    if (typeof data.deletedCount === 'number' && Array.isArray(data.trashed)) {
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
          <li>
            <strong>Registos BD exportados p/ Trash</strong>: {data.trashed.length}
          </li>
          <li>
            <strong>Registos BD apagados</strong>: {data.deletedCount} {data.dryRun ? '(simulação)' : ''}
          </li>
        </ul>
      );
    }

    if (data.files && data.db) {
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
          <li>
            <strong>Ficheiros {data.dryRun ? 'a mover' : 'movidos'} para Trash</strong>: {data.files.moved?.length ?? 0}
          </li>
          <li>
            <strong>Registos exportados p/ Trash</strong>: {data.db.trashed?.length ?? 0}
          </li>
          <li>
            <strong>Registos apagados</strong>: {data.db.deletedCount ?? 0} {data.dryRun ? '(simulação)' : ''}
          </li>
        </ul>
      );
    }

    return (
      <p className="text-sm text-gray-700">
        Operação concluída. {data?.dryRun ? 'Simulação (nada alterado).' : 'Limpeza aplicada.'}
      </p>
    );
  }

  // 1) CARREGAMENTO AUTOMÁTICO
  const { data, isLoading, error, refetch } = useQuery<ConsistencyCheckResult, Error>({
    queryKey: ['systemHealth'],
    queryFn: checkFileSystemConsistency,
  });

  // 2) MUTAÇÕES DE LIMPEZA
  const { mutate: runCleanFiles, isPending: isCleaningFiles } = useMutation({
    mutationFn: (vars: { dryRun: boolean; scope: 'uploads' | 'backups' | 'all' }) => cleanOrphanFiles(vars),
    onSuccess: (resp, variables) => {
      setModalTitle(variables.scope === 'backups' ? 'Limpeza de Backups' : 'Limpeza de Ficheiros');
      setModalData(resp);
      setShowRawJson(false);
      setModalOpen(true);
      refetch();
    },
  });

  const { mutate: runCleanRecords, isPending: isCleaningRecords } = useMutation({
    mutationFn: (vars: { dryRun: boolean }) => cleanOrphanRecords(vars),
    onSuccess: (resp) => {
      setModalTitle('Limpeza de Registos (BD)');
      setModalData(resp);
      setShowRawJson(false);
      setModalOpen(true);
      refetch();
    },
  });

  const { mutate: runCleanFunctionalOrphans, isPending: isCleaningFunctional } = useMutation({
    mutationFn: (vars: { dryRun: boolean }) => cleanFunctionallyOrphanRecords(vars),
    onSuccess: (resp) => {
      setModalTitle('Limpeza de Órfãos Funcionais');
      setModalData(resp);
      setShowRawJson(false);
      setModalOpen(true);
      refetch();
    },
  });

  if (!user) return <Navigate to="/login" />;

  const isConsistent =
    !!data &&
    data.diskCheck.orphanCount === 0 &&
    data.databaseCheck.orphanCount === 0 &&
    data.functionalOrphanCheck.orphanCount === 0;

  return (
    <UtilityPageTemplate
      header={{
        icon: ShieldCheck,
        title: 'Saúde do Sistema',
        subtitle: 'Monitorização de integridade e disponibilidade.',
        actions: (
          <Button onClick={() => refetch()} disabled={isLoading} variant="outline">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar Estado
          </Button>
        ),
      }}
      optionsBar={
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          {/* Toggle Dry-run */}
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isDryRun}
              onChange={(e) => setIsDryRun(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            <span>Simulação (Dry‑run)</span>
          </label>

          {/* Scope para ficheiros */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Âmbito</span>
            <select
              value={filesScope}
              onChange={(e) => setFilesScope(e.target.value as 'uploads' | 'backups' | 'all')}
              className="text-sm border rounded px-2 py-1"
              title="Âmbito da limpeza de ficheiros"
            >
              <option value="uploads">Uploads</option>
              <option value="backups">Backups</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>
      }
    >
      {/* ===== BODY ===== */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-gray-500 animate-pulse">A realizar auditoria completa...</p>
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center text-red-700">
            <ShieldAlert className="h-12 w-12 mx-auto mb-2" />
            <p>Erro na verificação: {error.message}</p>
          </CardContent>
        </Card>
      ) : (
        data && (
          <div className="space-y-6">
            {/* --- SECÇÃO 1: DISPONIBILIDADE DA API --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      Estado da API
                    </p>
                    <h3 className="text-2xl font-bold">Online</h3>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500 animate-pulse" />
                </CardContent>
              </Card>

              <Card
                className={`border-l-4 ${
                  data.apiHealth.status === 'HEALTHY' ? 'border-l-green-500' : 'border-l-yellow-500'
                }`}
              >
                <CardContent className="p-6">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Uptime (7 Dias)
                  </p>
                  <h3
                    className={`text-2xl font-bold ${
                      data.apiHealth.status === 'HEALTHY' ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {data.apiHealth.uptimePercent}
                  </h3>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-indigo-500">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      Base de Dados
                    </p>
                    <h3 className="text-2xl font-bold">Ligada</h3>
                  </div>
                  <Database className="h-8 w-8 text-indigo-500" />
                </CardContent>
              </Card>

              {/* Erros 24h */}
              <Card
                className={`border-l-4 ${
                  data.stability.recentErrors > 0 ? 'border-l-red-500' : 'border-l-green-500'
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold">Erros (24h)</p>
                    <h3
                      className={`text-2xl font-bold ${
                        data.stability.recentErrors > 0 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {data.stability.recentErrors}
                    </h3>
                  </div>
                  <ShieldAlert
                    className={`h-8 w-8 ${
                      data.stability.recentErrors > 0 ? 'text-red-500' : 'text-green-500 opacity-20'
                    }`}
                  />
                </CardContent>
              </Card>
            </div>

            {/* --- SECÇÃO 1.2: RECURSOS DO SERVIDOR --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              {/* RAM */}
              <Card className="bg-white">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Uso de Memória RAM</p>
                  <div className="flex items-end justify-between mt-2">
                    <h3 className="text-2xl font-bold">{data.serverResources.memory.percent}</h3>
                    <p className="text-xs text-gray-400">
                      {data.serverResources.memory.used} / {data.serverResources.memory.total}
                    </p>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        parseFloat(data.serverResources.memory.percent) > 80 ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: data.serverResources.memory.percent }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Carga do CPU */}
              <Card className="bg-white">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      Carga do CPU
                    </p>
                    <h3 className="text-2xl font-bold mt-1">{data.advanced.cpuLoad}</h3>
                    <p className="text-[10px] text-gray-400">
                      {data.advanced.cpuLoad.includes('%')
                        ? 'Uso do recurso pela aplicação'
                        : 'Média de processamento (1m)'}
                    </p>
                  </div>
                  <Cpu className="h-8 w-8 text-blue-400 opacity-30" />
                </CardContent>
              </Card>

              {/* Tamanho da BD */}
              <Card className="bg-white">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Base de Dados</p>
                  <h3 className="text-2xl font-bold mt-2">{data.serverResources.database.size}</h3>
                  <p className="text-xs text-gray-400">PostgreSQL Storage</p>
                </CardContent>
              </Card>

              {/* Armazenamento de Ficheiros */}
              <Card className="bg-white">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Arquivos de Media (Uploads)</p>
                  <h3 className="text-2xl font-bold mt-2">{data.serverResources.storage.used}</h3>
                  <p className="text-xs text-gray-400">Banners, Logos e Documentos</p>
                </CardContent>
              </Card>

              {/* Espaço Livre em Disco */}
              <Card className="bg-white">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Espaço Livre em Disco</p>
                  <h3 className="text-2xl font-bold mt-2">{data.serverResources.storage.free}</h3>
                  <p className="text-[10px] text-gray-400">Capacidade restante para uploads</p>
                </CardContent>
              </Card>
            </div>

            {/* --- SECÇÃO 1.3: ESTABILIDADE E REDE --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              {/* Conexões BD */}
              <Card className="bg-white">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      Conexões Ativas
                    </p>
                    <h3 className="text-2xl font-bold mt-1 text-indigo-700">{data.advanced.dbConnections}</h3>
                    <p className="text-[10px] text-gray-400">Pontes abertas ao Postgres</p>
                  </div>
                  <Database className="h-8 w-8 text-indigo-400 opacity-30" />
                </CardContent>
              </Card>

              {/* Latência */}
              <Card className="bg-white">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Latência do Servidor</p>
                  <h3 className="text-2xl font-bold mt-2">{data.stability.latency}</h3>
                  <p className="text-xs text-gray-400">Tempo de resposta interno</p>
                </CardContent>
              </Card>

              {/* WebSockets Ativos */}
              <Card className="bg-white">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Dispositivos Ligados</p>
                  <div className="flex items-end justify-between mt-2">
                    <h3 className="text-2xl font-bold text-blue-600">{data.stability.activeSockets.total}</h3>
                    <div className="text-[10px] text-right text-gray-400 leading-tight">
                      {data.stability.activeSockets.kiosks} Q
                      <br />
                      {data.stability.activeSockets.displays} D
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Erros de Email */}
              <Card
                className={`border-l-4 ${
                  data.advanced.mailErrors > 0 ? 'border-l-red-500 bg-red-50/30' : 'bg-white'
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Falhas de Email</p>
                    <h3
                      className={`text-2xl font-bold ${
                        data.advanced.mailErrors > 0 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {data.advanced.mailErrors}
                    </h3>
                    <p className="text-[10px] text-gray-400">Erros SMTP (24h)</p>
                  </div>
                  <MailWarning
                    className={`h-8 w-8 ${data.advanced.mailErrors > 0 ? 'text-red-500' : 'text-gray-300'}`}
                  />
                </CardContent>
              </Card>

              {/* Alertas de Segurança */}
              <Card
                className={`border-l-4 ${
                  data.advanced.failedLogins > 5
                    ? 'border-l-red-600 bg-red-50'
                    : data.advanced.failedLogins > 0
                    ? 'border-l-orange-500'
                    : 'bg-white'
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Logins Falhados</p>
                    <h3
                      className={`text-2xl font-bold ${
                        data.advanced.failedLogins > 0 ? 'text-orange-600' : 'text-gray-900'
                      }`}
                    >
                      {data.advanced.failedLogins}
                    </h3>
                    <p className="text-[10px] text-gray-400">Tentativas de acesso (24h)</p>
                  </div>
                  <ShieldAlert
                    className={`h-8 w-8 ${data.advanced.failedLogins > 0 ? 'text-orange-500' : 'text-gray-300'}`}
                  />
                </CardContent>
              </Card>
            </div>

            {/* --- SECÇÃO 2: RESULTADO DA CONSISTÊNCIA --- */}
            <Card className={isConsistent ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <CardContent className="p-4 flex items-center gap-3">
                {isConsistent ? (
                  <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-yellow-600" />
                )}
                <span className={`font-semibold ${isConsistent ? 'text-green-800' : 'text-yellow-800'}`}>
                  {isConsistent
                    ? 'Todos os sistemas de ficheiros e dados estão sincronizados.'
                    : 'Foram detetadas inconsistências que requerem atenção.'}
                </span>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Relatório de Disco */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-base">Ficheiros no Disco</CardTitle>
                  </div>

                  {data.diskCheck.orphanCount > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => runCleanFiles({ dryRun: isDryRun, scope: filesScope })}
                      disabled={isCleaningFiles}
                      title={isDryRun ? 'Simulação — não altera nada' : 'Aplicar limpeza'}
                    >
                      {isDryRun ? 'Simular Limpeza' : 'Limpar'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm mb-4">
                    Total detetado: <strong>{data.diskCheck.totalFiles}</strong>
                  </p>
                  {data.diskCheck.orphanCount > 0 ? (
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {data.diskCheck.orphanFiles.map((file) => (
                        <li key={file} className="text-xs font-mono bg-red-50 p-1 rounded text-red-700">
                          {file}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <ShieldCheckIcon className="h-4 w-4" /> Sem ficheiros órfãos.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Relatório de BD */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-base">Registos na Base de Dados</CardTitle>
                  </div>

                  {data.databaseCheck.orphanCount > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => runCleanRecords({ dryRun: isDryRun })}
                      disabled={isCleaningRecords}
                      title={isDryRun ? 'Simulação — não altera nada' : 'Aplicar limpeza'}
                    >
                      {isDryRun ? 'Simular Limpeza' : 'Limpar'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm mb-4">
                    Total de registos: <strong>{data.databaseCheck.totalRecords}</strong>
                  </p>
                  {data.databaseCheck.orphanCount > 0 ? (
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                      {data.databaseCheck.orphanRecords.map((rec) => (
                        <li key={rec.id} className="text-xs p-2 bg-yellow-50 rounded border border-yellow-100">
                          <p className="font-bold">{rec.displayName}</p>
                          <p className="text-gray-500 uppercase">{rec.uploadedBy}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <ShieldCheckIcon className="h-4 w-4" /> Sem registos órfãos.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Registos não utilizados (Forense) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <CardTitle className="text-base">Limpeza de Ficheiros Não Utilizados</CardTitle>
                {data.functionalOrphanCheck.orphanCount > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => runCleanFunctionalOrphans({ dryRun: isDryRun })}
                    disabled={isCleaningFunctional}
                    title={isDryRun ? 'Simulação — não altera nada' : 'Aplicar limpeza'}
                  >
                    {isDryRun
                      ? `Simular (${data.functionalOrphanCheck.orphanCount})`
                      : `Apagar Tudo (${data.functionalOrphanCheck.orphanCount})`}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Ficheiros que existem no disco e na BD, mas que não estão ligados a nenhuma Empresa, Evento ou
                  Assinatura.
                </p>
                {data.functionalOrphanCheck.orphanCount > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {data.functionalOrphanCheck.orphanRecords.map((rec: any) => (
                      <div key={rec.id} className="text-[10px] p-2 bg-gray-50 rounded font-mono truncate">
                        {rec.displayName}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-600">O sistema está limpo.</p>
                )}
              </CardContent>
            </Card>

            {/* MODAL DE RESULTADOS (mantido) */}
            {modalOpen && (
              <div
                className="fixed inset-0 z-50"
                aria-modal="true"
                role="dialog"
                onClick={() => setModalOpen(false)}
              >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                {/* Painel */}
                <div className="absolute inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                          {modalTitle || 'Resultado da operação'}
                        </h2>
                        {modalData?.dryRun && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">Simulação</span>
                        )}
                      </div>
                      <button
                        className="p-1 text-gray-500 hover:text-gray-700"
                        onClick={() => setModalOpen(false)}
                        aria-label="Fechar"
                        title="Fechar"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <strong>Resumo</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRawJson((v) => !v)}
                          title={showRawJson ? 'Ocultar JSON' : 'Ver JSON'}
                        >
                          {showRawJson ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}{' '}
                          {showRawJson ? 'Ocultar JSON' : 'Ver JSON'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={copyJson} title="Copiar JSON">
                          <Copy className="h-4 w-4 mr-1" /> Copiar JSON
                        </Button>
                      </div>
                    </div>

                    <div className="px-4 py-4 max-h-[70vh] overflow-auto">
                      {/* RESUMO */}
                      <div className="mb-4">{renderSummary(modalData)}</div>

                      {/* JSON BRUTO */}
                      {showRawJson && (
                        <pre className="text-xs bg-gray-900 text-green-200 p-3 rounded overflow-x-auto">
{JSON.stringify(modalData, null, 2)}
                        </pre>
                      )}
                    </div>

                    <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-end">
                      <Button variant="outline" onClick={() => setModalOpen(false)}>
                        Fechar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </UtilityPageTemplate>
  );
};

export default SystemHealthPage;