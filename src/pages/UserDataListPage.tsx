// frontend/src/pages/UserDataListPage.tsx (VERSÃO COMPLETA)

import React, { useState, useMemo } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserTypeById, fetchUserData, uploadUserDataCsv, deleteUserData } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Download, Upload, PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import { Input } from '../components/ui/Input';

// Interfaces
interface FieldDefinition { id: string; fieldName: string; }
interface UserData { id: string; fieldValues: { fieldDefinition: { id: string }, value: string }[]; }

const UserDataListPage: React.FC = () => {
  const { userTypeId } = useParams<{ userTypeId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [dataToDelete, setDataToDelete] = useState<UserData | null>(null);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [inputKey, setInputKey] = useState(Date.now());

  const { data: userTypeDetails, isLoading: isLoadingType } = useQuery({
    queryKey: ['userType', userTypeId],
    queryFn: () => fetchUserTypeById(userTypeId!),
    enabled: !!userTypeId,
  });

  const { data: userData = [], isLoading: isLoadingData } = useQuery<UserData[], Error>({
    queryKey: ['userData', userTypeId],
    queryFn: () => fetchUserData(userTypeId!),
    enabled: !!userTypeId,
  });

  const { mutate: uploadCsv, isPending: isUploading } = useMutation({
    mutationFn: (file: File) => uploadUserDataCsv(userTypeId!, file),
    // A 'onSuccess' agora guarda o sumário no nosso novo estado
    onSuccess: (result: any) => {
      setImportSummary(result); // Guarda o objeto de resposta completo
      queryClient.invalidateQueries({ queryKey: ['userData', userTypeId] });
      setFileToUpload(null); // Limpa a seleção de ficheiro
      setInputKey(Date.now()); // Reseta o input de ficheiro
    },
    onError: (error) => {
      // Em caso de erro fatal (ex: cabeçalhos errados), também o mostramos
      setImportSummary({ errors: [{ line: 'N/A', message: (error as Error).message }] });
    },
  });

  const { mutate: deleteMutate, isPending: isDeleting } = useMutation({
    mutationFn: deleteUserData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData', userTypeId] });
      setDataToDelete(null); // Fecha o modal
    },
    onError: (error) => alert(`Erro ao apagar: ${(error as Error).message}`),
  });

  const handleDeleteClick = (dataItem: UserData) => {
    setDataToDelete(dataItem);
  };
  
  const handleConfirmDelete = () => {
    if (dataToDelete) {
      deleteMutate(dataToDelete.id);
    }
  };

  const handleDownloadExample = () => {
    if (!userTypeDetails) return;
    const headers = userTypeDetails.fieldDefinitions.map((def: FieldDefinition) => def.fieldName).join(',');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + headers], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `exemplo_${userTypeDetails.name}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFileUpload = () => {
    if (fileToUpload) uploadCsv(fileToUpload);
  };

  // Memoiza os cabeçalhos da tabela para evitar recálculos
  const tableHeaders = useMemo(() => userTypeDetails?.fieldDefinitions || [], [userTypeDetails]);

  if (!user || (user.role !== UserRole.COMPANY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) return <Navigate to="/dashboard" />;
  if (isLoadingType) return <p>A carregar tipo de utente...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Utentes: {userTypeDetails?.name}</CardTitle>
          <CardDescription>Importe, visualize e gira as fichas de utente para este tipo.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2 p-4 border rounded-lg">
            <h3 className="font-semibold">Importar via CSV</h3>
            <p className="text-sm text-muted-foreground">Carregue um ficheiro CSV com os dados dos utentes. O sistema irá criar novos ou atualizar existentes.</p>
            <Button onClick={handleDownloadExample} variant="outline" size="sm" className="w-fit">
              <Download className="mr-2 h-4 w-4"/> Descarregar Ficheiro Exemplo
            </Button>
            <div className="flex gap-2 items-center pt-2">
              <Input type="file" accept=".csv" onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)} key={inputKey} />
              <Button onClick={handleFileUpload} disabled={!fileToUpload || isUploading}>
                {isUploading ? 'A Carregar...' : <><Upload className="mr-2 h-4 w-4"/> Carregar</>}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 p-4 border rounded-lg">
            <h3 className="font-semibold">Criação Manual</h3>
            <p className="text-sm text-muted-foreground">Adicione uma nova ficha de utente preenchendo os campos manualmente.</p>
            <Button asChild className="mt-auto">
              <Link to={`/user-data/new?userTypeId=${userTypeId}`}><PlusCircle className="mr-2 h-4 w-4"/> Adicionar Utente</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {tableHeaders.map((def: FieldDefinition) => <TableHead key={def.id}>{def.fieldName}</TableHead>)}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingData ? <TableRow><TableCell colSpan={tableHeaders.length + 1}>A carregar utentes...</TableCell></TableRow> : userData.map(dataItem => (
                  <TableRow key={dataItem.id}>
                    {tableHeaders.map((def: FieldDefinition) => (
                      <TableCell key={def.id}>
                        {dataItem.fieldValues.find(fv => fv.fieldDefinition.id === def.id)?.value || ''}
                      </TableCell>
                    ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center">
                          <Button asChild variant="ghost" size="icon" title="Editar Ficha">
                            <Link to={`/user-data/edit/${dataItem.id}`}>
                              <Edit className="h-4 w-4"/>
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Apagar Ficha" onClick={() => handleDeleteClick(dataItem)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {dataToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>
                Tem a certeza que deseja apagar esta ficha?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">Esta ação não pode ser revertida.</p>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setDataToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'A Apagar...' : 'Apagar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
      {/* +++ O NOSSO NOVO MODAL DE SUMÁRIO +++ */}
      {importSummary && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Resultado da Importação</CardTitle>
              <CardDescription>O ficheiro foi processado com os seguintes resultados:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sumário numérico */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-gray-100 rounded"><strong>Total de Linhas:</strong> {importSummary.totalRows || 0}</div>
                <div className="p-2 bg-green-100 rounded"><strong>Criados:</strong> {importSummary.created || 0}</div>
                <div className="p-2 bg-blue-100 rounded"><strong>Atualizados:</strong> {importSummary.updated || 0}</div>
                <div className="p-2 bg-yellow-100 rounded"><strong>Ignorados:</strong> {importSummary.skipped || 0}</div>
              </div>
              
              {/* Lista de Erros */}
              {importSummary.errors && importSummary.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Detalhes dos Erros:</h4>
                  <div className="space-y-1 text-sm text-red-700 max-h-48 overflow-y-auto border p-2 rounded">
                    {importSummary.errors.map((err: any, index: number) => (
                      <p key={index}><strong>Linha {err.line}:</strong> {err.message}</p>
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

      <div className="w-full">
        <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>Voltar à Lista</Button>
      </div>

    </div>
  );
};

export default UserDataListPage;