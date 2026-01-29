// frontend/src/pages/ListCompaniesPage.tsx (VERSÃO FINAL E CORRIGIDA)

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole } from '../types/user';
import CompanyDetailsPage from './CompanyEditPage';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchCompanies, activateDeactivateCompany, deleteCompany } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardDescription, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../components/ui/Table";
import { FilePenLine, Mail, Users, Ban, Trash2, LayoutDashboard, Copy, CreditCard, Plus} from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { toast } from 'react-hot-toast';


interface CompanyData {
  id: string;
  name: string;
  slug: string;
  email: string;
  nif: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  address?: string;
  phone?: string;
}

const ListCompaniesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCopied, copy] = useCopyToClipboard();

  // Estados relacionados apenas com a UI
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; company: CompanyData | null; }>({ visible: false, x: 0, y: 0, company: null });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  //const [showEditModal, setShowEditModal] = useState(false);
  //const [selectedCompanyForEdit, setSelectedCompanyForEdit] = useState<CompanyData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompanyForDelete, setSelectedCompanyForDelete] = useState<CompanyData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedCompanyForDeactivate, setSelectedCompanyForDeactivate] = useState<CompanyData | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  // Hook do TanStack Query para buscar os dados
  const { data: companies = [], isLoading, error } = useQuery<CompanyData[], Error>({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // Hook do TanStack Query para a mutação de ativar/desativar
  const activateDeactivateMutation = useMutation({
    mutationFn: activateDeactivateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  // Hook do TanStack Query para a mutação de apagar
  const deleteCompanyMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      handleCloseDeleteModal();
    },
  });

  // Handler para o menu de contexto
  const handleContextMenu = (e: React.MouseEvent, company: CompanyData) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, company: company });
  };

  // Efeito para fechar o menu de contexto
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  // Handlers que chamam as mutações
/*   const handleConfirmDeactivate = () => {
    if (!contextMenu.company) return;
    activateDeactivateMutation.mutate({
      companyId: contextMenu.company.id,
      isActive: !contextMenu.company.isActive,
    });
    setContextMenu({ ...contextMenu, visible: false });
  }; */

  const handleConfirmDeleteCompany = () => {
    if (!selectedCompanyForDelete || !confirmDelete) return;
    deleteCompanyMutation.mutate(selectedCompanyForDelete.id);
  };

  // Handlers para os modais e UI
/*   const handleEditCompany = () => {
    if (contextMenu.company) {
      setSelectedCompanyForEdit(contextMenu.company);
      setShowEditModal(true);
      setContextMenu({ ...contextMenu, visible: false });
    }
  }; */

