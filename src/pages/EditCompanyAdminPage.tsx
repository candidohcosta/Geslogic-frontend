// frontend/src/pages/EditCompanyAdminPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchCompanyAdminById, updateCompanyAdmin } from '../services/api';
import { UserRole } from '../types/user';

import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { Button } from '../components/ui/Button';
import { CardDescription } from '../components/ui/Card';
import { ShieldUser, Loader2, Building2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

type CompanyAdminData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  company?: { id: string; name: string };
};

export default function EditCompanyAdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { adminId } = useParams<{ adminId: string }>();

  // Pode vir da lista (UX mais rápida)
  const preloadedAdmin = (location.state as any)?.admin as CompanyAdminData | undefined;

  // === Guardas de acesso ===
  const isPlatformAdmin = user?.role === UserRole.PLATFORM_ADMIN;
  const isCompanyAdmin  = user?.role === UserRole.COMPANY_ADMIN;

  // Para comparar empresas no frontend (além do backend)
  const currentCompanyId: string | undefined =
    (user as any)?.company?.id || (user as any)?.companyId || undefined;

  // === Carregar dados (só se não vier preloaded) ===
  const {
    data: adminRemote,
    isLoading,
    isError,
    error,
  } = useQuery<CompanyAdminData, Error>({
    queryKey: ['companyAdmin', adminId],
    queryFn: () => fetchCompanyAdminById(adminId!),
    enabled: !!adminId && !preloadedAdmin,
  });

  // Preferimos o admin do state; caso contrário o remoto
  const admin = preloadedAdmin ?? adminRemote ?? null;

  // COMPANY_ADMIN só pode editar admins da sua empresa
  const isForbiddenForCompanyAdmin =
    !!admin &&
    isCompanyAdmin &&
    (!!admin.company?.id && !!currentCompanyId) &&
    admin.company.id !== currentCompanyId;

  // === Estado do formulário ===
  const [firstName, setFirstName] = useState<string>(admin?.firstName ?? '');
  const [lastName, setLastName]   = useState<string>(admin?.lastName ?? '');
  const [password, setPassword]   = useState<string>('');       // opcional
  const [confirmPassword, setConfirmPassword] = useState<string>(''); // opcional
  const [isActive, setIsActive]   = useState<boolean>(admin?.isActive ?? true);

  // Inicializar quando admin chega/atualiza
  useEffect(() => {
    if (admin) {
      setFirstName(admin.firstName || '');
      setLastName(admin.lastName || '');
      setIsActive(Boolean(admin.isActive));
    }
  }, [admin]);

  // === Mutation: atualizar ===
  const updateMutation = useMutation({
    mutationFn: updateCompanyAdmin, // ({ adminId, adminData })
    onSuccess: () => {
      toast.success('Administrador atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['companyAdmin', adminId] });
      queryClient.invalidateQueries({ queryKey: ['companyAdmins'] });
      setPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao atualizar administrador.');
    },
  });

  // === Validações UX ===
  const canSave =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    (!password || (password.length >= 6 && password === confirmPassword));

  const handleSave = () => {
    if (!adminId || !admin) return;

    // Proteção extra no frontend (além do backend)
    if (isForbiddenForCompanyAdmin) {
      toast.error('Sem autorização para editar administradores de outra empresa.');
      return;
    }

    if (!canSave) {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error('Por favor, preencha o primeiro e último nome.');
        return;
      }
      if (password && password !== confirmPassword) {
        toast.error('As passwords não coincidem.');
        return;
      }
      if (password && password.length < 6) {
        toast.error('A nova password deve ter pelo menos 6 caracteres.');
        return;
      }
    }

    const adminData: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      isActive,
    };
    if (password) adminData.password = password;

    updateMutation.mutate({ adminId, adminData });
  };

  const handleCancel = () => navigate(-1);

  // === Secções (DetailFormTemplate) ===
  const sections = useMemo(() => {
    const dadosSection = {
      title: 'Dados do Utilizador',
      description: 'Informação base do administrador da empresa.',
      accent: true,
      content: (
        <div className="space-y-4">
          {/* Nome + Apelido */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="firstName">Primeiro Nome <span className="text-red-500">*</span></Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex.: Ana"
                disabled={isForbiddenForCompanyAdmin}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lastName">Último Nome <span className="text-red-500">*</span></Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex.: Silva"
                disabled={isForbiddenForCompanyAdmin}
              />
            </div>
          </div>

          {/* Email (só leitura) */}
          <div className="grid gap-1.5">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" /> Email
            </Label>
            <Input id="email" type="email" value={admin?.email ?? ''} readOnly />
            <CardDescription>O email é o utilizador de autenticação e não pode ser alterado.</CardDescription>
          </div>

          {/* Empresa (só leitura) */}
          <div className="grid gap-1.5">
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" /> Empresa
            </Label>
            <Input id="companyName" value={admin?.company?.name || 'N/A'} readOnly />
          </div>
        </div>
      ),
    };

    const segurancaSection = {
      title: 'Segurança',
      description: 'Defina uma nova password (opcional).',
      accent: true,
      content: (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="password">Nova Password</Label>
              <Input
                id="password"
                type="password"
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 10 caracteres"
                disabled={isForbiddenForCompanyAdmin}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirmPassword">Confirmar Nova Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                minLength={10}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova password"
                disabled={isForbiddenForCompanyAdmin}
              />
            </div>
          </div>
          <CardDescription>
            Se não pretender alterar a password, deixe estes campos em branco.
          </CardDescription>
        </div>
      ),
    };

    const estadoSection = {
      title: 'Estado',
      description: 'Ative/desative o acesso deste administrador.',
      accent: true,
      content: (
        <div className="flex items-center gap-2">
          <Checkbox
            id="isActive"
            checked={isActive}
            onCheckedChange={(checked) => setIsActive(Boolean(checked))}
            disabled={isForbiddenForCompanyAdmin}
          />
          <Label htmlFor="isActive">Administrador Ativo</Label>
        </div>
      ),
    };

    return [dadosSection, segurancaSection, estadoSection];
  }, [admin, firstName, lastName, password, confirmPassword, isActive, isForbiddenForCompanyAdmin]);

  // === Ações (footer) ===
  const footerActions = (
    <>
      <Button variant="outline" size="sm" onClick={handleCancel}>
        Voltar
      </Button>
      <Button
        onClick={handleSave}
        size="sm"
        disabled={
          updateMutation.isPending ||
          !canSave ||
          (!admin && !preloadedAdmin && isLoading) ||
          isForbiddenForCompanyAdmin
        }
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> A Guardar…
          </>
        ) : 'Guardar Alterações'}
      </Button>
    </>
  );

  // === Ações (header) — iguais ao footer ===
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleCancel}>
        Voltar
      </Button>
      <Button
        onClick={handleSave}
        size="sm"
        disabled={
          updateMutation.isPending ||
          !canSave ||
          (!admin && !preloadedAdmin && isLoading) ||
          isForbiddenForCompanyAdmin
        }
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> A Guardar…
          </>
        ) : 'Guardar Alterações'}
      </Button>
    </div>
  );

  // Se não for PA nem CA → fora
  if (!user || (!isPlatformAdmin && !isCompanyAdmin)) {
    return <Navigate to="/dashboard" />;
  }  
  // === Estados de carregamento/erro (quando não veio do state) ===
  if (!preloadedAdmin && isLoading) {
    return <div className="p-6">A carregar detalhes…</div>;
  }
  if (!preloadedAdmin && isError) {
    return <div className="p-6 text-red-600">Erro: {(error as Error)?.message || 'Falha ao obter administrador.'}</div>;
  }
  if (!admin) {
    return <div className="p-6">Administrador não encontrado.</div>;
  }

  // COMPANY_ADMIN a tentar aceder a admin de outra empresa → 403 UX
  if (isForbiddenForCompanyAdmin) {
    return (
      <div className="p-6 text-red-600">
        Sem autorização para editar um administrador de outra empresa.
      </div>
    );
  }

  return (
    <DetailFormTemplate
      header={{
        icon: ShieldUser,
        title: 'Editar Administrador de Empresa',
        subtitle: (
          <>
            {admin.company?.name ? (
              <>Empresa: <b>{admin.company.name}</b> — Utilizador: <b>{admin.firstName} {admin.lastName}</b> ({admin.email})</>
            ) : (
              <>Utilizador: <b>{admin.firstName} {admin.lastName}</b> ({admin.email})</>
            )}
          </>
        ),
        actions: headerActions,
      }}
      sections={sections}
      actions={footerActions}
      columnsMd={2}
    />
  );
}