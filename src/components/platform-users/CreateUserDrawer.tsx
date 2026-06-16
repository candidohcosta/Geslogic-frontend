// frontend/src/components/platform-users/CreateUserDrawer.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Drawer } from "../patterns/Drawer";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import DynamicRoleMetadataForm from "../dynamic-forms/DynamicRoleMetadataForm";

import { useCreateUser } from "../../hooks/platform-users/useCreateUser";
import { useRoleTemplatesByType } from "../../hooks/platform-users/useRoleTemplatesByType";
import { Eye, EyeOff } from "lucide-react";
import { validatePassword } from "../../lib/validation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateUserDrawer({ isOpen, onClose }: Props) {
  // -------------------------------
  // ESTADO
  // -------------------------------
  const [mode, setMode] = useState<"password" | "invite">("password");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    initialRoleId: "",
    metadata: {},
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // -------------------------------
  // Load roles (PLATFORM_USER)
  // -------------------------------
  const { data: roles = [], isLoading: loadingRoles } =
    useRoleTemplatesByType("PLATFORM_USER");

  const selectedRole = useMemo(() => {
    return roles.find((r: any) => r.id === form.initialRoleId);
  }, [roles, form.initialRoleId]);

  // -------------------------------
  // Mutação de criação
  // -------------------------------
  const createMutation = useCreateUser();

  // -------------------------------
  // VALIDAÇÃO FE
  // -------------------------------

  const passwordError = useMemo(() => {
    if (mode !== "password") return null;
    return validatePassword(form.password);
  }, [mode, form.password]);

  const hasInvalidPassword = useMemo(() => {
    if (!passwordError) return false;
    return passwordError.some(rule => !rule.valid);
  }, [passwordError]);

  const canSubmit = useMemo(() => {
    if (!form.firstName.trim()) return false;
    if (!form.lastName.trim()) return false;
    if (!form.email.trim()) return false;
    if (!form.initialRoleId) return false;

    if (mode === "password") {
      if (!form.password || !form.confirmPassword) return false;
      if (form.password !== form.confirmPassword) return false;
      if (hasInvalidPassword) return false;
    }

    return true;
  }, [form, mode, hasInvalidPassword]);
  
  const passwordsMatch = useMemo(() => {
    if (!form.password || !form.confirmPassword) return null;
    return form.password === form.confirmPassword;
  }, [form.password, form.confirmPassword]);

  // -------------------------------
  // HANDLERS
  // -------------------------------
  const update = (key: string, value: any) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  const handleCreate = async () => {
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,

      password: mode === "password" ? form.password : null,
      invite: mode === "invite",

      initialRoleId: form.initialRoleId,
      metadata: form.metadata,

//      scope: "platform",
    };

    await createMutation.mutateAsync(payload);
    onClose();
  };

  // -------------------------------------
  // RESET FORM quando fecha
  // -------------------------------------
  useEffect(() => {
    if (!isOpen) {
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        initialRoleId: "",
        metadata: {},
      });
      setMode("password");
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  // -------------------------------
  // RENDER
  // -------------------------------
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Criar Utilizador da Plataforma"
      subtitle="Utilizador com roles do tipo PLATFORM_USER"
    >
      <div className="p-6 space-y-6">
        {/* NOME */}
        <div>
          <Label>Primeiro Nome *</Label>
          <Input
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
          />
        </div>

        <div>
          <Label>Último Nome *</Label>
          <Input
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
        </div>

        {/* EMAIL */}
        <div>
          <Label>Email *</Label>
          <Input
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>

        {/* PASSWORD vs INVITE */}
        <div className="space-y-2">
          <Label>Modo de criação</Label>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "password"}
                onChange={() => setMode("password")}
              />
              <span>Definir password agora</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "invite"}
                onChange={() => setMode("invite")}
              />
              <span>Enviar convite por email</span>
            </label>
          </div>
        </div>

        {/* PASSWORD */}
        {mode === "password" && (
          <>

            <div>
              <Label>Password *</Label>

              <div className="flex items-center gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>

            {passwordError && (
              <ul className="mt-2 space-y-1">
                {passwordError.map((rule, idx) => (
                  <li
                    key={idx}
                    className={`text-sm ${
                      rule.valid ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {rule.valid ? "✓" : "✗"} {rule.label}
                  </li>
                ))}
              </ul>
            )}

            <div>
              <Label>Confirmar Password *</Label>

              <div className="flex items-center gap-2">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  aria-label={showConfirmPassword ? "Ocultar password" : "Mostrar password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>

            {passwordsMatch !== null && (
              <p
                className={`text-sm mt-1 ${
                  passwordsMatch ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {passwordsMatch
                  ? "As passwords coincidem."
                  : "As passwords não coincidem."}
              </p>
            )}

          </>
        )}

        {/* ROLE INICIAL */}
        <div>
          <Label>Role Inicial</Label>

          {loadingRoles && <div>A carregar roles...</div>}

          {!loadingRoles && (
            <select
              className="border rounded px-2 h-10 w-full"
              value={form.initialRoleId}
              onChange={(e) => update("initialRoleId", e.target.value)}
            >
              <option value="">Selecionar...</option>

              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* METADATA DO ROLE (DINÂMICA) */}
        {selectedRole && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-2">
              Metadata inicial para: {selectedRole.name}
            </h3>

            <DynamicRoleMetadataForm
                fields={selectedRole.fields ?? {}}
                uiSchema={selectedRole.uiSchema ?? {}}
                data={form.metadata ?? {}}
                companyId={undefined}
                onSave={(data) => update("metadata", data)}
            />
          </div>
        )}

        {/* AÇÕES */}
        <div className="pt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            disabled={!canSubmit || createMutation.isPending}
            onClick={handleCreate}
          >
            {createMutation.isPending ? "A criar..." : "Criar Utilizador"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}