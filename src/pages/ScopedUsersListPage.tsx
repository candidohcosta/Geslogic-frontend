// frontend/src/pages/ScopedUsersListPage.tsx

import React, { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import { ListPageTemplate } from "../components/templates/ListPageTemplate";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { MoreVertical, Users } from "lucide-react";

import { useScopedUsers } from "../hooks/scoped-users/useScopedUsers";
import { useCompanies } from "../hooks/companies/useCompanies";

import { CompanySelect } from "../components/common/CompanySelect";

import { useContextMenu } from "../components/context-menu/useContextMenu";
import ContextMenu from "../components/context-menu/ContextMenu";
import { ContextMenuItem } from "../components/context-menu/ContextMenuItem";

import CreateScopedUserDrawer from "../components/scoped-users/CreateScopedUserDrawer";
import EditScopedUserDrawer from "../components/scoped-users/EditScopedUserDrawer";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ScopedUsersListPage() {
  const { user } = useAuth();

  /* ---- state ---- */
  const [filters, setFilters] = useState({ name: "", email: "" });
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const [drawerCreateOpen, setDrawerCreateOpen] = useState(false);
  const [drawerEditOpen, setDrawerEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  /* ---- data ---- */
  const { data: users = [] } = useScopedUsers();
  const { data: companies = [] } = useCompanies();

  const isPlatformAdmin = user?.effectiveRole === "PLATFORM_ADMIN";

  /* ---- filtering ---- */
  const filtered = useMemo(() => {
    const nameFilter = normalizeText(filters.name);
    const emailFilter = normalizeText(filters.email);

    return users.filter((u: any) => {
      if (!showDeleted && u.deletedAt) return false;

      if (isPlatformAdmin && selectedCompanyId) {
        const hasCompanyScope = u.roleAssignments?.some(
          (ra: any) => ra.scope === `company:${selectedCompanyId}`
        );
        if (!hasCompanyScope) return false;
      }

      const fullName = normalizeText(
        `${u.firstName ?? ""} ${u.lastName ?? ""}`
      );
      const email = normalizeText(u.email ?? "");

      return (
        fullName.includes(nameFilter) &&
        email.includes(emailFilter)
      );
    });
  }, [users, filters, showDeleted, selectedCompanyId, isPlatformAdmin]);

  /* ---- ui helpers ---- */
  function openEditDrawer(u: any) {
    setSelectedUser(u);
    setDrawerEditOpen(true);
  }

  /* ---- table columns ---- */
  const columns = [
    {
      key: "name",
      header: "Nome",
      widthPct: 20,
      align: "left" as const,
      render: (u: any) => (
        <div className={u.deletedAt ? "text-gray-500" : ""}>
          {u.firstName} {u.lastName}
          {u.deletedAt && (
            <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">
              Eliminado
            </span>
          )}
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      widthPct: 20,
      align: "left" as const,
      render: (u: any) => (
        <span className={u.deletedAt ? "text-gray-500" : ""}>
          {u.email}
        </span>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      widthPct: 18,
      align: "left" as const,
      render: (u: any) => (
        <span className={u.deletedAt ? "text-gray-500" : ""}>
          {u.roleAssignments?.map((ra: any) => ra.role?.name).join(", ") || "—"}
        </span>
      ),
    },
/*     {
      key: "scope",
      header: "Âmbito",
      widthPct: 14,
      align: "left" as const,
      render: (u: any) => {
        const scopes = u.roleAssignments?.map((ra: any) => ra.scope) ?? [];

        let label = "—";
        if (scopes.includes("platform")) label = "Plataforma";
        else if (scopes.some((s: string) => s.startsWith("company:")))
          label = "Empresa";

        return (
          <span className={u.deletedAt ? "text-gray-500" : ""}>{label}</span>
        );
      },
    }, */
    {
      key: "company",
      header: "Empresa",
      widthPct: 28,
      align: "left" as const,
      render: (u: any) => {
        const companyScopes =
          u.roleAssignments?.filter(
            (ra: any) => ra.scope?.startsWith("company:")
          ) ?? [];

        if (companyScopes.length === 0) {
          return (
            <span className={u.deletedAt ? "text-gray-500" : ""}>
              Plataforma
            </span>
          );
        }

        if (companyScopes.length > 1) {
          return (
            <span className={u.deletedAt ? "text-gray-500" : ""}>
              Múltiplas empresas
            </span>
          );
        }

        const companyId = companyScopes[0].scope.replace("company:", "");
        const company = companies.find(c => c.id === companyId);

        return (
          <span className={u.deletedAt ? "text-gray-500" : ""}>
            {company?.name ?? "—"}
          </span>
        );
      },
    },    
    {
      key: "isActive",
      header: "Estado",
      widthPct: 6,
      align: "center" as const,
      render: (u: any) =>
        u.deletedAt ? (
          <span className="text-gray-500 font-medium">Eliminado</span>
        ) : u.isActive ? (
          <span className="text-green-700 font-medium">Ativo</span>
        ) : (
          <span className="text-red-600 font-medium">Inativo</span>
        ),
    },
    {
      key: "actions",
      header: "",
      widthPct: 10,
      align: "right" as const,
      render: (u: any) => (
        <button
          className="p-2 text-gray-500 hover:text-gray-800"
          onClick={(e) => {
            e.preventDefault();
            setSelectedUser(u);
            openAt(e.pageX, e.pageY);
          }}
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      ),
    },
  ];

  const { state: cm, openAt, close } = useContextMenu({
    estimatedSize: { width: 200, height: 160 },
  });

  /* ---- guards ---- */
  if (!user) return <Navigate to="/login" />;

  return (
    <>
      <ListPageTemplate
        header={{
          icon: Users,
          title: "Utilizadores",
          subtitle: "Gestão de utilizadores de empresa e genéricos.",
          actions: (
            <div className="flex items-center gap-3 w-full max-w-[42rem]">
              <div className="flex-1 min-w-[26em]">
                {isPlatformAdmin && (
                  <CompanySelect
                    mode="controlled"
                    companies={companies}
                    value={selectedCompanyId ?? ""}
                    onChange={(val) =>
                      setSelectedCompanyId(val === "ALL" ? null : val)
                    }
                    includeAllOption
                    triggerWidthClass="w-full"
                  />
                )}
              </div>

              <Button
                className="shrink-0"
                onClick={() => setDrawerCreateOpen(true)}
              >
                + Criar Utilizador
              </Button>
            </div>
          ),
        }}
        filters={{
          colsTemplate: "1fr 1fr",
          children: (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium">Nome</label>
                <Input
                  value={filters.name}
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="Filtrar"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium">Email</label>
                <Input
                  value={filters.email}
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, email: e.target.value }))
                  }
                  placeholder="Filtrar"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                />
                <label className="text-sm">
                  Mostrar utilizadores eliminados
                </label>
              </div>
            </>
          ),
        }}
        table={{
          columns,
          data: filtered,
          rowKey: (u: any) => u.id,
          emptyState: <div className="py-10">Nenhum utilizador.</div>,
        }}
      />

      {cm.open && selectedUser && (
        <ContextMenu open={cm.open} pageX={cm.x} pageY={cm.y} onClose={close}>
          <ContextMenuItem
            onClick={() => {
              openEditDrawer(selectedUser);
              close();
            }}
          >
            Gerir Utilizador
          </ContextMenuItem>
        </ContextMenu>
      )}

      <CreateScopedUserDrawer
        isOpen={drawerCreateOpen}
        onClose={() => setDrawerCreateOpen(false)}
      />

      <EditScopedUserDrawer
        isOpen={drawerEditOpen}
        onClose={() => setDrawerEditOpen(false)}
        user={selectedUser}
        companies={companies}
      />
    </>
  );
}