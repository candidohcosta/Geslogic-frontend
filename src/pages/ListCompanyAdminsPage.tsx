// frontend/src/pages/ListCompanyAdminsPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCompanyAdmins, activateDeactivateAdmin, deleteCompanyAdmin } from '../services/api';
import { UserData, UserRole } from '../types/user';
import CreateCompanyAdminPage from './CreateCompanyAdminPage';
import CompanyEditPage from './CompanyEditPage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Label } from '../components/ui/Label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { FilePenLine, Building, Trash2 } from 'lucide-react';

interface CompanyAdminData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    slug: string;
  };
}

const ListCompanyAdminsPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estados locais apenas para a UI
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; admin: CompanyAdminData | null; }>({ visible: false, x: 0, y: 0, admin: null });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
/*   const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [selectedCompanyIdForEdit, setSelectedCompanyIdForEdit] = useState<string | null>(null); */
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteAdminModal, setShowDeleteAdminModal] = useState(false);
  const [selectedAdminForDelete, setSelectedAdminForDelete] = useState<CompanyAdminData | null>(null);
  const [confirmDeleteAdmin, setConfirmDeleteAdmin] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // useQuery para buscar a lista de administradores
  const { data: companyAdmins = [], isLoading, error: queryError } = useQuery<CompanyAdminData[], Error>({
    queryKey: ['companyAdmins', companyId],
    queryFn: () => fetchCompanyAdmins(companyId),
    enabled: !!user,
  });

  // useMutation para ativar/desativar
  const { mutate: activateDeactivateMutate, error: activateDeactivateError } = useMutation({
    mutationFn: activateDeactivateAdmin,
    onSuccess: () => {
      setSuccess('Status do administrador atualizado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['companyAdmins', companyId] });
    },
  });

  // useMutation para apagar
  const { mutate: deleteAdminMutate, isPending: isDeleting, error: deleteError } = useMutation({
    mutationFn: deleteCompanyAdmin,
    onSuccess: () => {
      setSuccess('Administrador eliminado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['companyAdmins', companyId] });
      handleCloseDeleteAdminModal();
    },
  });

  const companyNameFromData = companyAdmins.length > 0 ? companyAdmins[0].company?.name : undefined;

  // Handlers
  const handleCreateAdminSuccess = () => {
    setShowCreateAdminModal(false);
    queryClient.invalidateQueries({ queryKey: ['companyAdmins', companyId] });
  };
  const handleCloseCreateAdminModal = () => setShowCreateAdminModal(false);
  const handleContextMenu = (e: React.MouseEvent, admin: CompanyAdminData) => {
    e.preventDefault();
    if (user?.role === UserRole.COMPANY_ADMIN && admin.id === user.id) return;
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, admin });
  };
  const handleActivateDeactivateAdmin = () => {
    if (!contextMenu.admin) return;
    activateDeactivateMutate({ adminId: contextMenu.admin.id, isActive: !contextMenu.admin.isActive });
    setContextMenu({ ...contextMenu, visible: false });
  };
