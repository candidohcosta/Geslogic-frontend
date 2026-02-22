// src/pages/PlatformAdminFormPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';

import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { CardDescription } from '../components/ui/Card';
import { ShieldUser, Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  createPlatformAdmin,
  updatePlatformAdmin,
  sendPlatformAdminPasswordResetEmail,
  setPlatformAdminPassword,
  fetchPlatformAdminById,
} from '../services/api';
import { PlatformAdminType, UserData, UserRole } from '../types/user';

export default function PlatformAdminFormPage() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const preloadedAdmin = (location.state as any)?.admin as UserData | undefined;

  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isEdit = Boolean(id);

  // === Fetch remoto (só se edição e não veio preloaded) ===
  const { data: adminDataRemote, isLoading, isError, error } = useQuery<UserData | null, Error>({
    queryKey: ['platformAdmin', id],
    queryFn: () => fetchPlatformAdminById(id!),
    enabled: isEdit && !preloadedAdmin,
  });

  // Preferir o admin do state; senão, o remoto
  const adminData = preloadedAdmin ?? adminDataRemote ?? null;

  // === Estado do form ===
  const [firstName, setFirstName] = useState<string>(adminData?.firstName || '');
  const [lastName,  setLastName]  = useState<string>(adminData?.lastName  || '');
  const [email,     setEmail]     = useState<string>(adminData?.email     || '');
  const [adminType, setAdminType] = useState<PlatformAdminType>(
    (adminData?.platformAdminDetails?.adminType as PlatformAdminType) ?? PlatformAdminType.SUPER_ADMIN
  );
  const [isActive,  setIsActive]  = useState<'active' | 'inactive'>(adminData?.isActive ? 'active' : 'inactive');

  // Apenas create:
  const [tempPassword, setTempPassword] = useState<string>('');

  // Apenas edit (opcional):
  const [newPassword, setNewPassword] = useState<string>('');

  useEffect(() => {
    if (isEdit && adminData) {
      setFirstName(adminData.firstName || '');
      setLastName(adminData.lastName || '');
      setEmail(adminData.email || '');
      setAdminType((adminData.platformAdminDetails?.adminType as PlatformAdminType) ?? PlatformAdminType.SUPER_ADMIN);
      setIsActive(adminData.isActive ? 'active' : 'inactive');
    }
  }, [isEdit, adminData]);

  // === Mutations ===
  const createMutation = useMutation({
    mutationFn: createPlatformAdmin,
    onSuccess: (res: any) => {
      toast.success('Administrador criado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['platformAdmins'] });
      const newId = res?.id || res?.user?.id;
      if (newId) {
        navigate(`/platform-admins/edit/${newId}`, { replace: true });
      } else {
        navigate('/platform-admins', { replace: true });
      }
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao criar administrador.'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; adminType: PlatformAdminType; isActive: boolean }) =>
      updatePlatformAdmin(payload.id, { adminType: payload.adminType, isActive: payload.isActive }),
    onSuccess: () => {
      toast.success('Administrador atualizado.');
      queryClient.invalidateQueries({ queryKey: ['platformAdmins'] });
      if (id) queryClient.invalidateQueries({ queryKey: ['platformAdmin', id] });
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao atualizar administrador.'),
  });

  const sendResetMutation = useMutation({
    mutationFn: (id: string) => sendPlatformAdminPasswordResetEmail(id),
    onSuccess: () => toast.success('Email de reset enviado.'),
    onError: (err: any) => toast.error(err?.message || 'Falha ao enviar reset de password.'),
  });

  const setPasswordMutation = useMutation({
    mutationFn: (payload: { id: string; password: string }) => setPlatformAdminPassword(payload.id, payload.password),
    onSuccess: () => {
      toast.success('Password definida com sucesso.');
      setNewPassword('');
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao definir password.'),
  });

  // === Validations ===
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const createValid =
    firstName.trim() &&
    lastName.trim()  &&
    emailRegex.test(email.trim()) &&
    tempPassword.trim().length >= 10;

  // === Handlers partilhados (header/footer) ===
  const handleCancel = () => navigate(-1);

  const handleCreate = () => {
    if (!createValid) {
      toast.error('Preencha todos os campos corretamente (password ≥ 10 carateres).');
      return;
    }
    createMutation.mutate({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.trim(),
      password:  tempPassword,
      adminType,
    } as any);
  };

  const handleSave = () => {
    if (!id) return;
    updateMutation.mutate({
      id,
      adminType,
      isActive: isActive === 'active',
    });
  };

  // === Secções ===
  const sections = useMemo(() => {
    const sectionUserData = {
      title: 'Dados do Utilizador',
      description: isEdit
        ? 'Nome e email estão apenas para referência (mantidos como foram criados).'
        : 'Introduza os dados do novo administrador da plataforma.',
      accent: true,
      content: (
        <div className="space-y-4">
          {/* Nome + Apelido */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Primeiro Nome</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isEdit}
                placeholder="Ex.: Ana"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Apelido</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isEdit}
                placeholder="Ex.: Silva"
              />
            </div>
          </div>

          {/* Email */}
          <div className="grid gap-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEdit}
              placeholder="ana.silva@empresa.pt"
            />
            {!isEdit && (
              <CardDescription>
                Será o utilizador de autenticação. Certifique-se que o email é válido.
              </CardDescription>
            )}
          </div>

          {/* Password temporária (apenas create) */}
          {!isEdit && (
            <div className="grid gap-1.5">
              <Label>Palavra-passe Temporária</Label>
              <Input
                type="password"
                minLength={10}
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Mínimo 10 caracteres"
              />
            </div>
          )}
        </div>
      ),
    };

    const sectionAccess = {
      title: 'Acesso e Estado',
      description: 'Defina o tipo de acesso do administrador e se está ativo.',
      accent: true,
      content: (
        <div className="space-y-4">
          {/* Tipo de Acesso */}
          <div className="grid gap-1.5">
            <Label>Tipo de Administrador</Label>
            <Select
              value={adminType}
              onValueChange={(v) => setAdminType(v as PlatformAdminType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tipo de Acesso" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value={PlatformAdminType.SUPER_ADMIN}>Super Admin (Total)</SelectItem>
                <SelectItem value={PlatformAdminType.SUPPORT_L2}>Suporte Nível 2</SelectItem>
                <SelectItem value={PlatformAdminType.AUDITOR}>Auditor</SelectItem>
                <SelectItem value={PlatformAdminType.FINANCE}>Financeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div className="grid gap-1.5">
            <Label>Estado</Label>
            <Select
              value={isActive}
              onValueChange={(v) => setIsActive(v as 'active' | 'inactive')}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    };

    const sectionSecurity = isEdit ? {
      title: 'Segurança',
      description: 'Defina uma nova password ou envie um email de reposição.',
      accent: true,
      content: (
        <div className="space-y-4">
          {/* Definir nova password */}
          <div className="grid gap-1.5">
            <Label>Definir nova password (opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 10 caracteres"
                className="h-9"
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!id) return;
                  if (!newPassword || newPassword.length < 10) {
                    toast.error('Password deve ter pelo menos 10 caracteres.');
                    return;
                  }
                  setPasswordMutation.mutate({ id, password: newPassword });
                }}
                disabled={setPasswordMutation.isPending}
              >
                {setPasswordMutation.isPending ? 'A guardar…' : 'Definir'}
              </Button>
            </div>
          </div>

          {/* Enviar email de reset */}
          <div className="grid gap-1.5">
            <Label>Ações rápidas</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => id && sendResetMutation.mutate(id)}
                disabled={sendResetMutation.isPending}
              >
                <Mail className="w-4 h-4 mr-2" />
                {sendResetMutation.isPending ? 'A enviar…' : 'Enviar email de reset'}
              </Button>
            </div>
          </div>
        </div>
      ),
    } : null;

    return [sectionUserData, sectionAccess, sectionSecurity].filter(Boolean) as any[];
  }, [isEdit, adminData, firstName, lastName, email, tempPassword, adminType, isActive, newPassword, setPasswordMutation.isPending, sendResetMutation.isPending, id]);

  // === Ações (footer) ===
  const footerActions = (
    <>
      <Button variant="outline" size="sm" onClick={handleCancel}>
        Cancelar
      </Button>
      {!isEdit ? (
        <Button onClick={handleCreate} size="sm" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> A criar…
            </>
          ) : 'Criar Administrador'}
        </Button>
      ) : (
        <Button onClick={handleSave} size="sm" disabled={updateMutation.isPending || (isEdit && !adminData && isLoading)}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> A guardar…
            </>
          ) : 'Guardar'}
        </Button>
      )}
    </>
  );

  // === Ações (header) — iguais ao footer ===
  const headerActions = (
    <div className="flex items-center gap-2">
      <a
        href="https://docs.geslogic.pt/platform-admins"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-brand-600 hover:text-brand-700 underline mr-3"
      >
        Ajuda
      </a>

      <Button variant="outline" size="sm" onClick={handleCancel}>
        Cancelar
      </Button>

      {!isEdit ? (
        <Button onClick={handleCreate} size="sm" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> A criar…
            </>
          ) : 'Criar Administrador'}
        </Button>
      ) : (
        <Button onClick={handleSave} size="sm" disabled={updateMutation.isPending || (isEdit && !adminData && isLoading)}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> A guardar…
            </>
          ) : 'Guardar'}
        </Button>
      )}
    </div>
  );

  // Guard de acesso (apenas Platform Admin)
  if (!user || user.role !== UserRole.PLATFORM_ADMIN) {
    return <Navigate to="/dashboard" />;
  }
  // Carregamento/erro (apenas edição sem preloaded)
  if (isEdit && !preloadedAdmin && isLoading) {
    return <div className="p-6">A carregar dados do administrador…</div>;
  }
  if (isEdit && !preloadedAdmin && isError) {
    return <div className="p-6 text-red-600">Erro: {error?.message || 'Falha ao obter administrador.'}</div>;
  }

  return (
    <DetailFormTemplate
      header={{
        icon: ShieldUser,
        title: isEdit ? 'Editar Administrador da Plataforma' : 'Criar Administrador da Plataforma',
        subtitle: isEdit
          ? (adminData ? <>Utilizador: <b>{adminData.firstName} {adminData.lastName}</b> — {adminData.email}</> : 'A carregar…')
          : 'Introduza os dados do novo administrador com acesso à plataforma.',
        actions: headerActions,
      }}
      sections={sections}
      actions={footerActions}
      columnsMd={2}
    />
  );
}
