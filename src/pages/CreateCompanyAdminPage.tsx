// frontend/src/pages/CreateCompanyAdminPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCompanyAdmin, fetchCompanies } from '../services/api';
import { UserData, UserRole } from '../types/user';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/Select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';

// Interface para os dados da empresa (para a lista de seleção)
interface CompanyOption {
  id: string;
  name: string;
}

interface CreateCompanyAdminPageProps {
  preselectedCompanyId?: string;
  onClose?: () => void; // Substitui onBack e onCreateSuccess
}

const CreateCompanyAdminPage: React.FC<CreateCompanyAdminPageProps> = ({ preselectedCompanyId, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState<string>(preselectedCompanyId || ''); // Define o ID da empresa, se pré-selecionado
  //const [companies, setCompanies] = useState<CompanyOption[]>([]); // Lista de empresas para seleção
  //const [loading, setLoading] = useState(false);
  //const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // useQuery para buscar a lista de empresas (só é executado se necessário)
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    // Só busca as empresas se for Platform Admin E se não houver uma empresa pré-selecionada
    enabled: user?.role === UserRole.PLATFORM_ADMIN && !preselectedCompanyId,
  });
  
  // useMutation para criar o administrador
  const createAdminMutation = useMutation({
    mutationFn: createCompanyAdmin,
    onSuccess: (newAdminData) => {
      setSuccess(`Administrador "${newAdminData.user.firstName}" criado com sucesso!`);
      // Invalida a query de admins para que a lista seja atualizada
      queryClient.invalidateQueries({ queryKey: ['companyAdmins'] }); 
      
      // Limpa o formulário
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      if (!preselectedCompanyId && companies.length > 0) {
        setCompanyId(companies[0].id);
      }
      
      // Se for um modal, fecha-o. Senão, navega.
      if (onClose) {
        onClose();
      } else {
        navigate('/company-admins/list');
      }
    },
  });

  // Efeito para definir o primeiro companyId quando as empresas são carregadas
  useEffect(() => {
    if (!preselectedCompanyId && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [companies, preselectedCompanyId]);



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null); // Limpa mensagens de sucesso antigas
    setFormError(null); // Limpa mensagens de erro de formulário antigas

    // 1. Validação de campos obrigatórios
    if (!firstName || !lastName || !email || !password || !companyId) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // 2. Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Por favor, insira um endereço de email válido.');
      return;
    }

    // 3. Validação de comprimento da password
    if (password.length < 6) {
      setFormError('A password deve ter pelo menos 6 caracteres.');
      return;
    }

    // A validação de permissão já é feita pela salvaguarda no topo do componente,
    // mas podemos mantê-la aqui por segurança extra.
    if (user?.role !== UserRole.PLATFORM_ADMIN) {
      setFormError('Acesso negado.');
      return;
    }
    
    // Prepara os dados para enviar à API
    const adminData = {
      firstName,
      lastName,
      email,
      password,
      companyId,
    };
    
    // Chama a mutação para criar o admin
    createAdminMutation.mutate(adminData);
  };


  // Salvaguarda de permissão
  if (!user || user.role !== UserRole.PLATFORM_ADMIN) {
    return <Navigate to="/dashboard" />;
  }

  // O nome da empresa para exibição
  const companyName = preselectedCompanyId
    ? companies.find((c: CompanyOption) => c.id === preselectedCompanyId)?.name // Ainda depende da lista de 'companies' que pode não ser carregada
    : undefined;

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>
            {preselectedCompanyId
              //? `Criar Administrador para: ${preselectedCompanyId}`
              ? `Criar Administrador para: ${companyName}`
              : 'Criar Novo Administrador de Empresa'}
          </CardTitle>
          <CardDescription>
            Preencha os detalhes abaixo para criar um novo administrador de empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mensagens de feedback */}
          {formError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Erro de Validação: </strong>
              <span className="block sm:inline">{formError}</span>
            </div>
          )}

          {createAdminMutation.isError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Erro:</strong>
              <span className="block sm:inline"> {createAdminMutation.error.message}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Sucesso:</strong>
              <span className="block sm:inline"> {success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="firstName">Primeiro Nome <span className="text-red-500">*</span></Label>
              <Input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="lastName">Último Nome <span className="text-red-500">*</span></Label>
              <Input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
              <Input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="company">Empresa <span className="text-red-500">*</span></Label>
              {preselectedCompanyId ? (
                <Input type="text" id="companyNameDisplay" value={companyName || 'Empresa Pré-selecionada'} disabled />
              ) : (
                <Select value={companyId} onValueChange={setCompanyId} required disabled={isLoadingCompanies}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCompanies ? (
                      <SelectItem value="loading" disabled>A carregar empresas...</SelectItem>
                    ) : (
                      companies.map((comp: CompanyOption) => (
                        <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={createAdminMutation.isPending}>
              {createAdminMutation.isPending ? 'A criar...' : 'Criar Administrador'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => { onClose ? onClose() : navigate(-1); }}
          >
            {onClose ? 'Cancelar' : 'Voltar'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateCompanyAdminPage;
