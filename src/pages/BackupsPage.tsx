import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Download, Database, Loader2, Plus, Search, Building2, RefreshCcw, Upload } from 'lucide-react';
import { fetchBackups, generateBackup, fetchCompanies, restoreBackup, uploadBackup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import toast from 'react-hot-toast';

const BackupsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 1. Procurar Lista de Empresas (Apenas para o Dropdown do Platform Admin)
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN
  });

  // 2. Procurar Lista de Backups
  const { data: backups = [], isLoading } = useQuery<any[]>({
    queryKey: ['backups'],
    queryFn: fetchBackups
  });

  // 3. Mutação para Gerar Backup
  const generateMutation = useMutation({
    mutationFn: (companyId: string) => generateBackup(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Processo de backup concluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao gerar backup.');
    }
  });

  const handleDownload = (id: string) => {
    window.open(`${process.env.REACT_APP_API_BASE_URL}/backups/download/${id}`, '_blank');
  };

  const handleGenerateClick = () => {
    if (selectedCompanyId === 'ALL') {
      toast.error('Por favor, selecione uma empresa específica para gerar o backup.');
      return;
    }
    generateMutation.mutate(selectedCompanyId);
  };

  // Filtragem local da tabela
  const filteredBackups = backups.filter((b: any) => 
    selectedCompanyId === 'ALL' || b.company?.id === selectedCompanyId
  );

// 1. Mutação para o Restore
  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreBackup(id), // Função que deves adicionar ao api.ts
    onSuccess: (data: any) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (error: any) => {
      toast.error('Erro no Restore: ' + error.message);
    }
  });

// 2. Função de Handler com Confirmação
  const handleRestore = (id: string, companyName: string) => {
    const confirmText = `⚠️ ATENÇÃO: Esta ação irá APAGAR os dados atuais da empresa "${companyName}" e substituí-los pelos dados deste backup.\n\nTem a certeza absoluta?`;
    
    if (window.confirm(confirmText)) {
      const secondConfirm = window.confirm("ÚLTIMO AVISO: Esta operação é irreversível. Prosseguir?");
      if (secondConfirm) {
        restoreMutation.mutate(id);
      }
    }
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadBackup(file), // Garante que exportaste isto no api.ts
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Backup carregado e registado com sucesso!');
      if (fileInputRef.current) fileInputRef.current.value = ''; // Limpa o input
    },
    onError: (error: any) => {
      toast.error('Falha no upload: ' + error.message);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div>
            <CardTitle className="text-2xl font-bold">Cópias de Segurança</CardTitle>
            <CardDescription>Gestão e exportação de dados por organização.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === UserRole.PLATFORM_ADMIN && (
              <>
                {/* INPUT DE FICHEIRO INVISÍVEL */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".glback,.zip" 
                />
                
                {/* BOTÃO DE UPLOAD */}
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Carregar Backup
                </Button>

                {/* BOTÃO DE GERAR (O que já tinhas) */}
                <Button 
                  onClick={handleGenerateClick} 
                  disabled={generateMutation.isPending || selectedCompanyId === 'ALL'}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Gerar Backup
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 items-end bg-gray-50 p-4 rounded-lg border">
            <div className="flex-grow space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Filtrar por Empresa
              </label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              >
                <option value="ALL">Todas as Empresas (Apenas visualização)</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela */}
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div>
          ) : filteredBackups.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-400">
              <Database className="mx-auto h-12 w-12 mb-3 opacity-20" />
              <p>Nenhum backup encontrado para os critérios selecionados.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBackups.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.company?.name || 'N/A'}</TableCell>
                      <TableCell>{new Date(b.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{(b.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.type === 'AUTOMATIC' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {b.type}
                        </span>
                      </TableCell>
<TableCell className="text-right flex justify-end gap-2">
  <Button 
    variant="ghost" 
    size="icon" 
    onClick={() => handleDownload(b.id)} 
    title="Descarregar"
  >
    <Download className="h-4 w-4 text-blue-600" />
  </Button>

  {user?.role === UserRole.PLATFORM_ADMIN && (
    <Button 
      variant="ghost" 
      size="icon" 
      disabled={restoreMutation.isPending}
      onClick={() => handleRestore(b.id, b.company?.name || 'Empresa')} 
      title="Repor este Backup"
    >
      {restoreMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-red-500" />
      ) : (
        <RefreshCcw className="h-4 w-4 text-red-600" />
      )}
    </Button>
    )}
</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupsPage;