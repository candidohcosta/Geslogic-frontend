// src/components/platform-users/AddRoleDrawer.tsx
import React, { useMemo, useState } from "react";
import { Drawer } from "../patterns/Drawer";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { useAddRoleAssignment } from "../../hooks/platform-users/useAddRoleAssignment";
import { useRoleTemplatesByType } from "../../hooks/platform-users/useRoleTemplatesByType";

interface Props {
  isOpen: boolean;
  onClose: () => void;

  userId: string;
  onSelectMetadata: (role: any) => void; 
  // → este callback é chamado quando o role selecionado precisa de metadata
}

export default function AddRoleDrawer({
  isOpen,
  onClose,
  userId,
  onSelectMetadata,
}: Props) {
  const [roleId, setRoleId] = useState("");

  // Carregar roles do tipo PLATFORM_USER
  const { data: roles = [], isLoading: loadingRoles } =
    useRoleTemplatesByType("PLATFORM_USER");

  const selectedRole = useMemo(
    () => roles.find((r: any) => r.id === roleId),
    [roles, roleId]
  );

  const addRole = useAddRoleAssignment(userId);

  const canSubmit = !!roleId;

  const handleAssign = async () => {
    if (!selectedRole) return;

    await addRole.mutateAsync({
      roleName: selectedRole.name,
      scope: "platform",
    });

    // Se o role tiver metadata → abrir o drawer de metadata
    if (selectedRole.fields && Object.keys(selectedRole.fields).length > 0) {
      onSelectMetadata(selectedRole);
    }

    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Adicionar Role"
      subtitle="Associar um novo role ao utilizador"
    >
      <div className="p-6 space-y-6">
        <div>
          <Label>Role</Label>

          {loadingRoles ? (
            <div className="text-gray-500 text-sm">A carregar roles…</div>
          ) : (
            <select
              className="border rounded w-full h-10 px-2"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Selecionar…</option>

              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            disabled={!canSubmit || addRole.isPending}
            onClick={handleAssign}
          >
            {addRole.isPending ? "A atribuir..." : "Atribuir Role"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}