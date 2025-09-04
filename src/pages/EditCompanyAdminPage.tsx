// frontend/src/pages/EditCompanyAdminPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCompanyAdminById, updateCompanyAdmin } from '../services/api'; // Precisaremos destas funções
import { UserData, UserRole } from '../types/user';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';

// Interface para os dados do Company Admin (para exibição e edição)
interface CompanyAdminData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  company?: {
    id: string;
    name: string;
  };
}

const EditCompanyAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminId } = useParams<{ adminId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estados locais para o formulário
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState(''); // Para nova password
  const [confirmPassword, setConfirmPassword] = useState(''); // Para confirmar nova password
  const [isActive, setIsActive] = useState(true); // Estado para o status ativo/inativo
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // useQuery para buscar os detalhes do administrador
  const { data: adminDetails, isLoading, error: queryError } = useQuery<CompanyAdminData, Error>({
    queryKey: ['companyAdmin', adminId],
    queryFn: () => fetchCompanyAdminById(adminId!),
    enabled: !!adminId && user?.role === UserRole.PLATFORM_ADMIN,
  });

  // Efeito para popular o formulário quando os dados chegam
  useEffect(() => {
    if (adminDetails) {
      setFirstName(adminDetails.firstName);
      setLastName(adminDetails.lastName);
      setIsActive(adminDetails.isActive);
    }
  }, [adminDetails]);

  // useMutation para atualizar o administrador
  const { mutate: updateAdminMutate, isPending: isUpdating, error: updateError } = useMutation<any, Error, { adminId: string; adminData: any }>({
    mutationFn: updateCompanyAdmin,
    onSuccess: () => {
      setSuccess('Administrador atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['companyAdmin', adminId] });
      queryClient.invalidateQueries({ queryKey: ['companyAdmins'] }); // Invalida a lista geral
      setPassword('');
      setConfirmPassword('');
    },
  });

  // Handler para o submit do formulário
 const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setFormError(null);

    if (!firstName || !lastName) {
      setFormError('Por favor, preencha o primeiro e último nome.');
      return;
    }
    if (password && password !== confirmPassword) {
      setFormError('As passwords não coincidem.');
      return;
    }
    if (password && password.length < 6) {
      setFormError('A nova password deve ter pelo menos 6 caracteres.');
      return;
    }

    const updateData: any = { firstName, lastName, isActive };
    if (password) {
      updateData.password = password;
    }

    updateAdminMutate({ adminId: adminId!, adminData: updateData });
  };

  // Salvaguardas e estados de loading/error
  if (!user || user.role !== UserRole.PLATFORM_ADMIN) return <Navigate to="/dashboard" />;
  if (isLoading) return <div className="text-center p-6">A carregar detalhes...</div>;
  if (queryError) return <div className="text-center p-6 text-red-500">Erro: {queryError.message}</div>;
  if (!adminDetails) return <div className="text-center p-6">Administrador não encontrado.</div>;

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Administrador</CardTitle>
          <CardDescription>
            A editar o perfil de {adminDetails.firstName} {adminDetails.lastName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mensagens de feedback */}
          {formError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{formError}</div>}
          {updateError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{(updateError as Error).message}</div>}
          {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{success}</div>}

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
              <Label htmlFor="email">Email</Label>
              <Input type="email" id="email" value={adminDetails.email} readOnly />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="companyName">Empresa</Label>
              <Input type="text" id="companyName" value={adminDetails.company?.name || 'N/A'} readOnly />
            </div>
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Alterar Password (Opcional)</h3>
              <div className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="password">Nova Password</Label>
                  <Input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="confirmPassword">Confirmar Nova Password</Label>
                  <Input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={(checked) => setIsActive(Boolean(checked))} />
              <Label htmlFor="isActive">Administrador Ativo</Label>
            </div>
            <Button type="submit" className="w-full" disabled={isUpdating}>
              {isUpdating ? 'A Guardar...' : 'Guardar Alterações'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EditCompanyAdminPage;
