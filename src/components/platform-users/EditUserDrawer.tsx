// src/components/platform-users/EditUserDrawer.tsx

import React, { useEffect, useState } from 'react';
import { formatDate } from 'date-fns';
import { Drawer } from '../patterns/Drawer';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';

import { useAuth } from '../../context/AuthContext';

import { useUpdateUserBasic } from '../../hooks/platform-users/useUpdateUserBasic';
import { useToggleUserActive } from '../../hooks/platform-users/useToggleUserActive';

import { useRoleAssignments } from '../../hooks/platform-users/useRoleAssignments';
import { useRemoveRoleAssignment } from '../../hooks/platform-users/useRemoveRoleAssignment';

import AddRoleDrawer from './AddRoleDrawer';
import EditRoleMetadataDrawer from './EditRoleMetadataDrawer';

import { TwoFactorSetup } from '../auth/TwoFactorSetup';
import { apiFetch } from '../../services/api';

import { Pencil, Trash2, User, Layers, Lock, Key, ShieldCheck } from 'lucide-react';
import { useSetPlatformAdminPassword } from '../../hooks/platform-users/useSetPlatformAdminPassword';
import { useSendPlatformAdminPasswordReset } from '../../hooks/platform-users/useSendPlatformAdminPasswordReset';
import { useSoftDeleteUser } from "../../hooks/platform-users/useSoftDeleteUser";
import { useRestoreUser } from '../../hooks/platform-users/useRestoreUser';

import { confirmDialog  } from '../system/confirmDialog';

import { Eye, EyeOff } from "lucide-react";

/* import { ConfirmModal } from '../ui/ConfirmModal'; */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  userId: string;
}

