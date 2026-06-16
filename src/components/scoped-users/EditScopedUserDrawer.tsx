// frontend/src/components/scoped-users/EditScopedUserDrawer.tsx

import React, { useEffect, useState } from "react";
import { formatDate } from "date-fns";

import { Drawer } from "../patterns/Drawer";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";

import {
  User,
  Lock,
  Key,
  Trash2,
  ShieldCheck,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";

import { confirmDialog } from "../system/confirmDialog";

// 🔹 Hooks scoped
import { useUpdateScopedUserBasic } from "../../hooks/scoped-users/useUpdateScopedUserBasic";
import { useToggleScopedUserActive } from "../../hooks/scoped-users/useToggleScopedUserActive";
import { useSendScopedUserPasswordReset } from "../../hooks/scoped-users/useSendScopedUserPasswordReset";
import { useSoftDeleteScopedUser } from "../../hooks/scoped-users/useSoftDeleteScopedUser";
import { useRestoreScopedUser } from "../../hooks/scoped-users/useRestoreScopedUser";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  companies: any[];
}

export default function EditScopedUserDrawer({
  isOpen,
  onClose,
  user,
  companies,
}: Props) {
  const safeId = user?.id ?? "";

  const updateBasic = useUpdateScopedUserBasic(safeId);
  const toggleActive = useToggleScopedUserActive(safeId);
  const resetPasswordMutation = useSendScopedUserPasswordReset(safeId);
  const softDeleteMutation = useSoftDeleteScopedUser(safeId);
  const restoreUserMutation = useRestoreScopedUser(safeId);

  const [localUser, setLocalUser] = useState<any | null>(user);
  const [editMode, setEditMode] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
  });

  const companyName = React.useMemo(() => {
    if (!localUser?.roleAssignments || companies.length === 0) {
      return "—";
    }

    const companyScope = localUser.roleAssignments.find(
      (ra: any) => ra.scope?.startsWith("company:")
    );

    if (!companyScope) {
      return "Plataforma";
    }

    const companyId = companyScope.scope.replace("company:", "");
    const company = companies.find(c => c.id === companyId);

    return company?.name ?? "—";
  }, [localUser, companies]);

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isDeleted = Boolean(localUser?.deletedAt);

  useEffect(() => {
    if (user && isOpen) {
      setLocalUser(user);
      setForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
      });
      setEditMode(false);
      setNewPassword("");
      setShowPassword(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !localUser || !safeId) return null;

  const canSave =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0;

  /* =========================
     HEADER
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
        !editMode ? (
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
                await updateBasic.mutateAsync(form);

                setLocalUser((u: any) => ({
                  ...u,
                  ...form,
                }));

                setEditMode(false);
              }}
            >
              {updateBasic.isPending ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        )
      )}
    </div>
  );

  return (
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
          <User className="w-4 h-4 text-gray-600" />
          <span className="text-md font-semibold">
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
      {/* EMPRESA */}
      {/* ===================== */}
      <section className="space-y-4 mt-10">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-600" />
          <span className="text-md font-semibold">
            Empresa
          </span>
        </div>

        <div className="text-sm text-gray-800">
          {companyName}
        </div>
      </section>

      {/* ===================== */}
      {/* SEGURANÇA */}
      {/* ===================== */}
      {!isDeleted && (
        <section className="space-y-6 mt-10">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-600" />
            <span className="text-md font-semibold">
              Segurança
            </span>
          </div>

          {/* ===== Estado ===== */}
          <div className="p-4 border rounded space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-medium">
                  Estado do Utilizador
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {localUser.isActive
                    ? "Este utilizador pode aceder à plataforma."
                    : "Este utilizador está inativo."}
                </p>
              </div>

              <span
                className={
                  localUser.isActive
                    ? "inline-flex items-center px-2.5 py-1 rounded text-xs bg-emerald-100 text-emerald-700"
                    : "inline-flex items-center px-2.5 py-1 rounded text-xs bg-red-100 text-red-700"
                }
              >
                {localUser.isActive ? "Ativo" : "Inativo"}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={toggleActive.isPending}
              className={
                localUser.isActive
                  ? "text-red-600 border-red-300 hover:bg-red-50"
                  : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              }
              onClick={async () => {
                const next = !localUser.isActive;
                await toggleActive.mutateAsync(next);
                setLocalUser((u: any) => ({
                  ...u,
                  isActive: next,
                }));
              }}
            >
              {localUser.isActive
                ? "Desativar utilizador"
                : "Ativar utilizador"}
            </Button>
          </div>

          {/* ===== Password ===== */}
          <div className="p-4 border rounded space-y-4">
            <Label>Definir nova palavra‑passe</Label>

            <div className="flex items-center gap-2">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova palavra‑passe"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setShowPassword((v) => !v)
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </Button>
            </div>

            <Button
              size="sm"
              disabled={!newPassword}
              onClick={async () => {
                await resetPasswordMutation.mutateAsync();
                setNewPassword("");
              }}
            >
              Definir palavra‑passe
            </Button>
          </div>

          {/* ===== Reset password por email ===== */}
          <div className="border rounded p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-gray-600" />
              <span className="font-medium">
                Ações de segurança
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={resetPasswordMutation.isPending}
              onClick={async () => {
                const confirmed = await confirmDialog({
                  title:
                    "Enviar email de redefinição de palavra‑passe",
                  message:
                    "Será enviado um email ao utilizador. Deseja continuar?",
                  confirmText: "Enviar",
                  cancelText: "Cancelar",
                });

                if (!confirmed) return;
                await resetPasswordMutation.mutateAsync();
              }}
            >
              Enviar email de reset de password
            </Button>
          </div>

          {/* ===== 2FA (TODO) ===== */}
          <div className="p-4 border rounded space-y-2 opacity-60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="font-medium">
                Autenticação de Dois Fatores (2FA)
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Reforça a segurança da conta exigindo um segundo fator
              no processo de autenticação.
            </p>

{/*               <TwoFactorSetup
                userOverride={localUser}
                onComplete={async () => {
                  await refreshUserFromBackend();
                }}
              /> */}
            <p className="text-sm text-gray-600">
              TODO: reset / gestão de 2FA para scoped users
            </p>

          </div>

          {/* ===== Remoção ===== */}
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
      )}

      {/* ===================== */}
      {/* RESTAURAR */}
      {/* ===================== */}
      {isDeleted && (
        <section className="space-y-6 mt-10">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-600" />
            <span className="font-semibold">
              Utilizador eliminado
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={restoreUserMutation.isPending}
            onClick={async () => {
              await restoreUserMutation.mutateAsync();
              onClose();
            }}
          >
            Recuperar utilizador
          </Button>
        </section>
      )}
    </Drawer>
  );
}