/*   const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedCompanyForEdit(null);
  }; */

  const handleDeleteCompanyClick = () => {
    if (contextMenu.company) {
      setSelectedCompanyForDelete(contextMenu.company);
      setShowDeleteModal(true);
      setConfirmDelete(false);
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedCompanyForDelete(null);
    setConfirmDelete(false);
  };

  // Esta função agora serve para ATIVAR diretamente ou para iniciar o processo de DESATIVAÇÃO.
  const handleActivateDeactivate = () => {
    if (!contextMenu.company) return;

    if (contextMenu.company.isActive) {
      // Se a empresa está ATIVA, queremos DESATIVÁ-LA.
      // Então, abrimos o modal de confirmação.
      setSelectedCompanyForDeactivate(contextMenu.company);
      setShowDeactivateModal(true);
      setConfirmDeactivate(false);
    } else {
      // Se a empresa está INATIVA, queremos ATIVÁ-LA.
      // Fazemos isto diretamente, sem modal.
      activateDeactivateMutation.mutate({
        companyId: contextMenu.company.id,
        isActive: true, // Ativar
      });
    }

    // Fecha o menu de contexto em ambos os casos
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Abre o modal de desativação
  const handleDeactivateClick = () => {
    if (contextMenu.company) {
      setSelectedCompanyForDeactivate(contextMenu.company);
      setShowDeactivateModal(true);
      setConfirmDeactivate(false); // Resetar a checkbox
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  // Fecha o modal de desativação
  const handleCloseDeactivateModal = () => {
    setShowDeactivateModal(false);
    setSelectedCompanyForDeactivate(null);
    setConfirmDeactivate(false);
  };

  // Confirma a ação e chama a mutação (a antiga handleConfirmDeactivate)
  const handleConfirmDeactivate = () => {
    if (!selectedCompanyForDeactivate || !confirmDeactivate) return;
    
    activateDeactivateMutation.mutate({
      companyId: selectedCompanyForDeactivate.id,
      isActive: !selectedCompanyForDeactivate.isActive, // A lógica de inverter o estado
    });
    
    handleCloseDeactivateModal(); // Fecha o modal após a chamada
  };

  // Lógica de filtragem
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.nif.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center p-6">A carregar empresas...</div>;
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">Erro: {error.message}</div>;
  }
return (
    // Usamos um Card como contentor principal da página
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
      <div>
        <CardTitle className="text-2xl font-bold">Empresas</CardTitle>
        <CardDescription>
          Gestão de todas as empresas registadas no sistema.
        </CardDescription>
      </div>
      
      {/* Botão padronizado no topo direito */}
      <Button asChild>
        <Link to="/companies/create">
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Link>
      </Button>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Pesquisar empresas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="text-center text-gray-600">
          <p>Nenhuma empresa encontrada.</p>
        </div>
      ) : (
        <div>
          {/* 1. VISTA DE TABELA PARA ECRÃS MÉDIOS E GRANDES */}
          <div className="hidden md:block rounded-md border"> {/* 'hidden md:block' -> Escondido por defeito, visível a partir de 'md' */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>NIF</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="text-right">Ações</TableHead> {/* <-- NOVA COLUNA */}
                </TableRow>
              </TableHeader>
<TableBody>
  {filteredCompanies.map((company) => (
    <TableRow
      key={company.id}
      onContextMenu={(e) => handleContextMenu(e, company)}
      className="cursor-pointer hover:bg-gray-50/50 transition-colors"
    >
      <TableCell className="font-medium">{company.name}</TableCell>
      <TableCell>{company.email}</TableCell>
      <TableCell className="font-mono text-xs">{company.nif}</TableCell>
      <TableCell>
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${company.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {company.isActive ? 'Ativa' : 'Inativa'}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-1">
          {/* MANTIDAS TODAS AS TUAS AÇÕES ORIGINAIS */}
          <Button variant="ghost" size="icon" asChild title="Editar Empresa">
            <Link to={`/companies/edit/${company.id}`}><FilePenLine className="h-4 w-4" /></Link>
          </Button>
          <Button variant="ghost" size="icon" asChild title="Configurar Pagamentos">
            <Link to={`/companies/payment-config/${company.id}`}><CreditCard className="h-4 w-4" /></Link>
          </Button>    
          <Button variant="ghost" size="icon" asChild title="Editar Homepage">
            <Link to={`/companies/homepage/edit/${company.id}`}><LayoutDashboard className="h-4 w-4" /></Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const url = `${window.location.protocol}//${company.slug}.${process.env.REACT_APP_MAIN_DOMAIN}${window.location.port ? ':' + window.location.port : ''}`;
              copy(url);
              toast.success('Link copiado!');
            }}
            title="Copiar Link Público"
          >
            <Copy className="h-4 w-4" />
          </Button>    
          <Button variant="ghost" size="icon" asChild title="Administradores">
            <Link to={`/company-admins/list/${company.id}`}><Users className="h-4 w-4" /></Link>
          </Button>
          <Button variant="ghost" size="icon" asChild title="Configurar SMTP">
            <Link to={`/companies/smtp-config/${company.id}`}><Mail className="h-4 w-4" /></Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
            </Table>
          </div>

          {/* 2. VISTA DE CARTÕES PARA ECRÃS PEQUENOS */}
          <div className="grid grid-cols-1 gap-4 md:hidden">{ 
            filteredCompanies.map((company) => (
              <div
                key={company.id}
                onContextMenu={(e) => handleContextMenu(e, company)}
                className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                <div className="font-bold text-lg">{company.name}</div>
                <div className="text-sm text-muted-foreground">{company.email}</div>
                <div className="text-sm"><strong>NIF:</strong> {company.nif}</div>
                <div className="text-sm">
                  <strong>Status:</strong> 
                  <span className={company.isActive ? 'text-green-600' : 'text-red-600'}>
                    {company.isActive ? ' Ativa' : ' Inativa'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        
        {/* O botão Voltar já não é necessário aqui, pois a navegação é feita pela Sidebar/Header */}
      </CardContent>


      {/* Menu de Contexto para as ações da empresa */}
      {contextMenu.visible && contextMenu.company && (
        <div
          ref={contextMenuRef}
          className="absolute z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <Link
            to={`/companies/edit/${contextMenu.company.id}`} // <-- NOVO LINK
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            onClick={() => setContextMenu({ ...contextMenu, visible: false })}
          >
            <FilePenLine className="h-4 w-4" />
            Editar
          </Link>
          <Link 
              to={`/companies/payment-config/${contextMenu.company.id}`}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => setContextMenu({ ...contextMenu, visible: false })}
            >
              <CreditCard className="h-4 w-4" />
              Config. Pagamentos
            </Link>          
          <Link
            to={`/companies/homepage/edit/${contextMenu.company.id}`} // <-- NOVO LINK
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            onClick={() => setContextMenu({ ...contextMenu, visible: false })}
          >
            <LayoutDashboard className="h-4 w-4" />
            Editar página inicial
          </Link>

          {/* Nova opção para ver administradores */}
          <Link 
            to={`/company-admins/list/${contextMenu.company.id}`}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            onClick={() => setContextMenu({ ...contextMenu, visible: false })} // Fechar o menu
          >
            <Users className="h-4 w-4" />
            Administradores
          </Link>
          
          {/* Opção para configurar SMTP, visível apenas para Platform Admin */}
          {user?.role === UserRole.PLATFORM_ADMIN && (
            <Link
              to={`/companies/smtp-config/${contextMenu.company.id}`}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => setContextMenu({ ...contextMenu, visible: false })} // Fechar o menu
            >
              <Mail className="h-4 w-4" />
              Configurar SMTP
            </Link>
          )}
          {user?.role === UserRole.PLATFORM_ADMIN && (
            <button
              onClick={
                contextMenu.company.isActive
                  ? handleDeactivateClick // Se está ativa, abre o modal de confirmação para desativar
                  : handleActivateDeactivate // Se está inativa, ativa diretamente sem modal
              }
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {contextMenu.company.isActive ? 'Desativar' : 'Ativar'}
            </button>          
          )}
          {/* NOVO: Opção para Eliminar empresa, visível apenas para Platform Admin */}
          {user?.role === UserRole.PLATFORM_ADMIN && (
            <button
              onClick={handleDeleteCompanyClick}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          )}
        </div>
      )}

      {/* Modal de Edição (CompanyDetailsPage como overlay) */}
{/*       {showEditModal && selectedCompanyForEdit && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-40 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 relative">
            <button
              onClick={handleCloseEditModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              &times;
            </button>
            <CompanyDetailsPage
              companyId={selectedCompanyForEdit.id}
              onClose={handleCloseEditModal} // Usar handleCloseEditModal como callback de "voltar"
            />
          </div>
        </div>
      )} */}

      {/* NOVO: Modal de Confirmação de Eliminação */}
      {showDeleteModal && selectedCompanyForDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Confirmar Eliminação</h3>
            <p className="text-gray-700 mb-4">
              Tem a certeza que deseja eliminar a empresa <span className="font-semibold">"{selectedCompanyForDelete.name}"</span>?
              Esta ação é irreversível e removerá todos os dados associados a esta empresa.
            </p>
            <div className="flex items-center mb-6">
              <input
                id="confirmDeleteCompany"
                type="checkbox"
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
              />
              <label htmlFor="confirmDeleteCompany" className="ml-2 block text-sm text-gray-900">
                Compreendo que esta ação é irreversível e desejo continuar.
              </label>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCloseDeleteModal}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteCompany}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  confirmDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                disabled={!confirmDelete || deleteCompanyMutation.isPending}
              >
                {deleteCompanyMutation.isPending ? 'A Eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* NOVO: Modal de Confirmação de Desativação */}
      {showDeactivateModal && selectedCompanyForDeactivate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold mb-4">Confirmar Desativação</h3>
            <p className="text-gray-700 mb-4">
              Tem a certeza que deseja desativar a empresa <span className="font-semibold">"{selectedCompanyForDeactivate.name}"</span>?
              <br/><br/>
              Esta ação irá também **desativar todos os administradores** associados a esta empresa, impedindo-os de aceder à plataforma.
            </p>
            <div className="flex items-center mb-6">
              <Checkbox
                id="confirmDeactivateCompany"
                checked={confirmDeactivate}
                onCheckedChange={(checked) => setConfirmDeactivate(Boolean(checked))}
              />
              <Label htmlFor="confirmDeactivateCompany" className="ml-2">
                Compreendo as consequências e desejo continuar.
              </Label>
            </div>
            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={handleCloseDeactivateModal}>
                Cancelar
              </Button>
              <Button
                variant="destructive" // Usar a variante destrutiva
                onClick={handleConfirmDeactivate}
                disabled={!confirmDeactivate || activateDeactivateMutation.isPending}
              >
                {activateDeactivateMutation.isPending ? 'A Desativar...' : 'Desativar Empresa'}
              </Button>
            </div>
          </div>
        </div>
      )}      
    </Card>
);
};

export default ListCompaniesPage;