export default function EditUserDrawer({
  isOpen,
  onClose,
  user,
  userId,
}: Props) {
  const { user: currentUser } = useAuth();
  const safeId = userId || '';

  const updateBasic = useUpdateUserBasic(safeId);
  const toggleActive = useToggleUserActive(safeId);

  const { data: assignments = [] } = useRoleAssignments(safeId);
  const removeRole = useRemoveRoleAssignment(safeId);

  const isSelf = currentUser?.id === safeId;

  // fonte única de verdade local
  const [localUser, setLocalUser] = useState<any | null>(user);

  // modo de edição (controlado pelo header)
  const [editMode, setEditMode] = useState(false);

  // formulário apenas para nomes
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
  });

  // estados auxiliares dos drawers de roles
  const [openAddRole, setOpenAddRole] = useState(false);
  const [openMetadataDrawer, setOpenMetadataDrawer] = useState(false);
  const [metadataRole, setMetadataRole] = useState<{
    roleId: string;
    roleName: string;
  } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const setPasswordMutation = useSetPlatformAdminPassword(safeId);

  const resetPasswordMutation =
    useSendPlatformAdminPasswordReset(safeId);

  const refreshUserFromBackend = async () => {
    const refreshed = await apiFetch(`/users/${safeId}`);
    setLocalUser(refreshed);
  };

  const canRemove = assignments.length > 1;

  const softDeleteMutation = useSoftDeleteUser(userId);
  const restoreUserMutation = useRestoreUser(userId);

  const isDeleted = Boolean(user?.deletedAt);

  // sincronização ao abrir / mudar user
  useEffect(() => {
    if (user && isOpen) {
      setLocalUser(user);
      setForm({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
      });
      setEditMode(false);
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setNewPassword("");
      setShowPassword(false);
    }
  }, [isOpen, userId]);

  if (!isOpen || !localUser || !safeId) return null;

  const canSave =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0;

  /* =========================
     HEADER (modo view / edit)
     ========================= */
  const header = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">
          {localUser.firstName} {localUser.lastName}
        </h2>
        <p className="text-sm text-gray-600 truncate">
          {localUser.email}
        </p>
      </div>

      {isDeleted && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">
          <p className="font-medium text-red-700">
            Utilizador eliminado
          </p>
          <p className="text-red-600">
            Este utilizador foi eliminado em{" "}
            <strong>{formatDate(user.deletedAt, 'dd/MM/yyyy HH:mm')}</strong>
            {user.deletedBy && (
              <>
                {" "}por{" "}
                <strong>
                  {user.deletedBy.firstName} {user.deletedBy.lastName}
                </strong>
              </>
            )}.
          </p>
        </div>
      )}
      {!isDeleted && (
        <>
          {!editMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
            >
              Editar
            </Button>
          ) : (
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditMode(false);
                  setForm({
                    firstName: localUser.firstName,
                    lastName: localUser.lastName,
                  });
                }}
              >
                Cancelar
              </Button>

              <Button
                size="sm"
                disabled={!canSave || updateBasic.isPending}
                onClick={async () => {
                  await updateBasic.mutateAsync({
                    firstName: form.firstName,
                    lastName: form.lastName,
                  });

                  setLocalUser((u: any) => ({
                    ...u,
                    firstName: form.firstName,
                    lastName: form.lastName,
                  }));

                  setEditMode(false);
                }}
              >
                {updateBasic.isPending ? 'A guardar…' : 'Guardar'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        customHeader={header}
      >
        {/* ===================== */}
        {/* DADOS DO UTILIZADOR */}
        {/* ===================== */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-600 shrink-0" />
            <span className="text-md font-semibold leading-none">
              Dados do Utilizador
            </span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Primeiro Nome</Label>
              {!editMode ? (
                <div className="mt-1 text-gray-800">
                  {localUser.firstName}
                </div>
              ) : (
                <Input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      firstName: e.target.value,
                    }))
                  }
                />
              )}
            </div>

            <div className="flex-1">
              <Label>Último Nome</Label>
              {!editMode ? (
                <div className="mt-1 text-gray-800">
                  {localUser.lastName}
                </div>
              ) : (
                <Input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      lastName: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          </div>
        </section>

        {/* ===================== */}
        {/* ROLES & ACESSOS */}
        {/* ===================== */}
        <section className="space-y-4 mt-10">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-600 shrink-0" />
            <span className="text-md font-semibold leading-none">
              Roles atribuídos
            </span>
          </div>

          {assignments.length === 0 && (
            <p className="text-sm text-gray-500">
              Este utilizador não tem roles atribuídos.
            </p>
          )}

          {assignments.map((ra: any) => (
            <div
              key={ra.id}
              className="p-3 border rounded flex justify-between items-center"
            >
              <div>
                <div className="font-medium">
                  {ra.role?.name ?? 'Role sem nome'}
                </div>
                <div className="text-xs text-gray-500">
                  Tipo: {ra.role.roleType.id}
                </div>
              </div>
{!isDeleted && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canRemove}
                  className={!canRemove ? "opacity-50 cursor-not-allowed" : ""}
                  onClick={() => {
                    if (!ra.id) {
                      console.error("RoleAssignment sem id — impossível remover");
                      return;
                    }
                    removeRole.mutateAsync(ra.id)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
)}
            </div>
          ))}

        </section>

        {/* ===================== */}
        {/* SEGURANÇA */}
        {/* ===================== */}
        {!isDeleted ? (
          <section className="space-y-6 mt-10">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-600 shrink-0" />
              <span className="text-md font-semibold leading-none">
                Segurança
              </span>
            </div>        
            {/* ===== Estado do Utilizador ===== */}
            <div className="p-4 border rounded space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium">Estado do Utilizador</h4>

                  <p className="text-sm text-gray-600 mt-1">
                    {localUser.isActive
                      ? 'Este utilizador pode aceder à plataforma.'
                      : 'Este utilizador está inativo e não pode aceder à plataforma.'}
                  </p>
                </div>

                {/* Badge */}
                <span
                  className={
                    localUser.isActive
                      ? 'inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700'
                      : 'inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-700'
                  }
                >
                  {localUser.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {/* Botão de ação */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSelf || toggleActive.isPending}
                  className={
                    isSelf
                      ? 'opacity-50 cursor-not-allowed'
                      : localUser.isActive
                      ? 'text-red-600 border-red-300 hover:bg-red-50'
                      : 'text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                  }
                  onClick={async () => {
                    if (isSelf) return;

                    const nextState = !localUser.isActive;

                    await toggleActive.mutateAsync(nextState);

                    setLocalUser((u: any) => ({
                      ...u,
                      isActive: nextState,
                    }));
                  }}
                >
                  {toggleActive.isPending
                    ? 'A atualizar…'
                    : localUser.isActive
                    ? 'Desativar utilizador'
                    : 'Ativar utilizador'}
                </Button>

                {isSelf && (
                  <p className="text-xs text-gray-500 mt-2">
                    Não pode desativar o seu próprio utilizador.
                  </p>
                )}
              </div>
            </div>

            {/* ===== Palavra‑passe ===== */}
            <div className="p-4 border rounded space-y-4">
  {/*             <h4 className="font-medium">Palavra‑passe</h4> */}

              <div>
                <Label>Definir nova palavra‑passe</Label>

                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova palavra‑passe"
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </div>

              <Button
                size="sm"
                disabled={!newPassword || setPasswordMutation.isPending}
                onClick={async () => {
                  await setPasswordMutation.mutateAsync(newPassword);
                  setNewPassword('');
                }}
              >
                {setPasswordMutation.isPending
                  ? 'A definir...'
                  : 'Definir palavra‑passe'}
              </Button>
            </div>          



            <div className="border rounded p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-600 shrink-0" />
                <span className="text-md font-semibold leading-none">
                  Ações de segurança
                </span>
              </div>            
  {/* ===== Reset de Palavra‑passe por Email ===== */}
              <Button
                variant="outline"
                size="sm"
                disabled={resetPasswordMutation.isPending}
                onClick={async () => {
                  const confirmed = await confirmDialog({
                    title: 'Enviar email de redefinição de palavra‑passe',
                    message:
                      'Será enviado um email ao utilizador com instruções para definir uma nova palavra‑passe. Deseja continuar?',
                    confirmText: 'Enviar',
                    cancelText: 'Cancelar',
                  });

                  if (!confirmed) return;

                  await resetPasswordMutation.mutateAsync();
                }}
              >
                {resetPasswordMutation.isPending
                  ? 'A enviar...'
                  : 'Enviar email de reset de password'}
              </Button>
            </div>

            {/* ===== Autenticação de Dois Fatores (2FA) ===== */}
            
            <div className="p-4 border rounded space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gray-600 shrink-0" />
                <span className="text-md font-semibold leading-none">
                  Autenticação de Dois Fatores (2FA)
                </span>
              </div>            
              <p className="text-sm text-gray-600">
                Reforça a segurança da conta exigindo um segundo fator
                no processo de autenticação.
              </p>

              <TwoFactorSetup
                userOverride={localUser}
                onComplete={async () => {
                  await refreshUserFromBackend();
                }}
              />

            </div>

            {/* ===== Remoção do Utilizador ===== */}
            <div className="border rounded p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-gray-600 shrink-0" />
                <span className="text-md font-semibold leading-none">
                  Remoção do utilizador
                </span>
              </div>               
              {localUser.isActive ? (
                <p className="text-xs text-gray-500 mt-2">
                  Para eliminar este utilizador, é necessário desativá-lo primeiro.
                </p>
              ) : (     
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  disabled={localUser.isActive || softDeleteMutation.isPending}
                  title={
                    localUser.isActive
                      ? "Desative o utilizador antes de o eliminar"
                      : undefined
                  }
                  onClick={async () => {
                    const confirmed = await confirmDialog({
                      title: "Eliminar utilizador",
                      message:
                        "Este utilizador será marcado como eliminado e deixará de existir no sistema. Esta ação pode ser revertida apenas manualmente por um administrador. Deseja continuar?",
                      confirmText: "Eliminar",
                      cancelText: "Cancelar",
                    });

                    if (!confirmed) return;

                    await softDeleteMutation.mutateAsync();
                    onClose(); // fecha o drawer
                  }}
                >
                  Eliminar utilizador
                </Button>
              )}
            </div>


            
          </section>
        ):(
          <section className="space-y-6 mt-10">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-600 shrink-0" />
              <span className="text-md font-semibold leading-none">
                Segurança
              </span>
            </div>        
            {/* ===== Estado do Utilizador ===== */}
            <div className="p-4 border rounded space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restoreUserMutation.isPending}
                  onClick={async () => {
                    const confirmed = await confirmDialog({
                      title: 'Recuperar utilizador',
                      message:
                        'Este utilizador será recuperado, mas ficará inativo. Deseja continuar?',
                      confirmText: 'Recuperar',
                      cancelText: 'Cancelar',
                    });

                    if (!confirmed) return;

                    await restoreUserMutation.mutateAsync();
                    onClose(); // 🔒 boa prática: fechar o drawer após a ação
                  }}
                >
                  {restoreUserMutation.isPending
                    ? 'A recuperar...'
                    : 'Recuperar utilizador'}
                </Button>
              </div>
            </div>
          </section>

        )}
      </Drawer>

      {/* DRAWERS AUXILIARES */}
      <AddRoleDrawer
        isOpen={openAddRole}
        onClose={() => setOpenAddRole(false)}
        userId={safeId}
        onSelectMetadata={(role) => {
          setMetadataRole({
            roleId: role?.id ?? '',
            roleName: role?.name ?? '',
          });
          setOpenMetadataDrawer(true);
        }}
      />

      {metadataRole && (
        <EditRoleMetadataDrawer
          isOpen={openMetadataDrawer}
          onClose={() => setOpenMetadataDrawer(false)}
          userId={safeId}
          roleId={metadataRole.roleId}
          roleName={metadataRole.roleName}
        />
      )}


{/*       {confirmResetOpen && (
        <ConfirmModal
          title="Enviar email de redefinição de palavra‑passe"
          message="Será enviado um email ao utilizador com instruções para definir uma nova palavra‑passe. Deseja continuar?"
          confirmText="Enviar"
          cancelText="Cancelar"
          onCancel={() => setConfirmResetOpen(false)}
          onConfirm={async () => {
            setConfirmResetOpen(false);
            await resetPasswordMutation.mutateAsync();
          }}
        />
      )} */}

    </>
  );
}