/*   const handleCloseEditCompanyModal = () => {
    setShowEditCompanyModal(false);
    setSelectedCompanyIdForEdit(null);
  }; */
  const handleDeleteAdminClick = () => {
    if (contextMenu.admin) {
      setSelectedAdminForDelete(contextMenu.admin);
      setShowDeleteAdminModal(true);
      setConfirmDeleteAdmin(false);
      setContextMenu({ ...contextMenu, visible: false });
    }
  };
  const handleConfirmDeleteAdmin = () => {
    if (!selectedAdminForDelete || !confirmDeleteAdmin) return;
    deleteAdminMutate(selectedAdminForDelete.id);
  };
  const handleCloseDeleteAdminModal = () => {
    setShowDeleteAdminModal(false);
    setSelectedAdminForDelete(null);
    setConfirmDeleteAdmin(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);
  
  const filteredCompanyAdmins = companyAdmins.filter(admin =>
    admin.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (admin.company?.name && admin.company.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!user) return <Navigate to="/login" />;
  if (isLoading) return <div className="p-6 text-center">A carregar lista de administradores...</div>;
  if (queryError) return <div className="p-6 text-center text-red-600">Erro: {queryError.message}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {companyId ? `Administradores da Empresa: ${companyNameFromData || '...'}` : 'Gestão de Administradores'}
        </CardTitle>
        <CardDescription>
          {companyId ? `Apresenta os administradores da empresa '${companyNameFromData || '...'}'` : 'Lista de todos os administradores de empresa registados no sistema.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Pesquisar administradores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            //className="max-w-sm"
          />
        </div>

        {filteredCompanyAdmins.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            <p>Nenhum administrador encontrado.</p>
          </div>
        ) : (
          <div>
            {/* VISTA DE TABELA PARA DESKTOP */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    {!companyId && <TableHead>Empresa</TableHead>} {/* Só mostra a coluna se não estivermos a filtrar */}
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanyAdmins.map((admin) => (
                    <TableRow key={admin.id} onContextMenu={(e) => handleContextMenu(e, admin)} className="cursor-pointer">
                      <TableCell className="font-medium">{admin.firstName} {admin.lastName}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      {!companyId && <TableCell>{admin.company?.name || 'N/A'}</TableCell>}
                      <TableCell>{admin.isActive ? 'Sim' : 'Não'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button variant="ghost" size="icon" asChild title="Editar Administrador">
                            <Link to={`/company-admins/edit/${admin.id}`}><FilePenLine className="h-4 w-4" /></Link>
                          </Button>
                          {admin.company?.id && (
                            <Button variant="ghost" size="icon" asChild title="Editar Empresa">
                              <Link to={`/companies/edit/${admin.company.id}`}><Building className="h-4 w-4" /></Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* VISTA DE CARTÕES PARA MOBILE */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredCompanyAdmins.map((admin) => (
                <div key={admin.id} onContextMenu={(e) => handleContextMenu(e, admin)} className="rounded-lg border p-4 space-y-2">
                  <div className="font-bold text-lg">{admin.firstName} {admin.lastName}</div>
                  <div className="text-sm text-muted-foreground">{admin.email}</div>
                  {!companyId && <div className="text-sm"><strong>Empresa:</strong> {admin.company?.name || 'N/A'}</div>}
                  <div className="text-sm"><strong>Status:</strong> <span className={admin.isActive ? 'text-green-600' : 'text-red-600'}>{admin.isActive ? ' Ativo' : ' Inativo'}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="grid w-full max-w-sm items-center gap-1.5">
            {user.role === UserRole.PLATFORM_ADMIN && companyId && (
              <Button onClick={() => setShowCreateAdminModal(true)}>
                Criar Administrador
              </Button>
            )}
        </div>
        </CardFooter>
        {contextMenu.visible && contextMenu.admin && (
          <div ref={contextMenuRef} className="absolute z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1" style={{ top: contextMenu.y, left: contextMenu.x }}>
            {user.role === UserRole.PLATFORM_ADMIN && (
              <Link to={`/company-admins/edit/${contextMenu.admin.id}`} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setContextMenu({ ...contextMenu, visible: false })}>
                Editar Admin
              </Link>
            )}
            {user.role === UserRole.PLATFORM_ADMIN && contextMenu.admin.company?.id && (
  /*             <button onClick={() => { if(contextMenu.admin?.company?.id) { setSelectedCompanyIdForEdit(contextMenu.admin.company.id); setShowEditCompanyModal(true); setContextMenu(c => ({...c, visible: false})); }}} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Editar Empresa
              </button> */
                <Link
                  to={`/companies/edit/${contextMenu.admin.company.id}`}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setContextMenu({ ...contextMenu, visible: false })}
                >
                  Editar Empresa
                </Link>
            )}
            {(user.role === UserRole.PLATFORM_ADMIN || (user.role === UserRole.COMPANY_ADMIN && contextMenu.admin.id !== user.id)) && (
              <button onClick={handleActivateDeactivateAdmin} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                {contextMenu.admin.isActive ? 'Desativar' : 'Ativar'}
              </button>
            )}
            {user.role === UserRole.PLATFORM_ADMIN && (
              <button onClick={handleDeleteAdminClick} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Eliminar
              </button>
            )}
          </div>
        )}

        {showCreateAdminModal && companyId && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-40 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 relative">
              <button onClick={handleCloseCreateAdminModal} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
              <CreateCompanyAdminPage onClose={handleCreateAdminSuccess} preselectedCompanyId={companyId} />
            </div>
          </div>
        )}

  {/*       {showEditCompanyModal && selectedCompanyIdForEdit && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-40 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 relative">
              <button onClick={handleCloseEditCompanyModal} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
              <CompanyEditPage companyId={selectedCompanyIdForEdit} onClose={handleCloseEditCompanyModal} />
            </div>
          </div>
        )} */}
        
        {showDeleteAdminModal && selectedAdminForDelete && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Confirmar Eliminação</h3>
              <p className="text-gray-700 mb-4">Tem a certeza...?</p>
              <div className="flex items-center mb-6">
                <input type="checkbox" id="confirmDeleteAdmin" checked={confirmDeleteAdmin} onChange={(e) => setConfirmDeleteAdmin(e.target.checked)} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"/>
                <label htmlFor="confirmDeleteAdmin" className="ml-2 block text-sm text-gray-900">Compreendo que esta ação é irreversível...</label>
              </div>
              <div className="flex justify-end space-x-4">
                <button onClick={handleCloseDeleteAdminModal} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancelar</button>
                <button onClick={handleConfirmDeleteAdmin} disabled={!confirmDeleteAdmin || isDeleting} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    confirmDeleteAdmin ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}>
                  {isDeleting ? 'A Eliminar...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
    </Card>
  );
};

export default ListCompanyAdminsPage;
