// frontend/src/components/platform-users/EditRoleMetadataDrawer.tsx
import React from "react";
import { Drawer } from "../patterns/Drawer";
import { Button } from "../ui/Button";
import DynamicRoleMetadataForm from "../dynamic-forms/DynamicRoleMetadataForm";

import { useRoleData } from "../../hooks/platform-users/useRoleData";
import { useUpdateRoleData } from "../../hooks/platform-users/useUpdateRoleData";
import { useRoleTemplatesByType } from "../../hooks/platform-users/useRoleTemplatesByType";

interface Props {
  isOpen: boolean;
  onClose: () => void;

  userId: string;
  roleId: string;
  roleName: string;
}

export default function EditRoleMetadataDrawer({
  isOpen,
  onClose,
  userId,
  roleId,
  roleName,
}: Props) {
  const { data: metadataData, isLoading: loadingMeta } =
    useRoleData(userId, roleId);

  const updateMutation = useUpdateRoleData(userId, roleId);

  // Carregar RoleTemplate (qualquer role tem roleType.id, logo vamos buscar o role template pelo roleId)
  const { data: roleTemplates = [] } = useRoleTemplatesByType("PLATFORM_USER");
  const roleTemplate = roleTemplates.find((rt: any) => rt.id === roleId);

  if (!isOpen) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"

      title={
      roleName
          ? `Editar metadata — ${roleName}`
          : "Editar metadata"
      }

    >
      <div className="p-6 space-y-6">
        {loadingMeta && <div>A carregar metadata...</div>}

        {!loadingMeta && roleTemplate && (
          <DynamicRoleMetadataForm
            fields={roleTemplate.fields}
            uiSchema={roleTemplate.uiSchema}
            data={metadataData?.dataJson || {}}
            onSave={async (patch) => {
              await updateMutation.mutateAsync(patch);
              onClose();
            }}
          />
        )}

        {!loadingMeta && !roleTemplate && (
          <div className="text-gray-500">
            Este role não possui metadata definida no template.
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Drawer>
  );
}