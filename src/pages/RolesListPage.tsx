// frontend/src/pages/RolesListPage.tsx

import React, { useMemo, useState } from "react";
import { ListPageTemplate } from "../components/templates/ListPageTemplate";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

import { useRoles } from "../hooks/roles/useRoles";

import CreateRoleDrawer from "../components/roles/CreateRoleDrawer";
import EditRoleDrawer from "../components/roles/EditRoleDrawer";
import EditRoleTemplateDrawer from "../components/roles/EditRoleTemplateDrawer";

import { CompanySelect } from "../components/common/CompanySelect";
import { fetchCompanies } from "../services/api";
import { useQuery } from "@tanstack/react-query";

export default function RolesListPage() {
  const { user } = useAuth();

  const [filters, setFilters] = useState({ name: "", roleType: "", companyId: "" });
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openTemplate, setOpenTemplate] = useState(false);

    const isPlatform = user?.roleType === "PLATFORM_USER";

    const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
    enabled: isPlatform,
    });


  const { data: roles = [] } = useRoles(filters.roleType, filters.companyId);

  const filtered = useMemo(() => {
    return roles.filter((r: any) => {
      return (
        r.name.toLowerCase().includes(filters.name.toLowerCase()) ||
        r.description.toLowerCase().includes(filters.name.toLowerCase())
      );
    });
  }, [roles, filters]);

  const columns = [
    {
      key: "name",
      header: "Nome",
      widthPct: 30,
      align: "left" as const,
      render: (r: any) =>
        isPlatform
          ? r.name
          : r.companyId
          ? r.name.replace(/_[a-zA-Z0-9-_]+$/, "")
          : r.name,
    },
    {
      key: "roleType",
      header: "Tipo",
      widthPct: 20,
      align: "left" as const,
      render: (r: any) => r.roleType?.label ?? r.roleType?.id,
    },
    {
      key: "company",
      header: "Empresa",
      widthPct: 20,
      align: "left" as const,
      render: (r: any) => r.company?.name ?? "Global",
    },
    {
      key: "actions",
      header: "",
      widthPct: 30,
      align: "right" as const,
      render: (r: any) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedRole(r);
              setOpenEdit(true);
            }}
          >
            Editar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedRole(r);
              setOpenTemplate(true);
            }}
          >
            Metadata
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate
        header={{
          title: "Roles",
          subtitle: "Gestão de Roles e Metadata Templates",
          actions: (
            <Button onClick={() => setOpenCreate(true)}>+ Criar Role</Button>
          ),
        }}
        filters={{
          colsTemplate: "1fr 1fr 1fr",
          children: (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium">Nome / Descrição</label>
                <Input
                  value={filters.name}
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, name: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium">Tipo</label>
                <select
                  className="border rounded h-10 px-2"
                  value={filters.roleType}
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, roleType: e.target.value }))
                  }
                >
                  <option value="">Todos</option>
                  <option value="PLATFORM_USER">PLATFORM_USER</option>
                  <option value="COMPANY_USER">COMPANY_USER</option>
                  <option value="GENERIC_USER">GENERIC_USER</option>
                </select>
              </div>

                {isPlatform && (
                <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium">Empresa</label>
                    <CompanySelect
                    companies={companies}
                    value={filters.companyId || ""}
                    onChange={(id: string) =>
                        setFilters((s) => ({
                        ...s,
                        companyId: id === 'ALL' ? '' : id, // ✅ normalização correta
                        }))
                    }
                    triggerWidthClass="w-full"
                    includeAllOption
                    allLabel="Todas as empresas"
                    />
                </div>
                )}

            </>
          ),
        }}
        table={{
          columns,
          data: filtered,
          rowKey: (r: any) => r.id,
          emptyState: <div className="py-10">Nenhum role encontrado.</div>,
        }}
      />

      {/* CREATE */}
      <CreateRoleDrawer isOpen={openCreate} onClose={() => setOpenCreate(false)} />

      {/* EDIT ROLE */}
      <EditRoleDrawer
        isOpen={openEdit}
        onClose={() => setOpenEdit(false)}
        role={selectedRole}
      />

      {/* EDIT TEMPLATE */}
      <EditRoleTemplateDrawer
        isOpen={openTemplate}
        onClose={() => setOpenTemplate(false)}
        role={selectedRole}
      />
    </>
  );
}