// frontend/src/pages/PolicyDocumentsPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPolicies, deletePolicy } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { FilePenLine, PlusCircle, Trash2 } from 'lucide-react';
import { Checkbox } from '../components/ui/Checkbox';
import { Label } from '../components/ui/Label';

// Interface para os dados
interface PolicyData {
  id: string;
  name: string;
  consentText: string;
  company: { id: string; name: string } | null;
  document?: { id: string; url: string; displayName: string; } | null;
}

const PolicyDocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<PolicyData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 1. CHAMAR TODOS OS HOOKS NO TOPO E SEM CONDIÇÕES
  const { data: policies = [], isLoading, error } = useQuery<PolicyData[], Error>({
    queryKey: ['policies'],
    queryFn: fetchPolicies,
    enabled: !!user,
  });

  const { mutate: deletePolicyMutate, isPending: isDeleting } = useMutation({
    mutationFn: deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      handleCloseDeleteModal();
    },
  });

    // 3. AGORA AS SALVAGUARDAS DE PERMISSÃO E LOADING
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isLoading) return <div className="p-6 text-center">A carregar políticas...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Erro: {(error as Error).message}</div>;

    const handleDeleteClick = (policy: PolicyData) => {
    setPolicyToDelete(policy);
    setConfirmDelete(false);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setPolicyToDelete(null);
    setConfirmDelete(false);
  };

  const handleConfirmDeletePolicy = () => {
    if (!policyToDelete || !confirmDelete) return;
    deletePolicyMutate(policyToDelete.id); // 4. CHAMAR A FUNÇÃO mutate DIRETAMENTE
  };

  // Helper para verificar se o utilizador pode editar/apagar esta política específica
  const canManagePolicy = (policy: PolicyData) => {
    if (user?.role === UserRole.PLATFORM_ADMIN) return true;
    if (user?.role === UserRole.COMPANY_ADMIN && policy.company?.id === user.company?.id) return true;
    return false;
  };
  
  const canViewDocument = (policy: PolicyData) => {
    // Um Company Admin pode ver documentos das políticas da plataforma ou da sua empresa
    // Um Platform Admin pode ver tudo
    if (user?.role === UserRole.PLATFORM_ADMIN) return true;
    if (user?.role === UserRole.COMPANY_ADMIN && (!policy.company || policy.company?.id === user.company?.id)) return true;
    return false;
  };




  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestão de Políticas de Privacidade</CardTitle>
          <CardDescription>Crie e gira os documentos de consentimento.</CardDescription>
        </div>
        {/* APENAS Platform Admin E Company Admin podem criar */}
        {(user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
          <Button asChild>
            <Link to="/policy-documents/new"><PlusCircle className="mr-2 h-4 w-4" /> Criar Nova</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* ... (o teu JSX da tabela e do modal de eliminação estão perfeitos) ... */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Texto de Consentimento</TableHead>
                <TableHead>Âmbito</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy: PolicyData) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.name}</TableCell>
                  <TableCell className="max-w-md truncate">{policy.consentText}</TableCell>
                  <TableCell>{policy.company ? policy.company.name : 'Plataforma'}</TableCell>
                  <TableCell>
                    {policy.document?.url && canViewDocument(policy) ? (
                      <a href={policy.document.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center">
                        <FilePenLine className="h-4 w-4 mr-1" /> Ver Documento
                      </a>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManagePolicy(policy) ? (
                      // Admins que podem gerir a política
                      <>
                        <Button variant="ghost" size="icon" asChild title="Editar">
                          <Link to={`/policy-documents/edit/${policy.id}`}><FilePenLine className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(policy)} className="text-red-600 hover:text-red-700" title="Apagar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      // Company Admins que só podem ver políticas da plataforma
                      <span className="text-gray-500 text-sm">Visualizar</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {showDeleteModal && policyToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>
                Tem a certeza que deseja eliminar a política "{policyToDelete.name}"?
                Esta ação é irreversível e removerá o registo e o documento associado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox id="confirmDeletePolicy" 
                  checked={confirmDelete}       
                  onCheckedChange={(checked) => {
                  console.log('Checkbox changed:', checked); // <-- LOG DE DEPURAÇÃO
                  setConfirmDelete(Boolean(checked));
                }} />
                <Label htmlFor="confirmDeletePolicy">Compreendo que esta ação é irreversível e desejo continuar.</Label>
              </div>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={handleCloseDeleteModal}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDeletePolicy} disabled={!confirmDelete || isDeleting}>
                {isDeleting ? 'A Eliminar...' : 'Eliminar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}      
    </Card>
  );
};

export default PolicyDocumentsPage;