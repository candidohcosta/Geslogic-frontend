// fronend/src/pages/PlatformUsersListPage.tsx

import React, { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import { ListPageTemplate } from "../components/templates/ListPageTemplate";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { MoreVertical, Users } from "lucide-react";

import { usePlatformUsers } from "../hooks/platform-users/usePlatformUsers";
import { useContextMenu } from "../components/context-menu/useContextMenu";
import ContextMenu from "../components/context-menu/ContextMenu";
import { ContextMenuItem } from "../components/context-menu/ContextMenuItem";

import CreateUserDrawer from "../components/platform-users/CreateUserDrawer";
import EditUserDrawer from "../components/platform-users/EditUserDrawer";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function PlatformUsersListPage() {
  const { user } = useAuth();

  // ✅ HOOKS NO TOPO — SEMPRE
  const [filters, setFilters] = useState({
    name: "",
    email: "",
  });

  const [drawerCreateOpen, setDrawerCreateOpen] = useState(false);
  const [drawerEditOpen, setDrawerEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const { state: cm, openAt, close } = useContextMenu({
    estimatedSize: { width: 200, height: 160 },
  });

  const {
    data: platformUsers = [],
    isLoading,
    error,
  } = usePlatformUsers();

  const [showDeleted, setShowDeleted] = useState(false);

  // ✅ Lista filtrada
  const filtered = useMemo(() => {
    const nameFilter = normalizeText(filters.name);
    const emailFilter = normalizeText(filters.email);

    return platformUsers.filter((u: any) => {
       if (!showDeleted && u.deletedAt) return false;

      const fullName = normalizeText(
        `${u.firstName ?? ""} ${u.lastName ?? ""}`
      );
      const email = normalizeText(u.email ?? "");

      return (
        fullName.includes(nameFilter) &&
        email.includes(emailFilter)
      );
    });
  }, [platformUsers, filters, showDeleted]);

  // ✅ SÓ AQUI — DEPOIS dos hooks
  const isPlatformAdmin =
    user?.effectiveRole === "PLATFORM_ADMIN" || user?.isSuperAdmin;

  if (!user) return <Navigate to="/login" />;
  if (!isPlatformAdmin) return <Navigate to="/dashboard" />;

  function openEditDrawer(u: any) {
    setSelectedUser(u);
    setDrawerEditOpen(true);
  }

  // ✅ Colunas — tipos alinhados com "left" | "center" | "right"
  const columns = [
    {
      key: "name",
      header: "Nome",
      widthPct: 32,
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
      widthPct: 28,
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
      widthPct: 20,
      align: "left" as const,
      render: (u: any) => (
        <span className={u.deletedAt ? "text-gray-500" : ""}>
          {u.roles?.map((r: any) => r.name).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Estado",
      widthPct: 10,
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

  return (
    <>
      {/* ✅ Template de ListPage */}
      <ListPageTemplate
        header={{
          icon: Users,
          title: "Utilizadores da Plataforma",
          subtitle: "Gestão de utilizadores do tipo PLATFORM_USER.",
          actions: (
            <Button onClick={() => setDrawerCreateOpen(true)}>
              + Criar Utilizador
            </Button>
          ),
        }}
        filters={{
          colsTemplate: "1fr 1fr",
          children: (
            <>
              {/* FILTRO NOME */}
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

              {/* FILTRO EMAIL */}
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

      {/* ✅ CONTEXT MENU */}
      {cm.open && selectedUser && (
        <ContextMenu
          open={cm.open}
          pageX={cm.x}
          pageY={cm.y}
          onClose={close}
        >
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

      {/* ✅ DRAWER — CRIAR UTILIZADOR */}
      <CreateUserDrawer
        isOpen={drawerCreateOpen}
        onClose={() => setDrawerCreateOpen(false)}
      />

      {/* ✅ DRAWER — EDITAR UTILIZADOR */}
      <EditUserDrawer
        isOpen={drawerEditOpen}
        onClose={() => setDrawerEditOpen(false)}
        userId={selectedUser?.id ?? ""}
        user={selectedUser}
      />
    </>
  );
}