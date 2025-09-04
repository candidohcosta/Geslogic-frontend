// frontend/src/pages/EmailTemplatesPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState, useMemo } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEmailTemplates, deleteEmailTemplate, fetchCompanies } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { UserRole } from '../types/user';
import { EmailTemplateType } from '../types/email';
import { useDebounce } from '../hooks/useDebounce';
import { FilePenLine, Trash2, PlusCircle, Eye } from 'lucide-react';

const EmailTemplatesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Estados para filtros e ordenação
  const [filters, setFilters] = useState({ name: '', subject: '', type: '', companyId: '' });
  const debouncedFilters = useDebounce(filters, 500);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  
  // Estados para o modal de delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any | null>(null);
  
  const queryFilters = useMemo(() => ({ ...debouncedFilters, sortBy, sortOrder }), [debouncedFilters, sortBy, sortOrder]);

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['emailTemplates', queryFilters],
    queryFn: () => fetchEmailTemplates(queryFilters),
    enabled: !!user,
  });

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: fetchCompanies, enabled: user?.role === UserRole.PLATFORM_ADMIN });

  const { mutate: deleteTemplate, isPending: isDeleting } = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setShowDeleteModal(false);
      setTemplateToDelete(null);
    },
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectFilterChange = (name: string, value: string) => setFilters(prev => ({ ...prev, [name]: value === 'all' ? '' : value }));
  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortOrder(current => (current === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(columnName);
      setSortOrder('ASC');
    }
  };
  const handleDeleteClick = (template: any) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };
  const handleConfirmDelete = () => {
    if (templateToDelete) {
      deleteTemplate(templateToDelete.id);
    }
  };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestão de Templates de Email</CardTitle>
              <CardDescription>Crie e edite os modelos de email para a sua comunicação.</CardDescription>
            </div>
            <Button asChild>
              <Link to="/email-templates/new"><PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Template</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Button variant="ghost" onClick={() => handleSort('name')}>Nome {sortBy === 'name' && (sortOrder === 'ASC' ? '▲' : '▼')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => handleSort('type')}>Tipo {sortBy === 'type' && (sortOrder === 'ASC' ? '▲' : '▼')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => handleSort('subject')}>Assunto {sortBy === 'subject' && (sortOrder === 'ASC' ? '▲' : '▼')}</Button></TableHead>
                  {user.role === UserRole.PLATFORM_ADMIN && <TableHead><Button variant="ghost" onClick={() => handleSort('company.name')}>Empresa {sortBy === 'company.name' && (sortOrder === 'ASC' ? '▲' : '▼')}</Button></TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="p-1"><Input name="name" placeholder="Pesquisar..." value={filters.name} onChange={handleFilterChange} className="h-8" /></TableHead>
                  <TableHead className="p-1">
                    <Select value={filters.type} onValueChange={(v) => handleSelectFilterChange('type', v)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Filtrar..." /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todos</SelectItem>{Object.values(EmailTemplateType).sort().map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="p-1"><Input name="subject" placeholder="Pesquisar..." value={filters.subject} onChange={handleFilterChange} className="h-8" /></TableHead>
                  {user.role === UserRole.PLATFORM_ADMIN && (
                    <TableHead className="p-1">
                      <Select value={filters.companyId} onValueChange={(v) => handleSelectFilterChange('companyId', v)}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Filtrar..." /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="platform">Plataforma</SelectItem>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableHead>
                  )}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
<TableBody>
  {isLoading && (
    <TableRow>
      <TableCell colSpan={5} className="text-center">A carregar templates...</TableCell>
    </TableRow>
  )}
  {error && (
    <TableRow>
      <TableCell colSpan={5} className="text-center text-red-500">{(error as Error).message}</TableCell>
    </TableRow>
  )}
  
  {/* O .map() agora tem a lógica de permissões dentro dele */}
  {templates.map((template: any) => {
    
  const isPlatformAdmin = user?.role === UserRole.PLATFORM_ADMIN;

  // Um template é da plataforma se o seu objeto 'company' for nulo.
  const isPlatformTemplate = !template.company; 
  
  // Um Company Admin pode editar se o 'template.company.id' for igual ao 'user.companyId'.
  const canCompanyAdminEdit = user?.role === UserRole.COMPANY_ADMIN && template.company?.id === user?.companyId;


    // --- O NOSSO BLOCO DE DEPURAÇÃO ---
/*     console.group(`Verificando Template: ${template.name}`);
    console.log("Template Object:", template);
    console.log("Template Company ID:", template.companyId);
    console.log("User Object:", user);
    console.log("User Company ID:", user?.companyId);
    
    const isAdmin = user?.role === UserRole.COMPANY_ADMIN;
    const isOwnedByAdmin = isAdmin && template.companyId === user?.companyId;
    
    console.log("isOwnedByAdmin:", isOwnedByAdmin);
    console.groupEnd(); */
    // --- FIM DO BLOCO DE DEPURAÇÃO ---


    return (
      <TableRow key={template.id}>
        <TableCell className="font-medium">{template.name}</TableCell>
        <TableCell>{template.type}</TableCell>
        <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
        
        {isPlatformAdmin && <TableCell>{template.company?.name || 'Plataforma'}</TableCell>}
        
        <TableCell className="text-right">
          <div className="flex justify-end space-x-2">
            
            {/* 2. O BOTÃO DE EDITAR AGORA É CONDICIONAL */}
            {/* Ele aparece se for Platform Admin OU se o Company Admin for o "dono" */}
            {(isPlatformAdmin || canCompanyAdminEdit) && (
              <Button variant="ghost" size="icon" asChild title="Editar">
                <Link to={`/email-templates/edit/${template.id}`}><FilePenLine className="h-4 w-4" /></Link>
              </Button>
            )}

            {/* 3. O BOTÃO DE APAGAR TAMBÉM É CONDICIONAL */}
            {/* Mesma lógica do botão de editar */}
            {(isPlatformAdmin || canCompanyAdminEdit) && (
              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(template)} className="text-red-600 hover:text-red-700" title="Apagar">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {/* 4. FEEDBACK PARA O COMPANY ADMIN EM TEMPLATES DA PLATAFORMA */}
            {/* Se for um Company Admin e o template for da plataforma, mostramos um ícone de "olho" */}
            {(user?.role === UserRole.COMPANY_ADMIN && isPlatformTemplate) && (
              <Button variant="ghost" size="icon" asChild title="Ver Template (não pode editar)">
                <Link to={`/email-templates/edit/${template.id}`}><Eye className="h-4 w-4 text-gray-400" /></Link>
              </Button>
            )}
            
          </div>
        </TableCell>
      </TableRow>
    );
  })}
</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {showDeleteModal && templateToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmar Eliminação</CardTitle>
              <CardDescription>Tem a certeza que deseja apagar o template "{templateToDelete.name}"?</CardDescription>
            </CardHeader>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'A Apagar...' : 'Apagar Template'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};

export default EmailTemplatesPage;