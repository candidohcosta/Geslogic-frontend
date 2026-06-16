// frontend/src/components/roles/CreateRoleDrawer.tsx

import React, { useState } from "react";
import { Drawer } from "../patterns/Drawer";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { useCreateRole } from "../../hooks/roles/useCreateRole";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchCompanies } from "../../services/api";
import { CompanyOption, CompanySelect } from "../common/CompanySelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/Select";

interface CreateRoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateRoleDrawer({ isOpen, onClose }: CreateRoleDrawerProps) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "",
    description: "",
    roleTypeId: "COMPANY_USER",
    companyId:
      user?.roleType === "PLATFORM_USER"
        ? ""
        : user?.company?.id ?? "",   // ✅ FIX: companyId
  });

  const createMutation = useCreateRole();

    const isPlatform = user?.roleType === "PLATFORM_USER";

    const { data: companies = [] } = useQuery<CompanyOption[]>({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: isPlatform,
    });

  if (!user) return null;

  const update = (key: string, value: any) =>
    setForm((s) => ({
      ...s,
      [key]: value,
    }));

  const canSubmit =
    form.name.trim() &&
    form.description.trim() &&
    form.roleTypeId;

/*   async function handleCreate() {
    await createMutation.mutateAsync(form);
    onClose();
  } */

    async function handleCreate() {
    const payload: any = {
        name: form.name,
        description: form.description,
        roleTypeId: form.roleTypeId,
    };

    // ✅ Só enviar companyId se existir
    if (form.companyId) {
        payload.companyId = form.companyId;
    }

    await createMutation.mutateAsync(payload);
    onClose();
    }


  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Criar Role"
    >
      <div className="space-y-6 p-6">

        {/* NAME */}
        <div>
          <Label>Nome (sem slug)</Label>
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <Label>Descrição</Label>
          <Input
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        {/* ROLETYPE */}
        <div>
          <Label>Tipo de Role</Label>
          <select
            className="border rounded h-10 px-2 w-full"
            value={form.roleTypeId}
            onChange={(e) => update("roleTypeId", e.target.value)}
          >
            <option value="PLATFORM_USER">PLATFORM_USER</option>
            <option value="COMPANY_USER">COMPANY_USER</option>
            <option value="GENERIC_USER">GENERIC_USER</option>
          </select>
        </div>

        {/* COMPANY (apenas PlatformAdmin) */}
        {isPlatform && (
        <div>
            <Label>Empresa</Label>

            <select
            className="border rounded h-10 px-2 w-full"
            value={form.companyId || ''}
            onChange={(e) =>
                update(
                'companyId',
                e.target.value === '' ? undefined : e.target.value
                )
            }
            >
            <option value="">Role global (sem empresa)</option>

            {companies.map((c) => (
                <option key={c.id} value={c.id}>
                {c.name}
                </option>
            ))}
            </select>
        </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <Button disabled={!canSubmit} onClick={handleCreate}>
            Criar
          </Button>
        </div>
      </div>
    </Drawer>
  );
}