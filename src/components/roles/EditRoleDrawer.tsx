// frontend/src/components/roles/EditRoleDrawer.tsx

import React, { useEffect, useState } from "react";
import { Drawer } from "../patterns/Drawer";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";

import { useUpdateRole } from "../../hooks/roles/useUpdateRole";
import { useAuth } from "../../context/AuthContext";

interface EditRoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: any | null;
}

export default function EditRoleDrawer({ isOpen, onClose, role }: EditRoleDrawerProps) {
  const { user } = useAuth();

  const roleId = role?.id ?? "";
  const [description, setDescription] = useState("");
  const updateMutation = useUpdateRole(roleId);


  useEffect(() => {
    if (role?.description) {
      setDescription(role.description);
    } else {
      setDescription("");
    }
  }, [role])


  if (!isOpen || !role || !user) return null;

  const isPlatform = user.roleType === "PLATFORM_USER";

  const displayName = isPlatform
    ? role.name
    : role.companyId
    ? role.name.replace(/_[a-zA-Z0-9-_]+$/, "")
    : role.name;

  async function handleSave() {
    await updateMutation.mutateAsync({ description });
    onClose();
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={`Editar Role — ${displayName}`}
    >
      <div className="p-6 space-y-6">

        {/* ROLE NAME (read only) */}
        <div>
          <Label>Nome</Label>
          <div className="mt-1 text-gray-700 text-sm font-medium">
            {displayName}
            {!isPlatform && role.companyId ? (
              <span className="text-gray-400 ml-1">
                {/* Ocultar o slug ao company admin */}
                {/* slug removido */}
              </span>
            ) : null}
          </div>
        </div>

        {/* DESCRIPTION */}
        <div>
          <Label>Descrição</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* TYPE */}
        <div>
          <Label>Tipo de Role</Label>
          <div className="text-gray-700 mt-1">
            {role.roleType?.label ?? role.roleType?.id}
          </div>
        </div>

        {/* COMPANY */}
        <div>
          <Label>Empresa</Label>
          <div className="text-gray-700 mt-1">
            {role.company?.name ?? "Global"}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!description.trim()}>
            Guardar
          </Button>
        </div>
      </div>
    </Drawer>
  );
}