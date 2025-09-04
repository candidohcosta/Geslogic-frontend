// frontend/src/pages/SystemHealthPage.tsx (VERSÃO COMPLETA)

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Usamos useMutation para uma ação "a pedido"
import { checkFileSystemConsistency, cleanOrphanFiles, cleanOrphanRecords, cleanFunctionallyOrphanRecords   } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';


// Interfaces para a "forma" da resposta da API
interface LastKnownAction {
  action: string;
  message: string;
  timestamp: string;
}
interface OrphanOwnerRecord {
  fileId: string;
  fileName: string;
  orphanOwnerId: string;
  ownerType: string;
  lastKnownAction: LastKnownAction | null;
}
interface OrphanRecord {
  id: string;
  displayName: string;
  storageFileName: string;
  uploadedBy: string;
}
interface ConsistencyCheckResult {
  diskCheck: {
    totalFiles: number;
    orphanCount: number;
    orphanFiles: string[];
  };
  databaseCheck: {
    totalRecords: number;
    orphanCount: number;
    orphanRecords: OrphanRecord[];
  };
  ownerLinkCheck: { 
    orphanCount: number;
    orphanRecords: OrphanOwnerRecord[];
  };
  functionalOrphanCheck: {
    orphanCount: number;
    orphanRecords: any[];
  };
  isConsistent: boolean;
}

const SystemHealthPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { mutate: runCheck, data, error, isPending, isIdle } = useMutation<ConsistencyCheckResult, Error>({
    mutationFn: checkFileSystemConsistency,
  });

  // +++ NOVAS MUTAÇÕES PARA AS AÇÕES DE LIMPEZA +++
  const { mutate: runCleanFiles, isPending: isCleaningFiles } = useMutation({
    mutationFn: cleanOrphanFiles,
    onSuccess: () => runCheck(), // Após a limpeza, corre a verificação novamente
  });

  const { mutate: runCleanRecords, isPending: isCleaningRecords } = useMutation({
    mutationFn: cleanOrphanRecords,
    onSuccess: () => runCheck(),
  });

  const { mutate: runCleanFunctionalOrphans, isPending: isCleaningFunctional } = useMutation({
    mutationFn: cleanFunctionallyOrphanRecords,
    onSuccess: () => runCheck(),
  });


  if (!user) return <Navigate to="/login" />;

  const isConsistent = data && data.diskCheck.orphanCount === 0 && data.databaseCheck.orphanCount === 0 && data.functionalOrphanCheck.orphanCount === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificação de Consistência do Sistema</CardTitle>
        <CardDescription>
          Auditoria da integridade entre os ficheiros guardados no disco e os registos na base de dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <Button onClick={() => runCheck()} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'A verificar...' : 'Iniciar Verificação'}
          </Button>
        </div>

        {/* Mostra os resultados APÓS a verificação */}
        {!isIdle && !isPending && (
          <div>
            {error && <p className="text-red-500 text-center">Erro: {(error as Error).message}</p>}
            
            {data && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg flex items-center ${data.isConsistent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {data.isConsistent ? <ShieldCheck className="h-5 w-5 mr-3" /> : <ShieldAlert className="h-5 w-5 mr-3" />}
                  <span className="font-semibold">
                    {data.isConsistent ? 'O sistema está consistente.' : 'Foram encontradas inconsistências.'}
                  </span>
                </div>

                {/* +++ O NOSSO NOVO CONTENTOR DE GRELHA +++ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Relatório de Órfãos de Disco */}
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="text-base">Ficheiros Órfãos no Disco ({data.diskCheck.orphanCount})</CardTitle>
                            {data.diskCheck.orphanCount > 0 && (
                            <Button variant="destructive" size="sm" onClick={() => runCleanFiles()} disabled={isCleaningFiles}>
                                {isCleaningFiles ? 'A Limpar...' : 'Limpar Ficheiros'}
                            </Button>
                            )}
                        </CardHeader>
                    <CardContent>
                        {data.diskCheck.orphanCount > 0 ? (
                        <ul className="list-disc list-inside text-sm font-mono">
                            {data.diskCheck.orphanFiles.map(file => <li key={file}>{file}</li>)}
                        </ul>
                        ) : <p className="text-sm text-muted-foreground">Nenhum ficheiro órfão encontrado.</p>}
                    </CardContent>
                    </Card>

                    {/* Relatório de Órfãos de BD */}
                    <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="text-base">Registos Órfãos na BD ({data.databaseCheck.orphanCount})</CardTitle>
                        {data.databaseCheck.orphanCount > 0 && (
                        <Button variant="destructive" size="sm" onClick={() => runCleanRecords()} disabled={isCleaningRecords}>
                            {isCleaningRecords ? 'A Limpar...' : 'Limpar Registos'}
                        </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {data.databaseCheck.orphanCount > 0 ? (
                        <ul className="space-y-2">
                            {data.databaseCheck.orphanRecords.map(rec => (
                            <li key={rec.id} className="text-sm p-2 bg-gray-50 rounded">
                                <p className="font-mono"><strong>Nome:</strong> {rec.displayName}</p>
                                <p className="text-xs text-muted-foreground font-mono">Ficheiro: {rec.storageFileName}</p>
                                <p className="text-xs text-muted-foreground">Carregado por: {rec.uploadedBy}</p>
                            </li>
                            ))}
                        </ul>
                        ) : <p className="text-sm text-muted-foreground">Nenhum registo órfão encontrado.</p>}
                    </CardContent>
                    </Card>

                </div>

                {/* +++ O NOSSO NOVO CARD "FORENSE" +++ */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-base">Registos Não Utilizados ({data.functionalOrphanCheck.orphanCount})</CardTitle>
                    {data.functionalOrphanCheck.orphanCount > 0 && <Button variant="destructive" size="sm" onClick={() => runCleanFunctionalOrphans()} disabled={isCleaningFunctional}>{isCleaningFunctional ? 'A Limpar...' : 'Limpar'}</Button>}
                  </CardHeader>
                  <CardContent>
                    {data.functionalOrphanCheck.orphanCount > 0 ? (
                      <ul className="space-y-2">
                        {data.functionalOrphanCheck.orphanRecords.map((rec: any) => (
                          <li key={rec.id} className="text-sm p-2 bg-gray-50 rounded">
                            <p className="font-mono"><strong>Nome:</strong> {rec.displayName}</p>
                            <p className="text-xs text-muted-foreground font-mono">Ficheiro: {rec.storageFileName}</p>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">Nenhum registo não utilizado encontrado.</p>}
                  </CardContent>
                </Card>

              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealthPage;