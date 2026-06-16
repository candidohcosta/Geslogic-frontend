// frontend/src/components/scoped-users/CreateScopedUserDrawer.tsx

import React, { useEffect, useMemo, useState } from "react";
import { Drawer } from "../patterns/Drawer";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { Eye, EyeOff } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useCompanies } from "../../hooks/companies/useCompanies";
import { useRoles } from "../../hooks/roles/useRoles";
import { useCreateScopedUser } from "../../hooks/scoped-users/useCreateScopedUser";
import DynamicRoleMetadataForm from "../dynamic-forms/DynamicRoleMetadataForm";
import { validatePassword } from "../../lib/validation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateScopedUserDrawer({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const isPlatformAdmin = user?.effectiveRole === "PLATFORM_ADMIN";

  /* ---------------- STATE ---------------- */
  const [mode, setMode] = useState<"password" | "invite">("password");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyId: "",
    initialRoleId: "",
    metadata: {},
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* ---------------- DATA ---------------- */
  const { data: companies = [] } = useCompanies();

  // ⚠️ IMPORTANTE:
  // Não passamos roleType aqui. Vamos filtrar no frontend.
  const {
    data: allRoles = [],
    isLoading: loadingRoles,
  } = useRoles();

  /* ---------------- ROLE FILTER (REGRA CORRETA) ---------------- */
  const availableRoles = useMemo(() => {
    return allRoles.filter((r: any) => {
      // ❌ Nunca mostrar PLATFORM_USER
      if (r.roleType?.id === "PLATFORM_USER") return false;

      // ✅ Roles globais COMPANY_USER ou GENERIC_USER
      if (!r.companyId) {
        return (
          r.roleType?.id === "COMPANY_USER" ||
          r.roleType?.id === "GENERIC_USER"
        );
      }

      // ✅ Roles da empresa selecionada
      if (isPlatformAdmin && form.companyId) {
        return r.companyId === form.companyId;
      }

      return false;
    });
  }, [allRoles, isPlatformAdmin, form.companyId]);

  const selectedRole = useMemo(
    () => availableRoles.find((r: any) => r.id === form.initialRoleId),
    [availableRoles, form.initialRoleId]
  );

  /* ---------------- MUTATION ---------------- */
  const createMutation = useCreateScopedUser();

  /* ---------------- PASSWORD VALIDATION ---------------- */
  const passwordError = useMemo(() => {
    if (mode !== "password") return null;
    return validatePassword(form.password);
  }, [mode, form.password]);

  const hasInvalidPassword = useMemo(
    () => passwordError?.some(r => !r.valid) ?? false,
    [passwordError]
  );

  const passwordsMatch = useMemo(() => {
    if (!form.password || !form.confirmPassword) return null;
    return form.password === form.confirmPassword;
  }, [form.password, form.confirmPassword]);

  const canSubmit = useMemo(() => {
    if (!form.firstName.trim()) return false;
    if (!form.lastName.trim()) return false;
    if (!form.email.trim()) return false;
    if (isPlatformAdmin && !form.companyId) return false;
    if (!form.initialRoleId) return false;

    if (mode === "password") {
      if (!form.password || !form.confirmPassword) return false;
      if (!passwordsMatch) return false;
      if (hasInvalidPassword) return false;
    }
    return true;
  }, [form, mode, isPlatformAdmin, passwordsMatch, hasInvalidPassword]);

  /* ---------------- HELPERS ---------------- */
  const update = (key: keyof typeof form, value: any) => {
    setForm(s => ({ ...s, [key]: value }));
  };

  const handleCreate = async () => {
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: mode === "password" ? form.password : null,
      invite: mode === "invite",
      companyId: isPlatformAdmin ? form.companyId : undefined,
      initialRoleId: form.initialRoleId,
      metadata: form.metadata,
    };

    await createMutation.mutateAsync(payload);
    onClose();
  };

  /* ---------------- RESET ---------------- */
  useEffect(() => {
    if (!isOpen) {
      setMode("password");
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        companyId: "",
        initialRoleId: "",
        metadata: {},
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  /* ---------------- RENDER ---------------- */
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Criar Utilizador"
      subtitle="Utilizador do tipo COMPANY_USER"
    >
      <div className="p-6 space-y-6">
        {/* DADOS BÁSICOS */}
        <div>
          <Label>Primeiro Nome *</Label>
          <Input value={form.firstName} onChange={e => update("firstName", e.target.value)} />
        </div>

        <div>
          <Label>Último Nome *</Label>
          <Input value={form.lastName} onChange={e => update("lastName", e.target.value)} />
        </div>

        <div>
          <Label>Email *</Label>
          <Input value={form.email} onChange={e => update("email", e.target.value)} />
        </div>

        {/* EMPRESA */}
        {isPlatformAdmin && (
          <div>
            <Label>Empresa *</Label>
            <select
              className="border rounded px-2 h-10 w-full"
              value={form.companyId}
              onChange={e => update("companyId", e.target.value)}
            >
              <option value="">Selecionar empresa…</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* ROLE */}
        <div>
          <Label>Role Inicial *</Label>
          {loadingRoles ? (
            <div>A carregar roles…</div>
          ) : (
            <select
              className="border rounded px-2 h-10 w-full"
              value={form.initialRoleId}
              onChange={e => update("initialRoleId", e.target.value)}
            >
              <option value="">Selecionar…</option>
              {availableRoles.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* METADATA */}
        {selectedRole && (
          <div className="border-t pt-4">
            <DynamicRoleMetadataForm
              fields={selectedRole.fields ?? {}}
              uiSchema={selectedRole.uiSchema ?? {}}
              data={form.metadata}
              companyId={isPlatformAdmin ? form.companyId : undefined}
              onSave={data => update("metadata", data)}
            />
          </div>
        )}

        {/* PASSWORD / INVITE */}
        <div className="space-y-2">
          <Label>Modo de criação</Label>

          <label className="flex items-center gap-2">
            <input type="radio" checked={mode === "password"} onChange={() => setMode("password")} />
            Definir password agora
          </label>

          <label className="flex items-center gap-2">
            <input type="radio" checked={mode === "invite"} onChange={() => setMode("invite")} />
            Enviar convite por email
          </label>
        </div>

        {mode === "password" && (
          <>
            <div>
              <Label>Password *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => update("password", e.target.value)}
                />
                <Button size="sm" variant="outline" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>

            {passwordError && (
              <ul className="mt-2 space-y-1">
                {passwordError.map((rule, idx) => (
                  <li
                    key={idx}
                    className={`text-sm ${rule.valid ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {rule.valid ? "✓" : "✗"} {rule.label}
                  </li>
                ))}
              </ul>
            )}

            <div>
              <Label>Confirmar Password *</Label>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={e => update("confirmPassword", e.target.value)}
              />
            </div>

            {passwordsMatch !== null && (
              <p className={`text-sm ${passwordsMatch ? "text-emerald-600" : "text-red-600"}`}>
                {passwordsMatch ? "As passwords coincidem." : "As passwords não coincidem."}
              </p>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!canSubmit || createMutation.isPending} onClick={handleCreate}>
            {createMutation.isPending ? "A criar…" : "Criar Utilizador"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}