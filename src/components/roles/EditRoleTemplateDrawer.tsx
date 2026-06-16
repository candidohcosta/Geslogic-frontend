// frontend/src/components/roles/EditRoleTemplateDrawer.tsx

import React, { useEffect, useState } from "react";
import { Drawer } from "../patterns/Drawer";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

import { useRoleTemplate } from "../../hooks/roles/useRoleTemplate";
import { useUpdateRoleTemplate } from "../../hooks/roles/useUpdateRoleTemplate";
import { useAuth } from "../../context/AuthContext";

interface EditRoleTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: any | null;
}

export default function EditRoleTemplateDrawer({
  isOpen,
  onClose,
  role,
}: EditRoleTemplateDrawerProps) {

  // ✅ TODOS OS HOOKS NO TOPO, UMA ÚNICA VEZ
  const { user } = useAuth();

  const roleId = role?.id ?? "";
  const { data: template } = useRoleTemplate(roleId);
  const updateMutation = useUpdateRoleTemplate(roleId);

  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [fields, setFields] = useState<Record<string, any>>({});
  const [uiSchema, setUiSchema] = useState<Record<string, any>>({});

  // ✅ RENDERS CONDICIONAIS APENAS DEPOIS DOS HOOKS


    useEffect(() => {
    if (template?.fields) {
        setFields(template.fields);
    } else {
        setFields({});
    }
    }, [template]);


  if (!isOpen || !role || !user) return null;

  function addField() {
    setFields((prev) => ({
      ...prev,
      novoCampo: { type: "string", required: false },
    }));
  }

  function updateField(key: string, newData: Record<string, any>) {
    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...newData },
    }));
  }

  function renameField(oldKey: string, newKey: string) {
    if (!newKey.trim()) return;
    setFields((prev) => {
      const clone = { ...prev };
      clone[newKey] = clone[oldKey];
      delete clone[oldKey];
      return clone;
    });
  }

  function removeField(key: string) {
    setFields((prev) => {
      const clone = { ...prev };
      delete clone[key];
      return clone;
    });
  }

  async function handleSave() {
    await updateMutation.mutateAsync({ fields, uiSchema });
    onClose();
  }

  const isPlatform = user.roleType === "PLATFORM_USER";
  const displayName =
    isPlatform
      ? role.name
      : role.companyId
      ? role.name.replace(/_[a-zA-Z0-9-_]+$/, "")
      : role.name;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={`Metadata Template — ${displayName}`}
    >
      <div className="p-6 space-y-6">

        {/* TABS */}
        <div className="flex gap-4 border-b pb-2">
          <button
            className={mode === "visual" ? "font-semibold" : "text-gray-500"}
            onClick={() => setMode("visual")}
          >
            Editor Visual
          </button>
          <button
            className={mode === "json" ? "font-semibold" : "text-gray-500"}
            onClick={() => setMode("json")}
          >
            JSON Avançado
          </button>
        </div>

        {/* VISUAL */}
        {mode === "visual" && (
          <>
            <Button size="sm" variant="outline" onClick={addField}>
              + Adicionar Campo
            </Button>

            {Object.entries(fields).map(([key, field]: any) => (
              <div key={key} className="border rounded p-4 space-y-3">
                <Label>Nome</Label>
                <Input
                  defaultValue={key}
                  onBlur={(e) => renameField(key, e.target.value)}
                />

                <Label>Tipo</Label>
                <select
                  className="border rounded h-10 px-2"
                  value={field.type}
                  onChange={(e) =>
                    updateField(key, { type: e.target.value })
                  }
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="uuid">uuid</option>
                  <option value="enum">enum</option>
                  <option value="multiselect">multiselect</option>
                </select>

                <label className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={field.required ?? false}
                    onChange={(e) =>
                      updateField(key, { required: e.target.checked })
                    }
                  />
                  Obrigatório
                </label>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                  onClick={() => removeField(key)}
                >
                  Remover
                </Button>
              </div>
            ))}
          </>
        )}

        {/* JSON */}
        {mode === "json" && (
          <>
            <Label>fields</Label>
            <Textarea
              rows={10}
              value={JSON.stringify(fields, null, 2)}
              onChange={(e) => setFields(JSON.parse(e.target.value || "{}"))}
            />

            <Label>uiSchema</Label>
            <Textarea
              rows={10}
              value={JSON.stringify(uiSchema, null, 2)}
              onChange={(e) => setUiSchema(JSON.parse(e.target.value || "{}"))}
            />
          </>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </div>
    </Drawer>
  );
}