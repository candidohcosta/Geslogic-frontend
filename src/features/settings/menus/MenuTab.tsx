// frontend/src/features/settings/menus/MenuTab.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  useSensors,
  useSensor,
  DragOverlay,
  closestCorners,
  DragEndEvent,
  DragMoveEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';

import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Switch } from '../../../components/ui/Switch';
import {
  Loader2,
  Plus,
  Trash2,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';

import { getPlatformMenus, updatePlatformMenus, getServicesRegistry, ServiceRegistryItem, getAllRoles  } from '../../../services/api';

/* =============================
   Tipos (compatíveis com backend)
============================= */
/* type Role = 'PLATFORM_ADMIN'| 'PLATFORM_ADMIN_SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SUPPORT_L2' | 'OPERATOR' | 'USER';
const ALL_ROLES: Role[] = ['PLATFORM_ADMIN', 'PLATFORM_ADMIN_SUPER_ADMIN', 'COMPANY_ADMIN', 'SUPPORT_L2', 'OPERATOR', 'USER']; */

export type MenuItem = {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  externalUrl?: string;
  newWindow?: boolean;
  order?: number;
  children?: MenuItem[];

  visibleForRoles?: string[];
  requiresAuth?: boolean;
  required2FA?: boolean;
  requiredService?: string[];
  requiredGrants?: string[];
  requiresFeature?: string;

  badgeText?: string;
  badgeColor?: 'blue' | 'green' | 'red' | 'amber' | 'gray';

  electronOnly?: boolean;
};

type Props = { onHeaderActionsChange?: (actions: React.ReactNode) => void };

/* =============================
   Constantes de DnD (Linear/Notion style)
============================= */
const INDENTATION_WIDTH = 24; // px por nível
const MAX_DEPTH = 6;          // limite razoável para níveis

/* =============================
   Flat nodes (lista visual)
============================= */
type FlatNode = {
  id: string;
  parentId: string | null;
  depth: number;
  index: number; // posição na lista visível
  item: MenuItem;
};

/* =============================
   Utils imutáveis
============================= */
function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeOrder(items: MenuItem[]): MenuItem[] {
  return items.map((it, ix) => ({ ...it, order: (ix + 1) * 10 }));
}

/** Flatten completo (sem respeitar collapse), útil para rebuild */
function flattenAll(items: MenuItem[], parentId: string | null = null, depth = 0): FlatNode[] {
  let out: FlatNode[] = [];
  items.forEach((item) => {
    out.push({ id: item.id, parentId, depth, index: out.length, item });
    if (item.children?.length) {
      out = out.concat(flattenAll(item.children, item.id, depth + 1));
    }
  });
  return out;
}

/** Flatten VISÍVEL, respeitando colapsos (para render) */
function flattenVisible(
  items: MenuItem[],
  expandedById: Record<string, boolean>,
  parentId: string | null = null,
  depth = 0
): FlatNode[] {
  let out: FlatNode[] = [];
  items.forEach((item) => {
    out.push({ id: item.id, parentId, depth, index: out.length, item });
    const isExpanded = expandedById[item.id] ?? true; // por omissão, expandidos
    if (isExpanded && item.children?.length) {
      const childrenFlat = flattenVisible(item.children, expandedById, item.id, depth + 1);
      out = out.concat(childrenFlat);
    }
  });
  // Corrigir indices após concatenar
  return out.map((n, idx) => ({ ...n, index: idx }));
}

/** Rebuild a partir de uma lista flat com depth (stack algorithm) */
function buildTreeFromFlat(flat: FlatNode[]): MenuItem[] {
  const roots: MenuItem[] = [];
  const stack: { depth: number; node: MenuItem }[] = [];

  flat.forEach((fn) => {
    const base: MenuItem = { ...fn.item, children: [] };
    // Ajusta a stack para o depth atual
    while (stack.length > 0 && stack[stack.length - 1].depth >= fn.depth) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(base);
    } else {
      const parent = stack[stack.length - 1].node;
      parent.children = parent.children || [];
      parent.children.push(base);
    }
    stack.push({ depth: fn.depth, node: base });
  });

  // Normaliza order em todos os níveis
  const normalizeAll = (nodes: MenuItem[]) => {
    const withOrder = normalizeOrder(nodes);
    withOrder.forEach((n) => {
      if (n.children?.length) n.children = normalizeOrder(n.children);
      if (n.children?.length) normalizeAll(n.children);
    });
    return withOrder;
  };
  return normalizeAll(roots);
}

/** clamp helper */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

/** Calcula depth projetado a partir do deltaX horizontal */
function projectDepth(originalDepth: number, deltaX: number) {
  const change = Math.round(deltaX / INDENTATION_WIDTH);
  return clamp(originalDepth + change, 0, MAX_DEPTH);
}

/** Recalcula parentId de acordo com a profundidade e com os vizinhos acima */
function recomputeParents(flat: FlatNode[]): FlatNode[] {
  const out: FlatNode[] = [];
  for (let i = 0; i < flat.length; i++) {
    const node = { ...flat[i], index: i };
    if (node.depth === 0) {
      node.parentId = null;
    } else {
      // encontra o primeiro anterior com depth == node.depth - 1
      for (let j = i - 1; j >= 0; j--) {
        if (flat[j].depth === node.depth - 1) {
          node.parentId = flat[j].id;
          break;
        }
      }
      if (node.parentId === undefined) node.parentId = null; // fallback
    }
    out.push(node);
  }
  return out;
}

/* =============================
   Row (label-only + edição on-demand)
============================= */
function SortableRow({
  node,
  isEditing,
  onToggleExpand,
  onContextMenu,
  onDoubleClick,
  onChange,
  onRemove,
  serviceRegistry
}: {
  node: FlatNode;
  isEditing: boolean;
  onToggleExpand: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onDoubleClick: (id: string) => void;
  onChange: (id: string, field: keyof MenuItem, value: any) => void;
  onRemove: (id: string) => void;
  serviceRegistry: ServiceRegistryItem[] | undefined;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : undefined,
  };


const { data: roles } = useQuery({
  queryKey: ['roles'],
  queryFn: getAllRoles
});


  const item = node.item;
  const hasChildren = (item.children?.length ?? 0) > 0;

  return (
    <div ref={setNodeRef} style={style} >
      <div
        className="border rounded-md bg-white border-gray-200"
        style={{ marginLeft: node.depth * INDENTATION_WIDTH }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, item.id);
        }}
      >
        {/* Linha compacta */}
        <div className="px-2.5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-500 select-none"
              title="Arrastar"
            >
              ⋮⋮
            </span>

            {hasChildren && (
              <button
                className="text-gray-400"
                onClick={() => onToggleExpand(item.id)}
                title="Expandir/Recolher"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <div
              className="font-medium text-gray-700 truncate"
              onDoubleClick={() => onDoubleClick(item.id)}
              title="Duplo clique para editar"
            >
              {item.label || <span className="text-gray-400">Sem nome</span>}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
              title="Mais opções"
              onClick={(e) => onContextMenu(e, item.id)}
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>

            <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} title="Remover">
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        </div>

        {/* Painel de edição (on-demand) */}
        {isEditing && (
          <div className="px-3 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Label</Label>
                <Input
                  value={item.label}
                  onChange={(e) => onChange(item.id, 'label', e.target.value)}
                />
              </div>
              <div>
                <Label>Path</Label>
                <Input
                  value={item.path || ''}
                  onChange={(e) => onChange(item.id, 'path', e.target.value || undefined)}
                  placeholder="/rota-interna"
                />
              </div>
              <div>
                <Label>Ícone (Lucide)</Label>
                <Input
                  value={item.icon || ''}
                  onChange={(e) => onChange(item.id, 'icon', e.target.value || undefined)}
                  placeholder="ex.: HardDrive"
                />
              </div>

              {/* Segurança / Visibilidade */}
              <div className="flex items-center gap-3 mt-6">
                <Switch
                  checked={item.requiresAuth !== false}
                  onCheckedChange={(v) => onChange(item.id, 'requiresAuth', v)}
                />
                <Label>Requer autenticação</Label>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <Switch
                  checked={!!item.required2FA}
                  onCheckedChange={(v) => onChange(item.id, 'required2FA', v)}
                />
                <Label>Requer 2FA</Label>
              </div>

              <div>
                <Label>Feature flag necessária</Label>
                <Input
                  value={item.requiresFeature || ''}
                  onChange={(e) => onChange(item.id, 'requiresFeature', e.target.value || undefined)}
                  placeholder="ex.: support_module"
                />
              </div>


<div className="md:col-span-3">
  <Label>Serviço associado</Label>
  <select
    className="border rounded w-full px-2 py-1"
    value={item.requiredService || ''}
    onChange={(e) => onChange(item.id, 'requiredService', e.target.value || null)}
  >
    <option value="">— Nenhum —</option>
    {serviceRegistry?.map((svc) => (
      <option key={svc.id} value={svc.id}>
        {svc.name}
      </option>
    ))}
  </select>
</div>


              <div className="md:col-span-3">
                <Label>Grants necessários (separados por vírgulas)</Label>
                <Input
                  value={(item.requiredGrants ?? []).join(',')}
                  onChange={(e) =>
                    onChange(
                      item.id,
                      'requiredGrants',
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="ex.: FILES_READ, FILES_DELETE"
                />
              </div>

              <div className="md:col-span-3">
                <Label>Visível para Roles</Label>
                <div className="flex flex-wrap gap-2 mt-2">
{roles?.map((role: any) => {
  const r = role.name; // name = ID canónico (PLATFORM_ADMIN, COMPANY_ADMIN, ...)
  const active = (item.visibleForRoles ?? []).includes(r);
  return (
    <button
      key={r}
      type="button"
      className={
        active
          ? 'px-2 py-1 rounded border bg-blue-50 text-blue-700 text-xs'
          : 'px-2 py-1 rounded border text-gray-700 text-xs'
      }
      onClick={() => {
        const set = new Set(item.visibleForRoles ?? []);
        set.has(r) ? set.delete(r) : set.add(r);
        onChange(item.id, 'visibleForRoles', Array.from(set));
      }}
    >
      {role.label || r}
    </button>
  );
})}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================
   Context menu simples
============================= */
function ContextMenu({
  x, y, onClose, onAction,
}: {
  x: number; y: number;
  onClose: () => void;
  onAction: (action: 'edit' | 'add-child' | 'remove') => void;
}) {
  useEffect(() => {
    const onDoc = () => onClose();
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed z-[120] bg-white border rounded-md shadow-xl min-w-[160px] py-1 text-sm"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button className="w-full text-left px-3 py-1.5 hover:bg-gray-50" onClick={() => onAction('edit')}>
        Editar
      </button>
      <button className="w-full text-left px-3 py-1.5 hover:bg-gray-50" onClick={() => onAction('add-child')}>
        Adicionar subitem
      </button>
      <button className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-red-600" onClick={() => onAction('remove')}>
        Remover
      </button>
    </div>,
    document.body
  );
}

/* =============================
   MenuTab principal (V4 — Linear/Notion)
============================= */
export default function MenuTab({ onHeaderActionsChange }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['platform-settings', 'menus'], queryFn: getPlatformMenus });
  const { data: serviceRegistry } = useQuery({
    queryKey: ['platform-settings', 'services-registry'],
    queryFn: getServicesRegistry
  });

  const original: MenuItem[] = data?.sidebar ?? [];
  const [tree, setTree] = useState<MenuItem[]>(original);

  // Expansão: por omissão tudo aberto (Linear/Notion não colapsa por defeito)
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});

  // Edição on-demand
  const [editingId, setEditingId] = useState<string | null>(null);

  // Context menu
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxTargetId, setCtxTargetId] = useState<string | null>(null);
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // DnD: estado de arraste (id ativo, deltaX para calcular depth)
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragDeltaX, setDragDeltaX] = useState(0);

  // Flatten visível (respeita expansão) para render e DnD
  const flatVisible = useMemo(() => flattenVisible(tree, expandedById, null, 0), [tree, expandedById]);

  // Flatten completo (sem expansão) para rebuilds
  const flatAll = useMemo(() => flattenAll(tree), [tree]);

  // Dirty check
  const dirty = useMemo(() => JSON.stringify(tree) !== JSON.stringify(original), [tree, original]);

  const saveMut = useMutation({
    mutationFn: () => updatePlatformMenus({ sidebar: tree }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings', 'menus'] }),
  });

  const onSave = () => saveMut.mutate();
  const onReset = () => { setTree(original); setEditingId(null); setActiveId(null); setDragDeltaX(0); };

  useEffect(() => {
    onHeaderActionsChange?.(
      <div className="flex gap-2">
        <Button variant="outline" onClick={onReset} disabled={!dirty || saveMut.isPending}>
          Repor
        </Button>
        <Button onClick={onSave} disabled={!dirty || saveMut.isPending}>
          {saveMut.isPending ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> Guardar…</>) : 'Guardar'}
        </Button>
      </div>
    );
  }, [dirty, saveMut.isPending, original, tree]);

  useEffect(() => {
    if (!isLoading) setTree(original);
  }, [isLoading, original]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  /** Toggle expand/collapse por item */
  const onToggleExpand = (id: string) =>
    setExpandedById((e) => ({ ...e, [id]: !e[id] }));

  const onDoubleClick = (id: string) =>
    setEditingId((cur) => (cur === id ? null : id));

  const onContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setCtxTargetId(id);
    setCtxPos({ x: e.clientX + 2, y: e.clientY + 2 });
    setCtxOpen(true);
  };

  const onContextAction = (action: 'edit' | 'add-child' | 'remove') => {
    if (!ctxTargetId) return;
    if (action === 'edit') setEditingId(ctxTargetId);
    if (action === 'add-child') {
      setTree((prev) => {
        const next = clone(prev);
        // inserir child ao fim do array de filhos
        const addChild = (arr: MenuItem[]): boolean => {
          for (const it of arr) {
            if (it.id === ctxTargetId) {
              it.children = normalizeOrder([
                ...(it.children ?? []),
                {
                  id: `menu_${Date.now()}`,
                  label: 'Novo subitem',
                  path: '/',
                  icon: 'FileText',
                  requiresAuth: true,
                  children: [],
                },
              ]);
              setExpandedById((e) => ({ ...e, [ctxTargetId]: true }));
              return true;
            }
            if (it.children?.length && addChild(it.children)) return true;
          }
          return false;
        };
        addChild(next);
        return next;
      });
    }
    if (action === 'remove') {
      setTree((prev) => {
        const removeById = (arr: MenuItem[]): MenuItem[] =>
          arr
            .filter((it) => it.id !== ctxTargetId)
            .map((it) => ({ ...it, children: it.children ? removeById(it.children) : [] }));
        const next = removeById(prev);
        if (editingId === ctxTargetId) setEditingId(null);
        return next;
      });
    }
    setCtxOpen(false);
  };

  const onChangeField = (id: string, field: keyof MenuItem, value: any) => {
    setTree((prev) => {
      const next = clone(prev);
      const mut = (arr: MenuItem[]): boolean => {
        for (const it of arr) {
          if (it.id === id) {
            (it as any)[field] = value;
            return true;
          }
          if (it.children?.length && mut(it.children)) return true;
        }
        return false;
      };
      mut(next);
      return next;
    });
  };

  const onRemoveItem = (id: string) => {
    setTree((prev) => {
      const removeById = (arr: MenuItem[]): MenuItem[] =>
        arr
          .filter((it) => it.id !== id)
          .map((it) => ({ ...it, children: it.children ? removeById(it.children) : [] }));
      const next = removeById(prev);
      if (editingId === id) setEditingId(null);
      return next;
    });
  };

  const onAddItem = () => {
    const id = `menu_${Date.now()}`;
    setTree((prev) =>
      normalizeOrder([
        ...prev,
        {
          id,
          label: 'Novo item',
          path: '/',
          icon: 'FileText',
          requiresAuth: true,
          children: [],
        },
      ])
    );
  };

  /** DnD: enquanto move, capturar deltaX para projetar depth */
  const onDragMove = (evt: DragMoveEvent) => {
    const { delta, active } = evt;
    if (!active) return;
    setActiveId(String(active.id));
    setDragDeltaX(delta.x ?? 0);
  };

  /** DnD: ao terminar — reordenar flat e ajustar depth projetado */
  const onDragEnd = (evt: DragEndEvent) => {
    const { active, over, delta } = evt;
    if (!active || !over) {
      setActiveId(null);
      setDragDeltaX(0);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // usar a lista VISÍVEL para posições (índices)
    const currentIndex = flatVisible.findIndex((n) => n.id === activeId);
    const overIndex = flatVisible.findIndex((n) => n.id === overId);
    if (currentIndex === -1 || overIndex === -1) {
      setActiveId(null);
      setDragDeltaX(0);
      return;
    }

    const originalDepth = flatVisible[currentIndex].depth;
    const projected = projectDepth(originalDepth, delta.x ?? 0);

    // 1) Construímos um flat com TODOS (sem colapsos)
    const baseFlat = flattenAll(tree);

    // 2) Reordenamos nesse flat global (arrayMove)
    const from = baseFlat.findIndex((n) => n.id === activeId);
    const to = baseFlat.findIndex((n) => n.id === overId);
    if (from === -1 || to === -1) {
      setActiveId(null);
      setDragDeltaX(0);
      return;
    }

    // mover o elemento na lista flat
    let moved = arrayMove(baseFlat, from, to);

    // 3) Ajustar o depth do elemento movido
    const movedIdx = moved.findIndex((n) => n.id === activeId);
    moved[movedIdx] = { ...moved[movedIdx], depth: projected };

    // 4) Recalcular parentId coerente com o depth
    moved = recomputeParents(moved);

    // 5) Rebuild a árvore e substituir
    const rebuilt = buildTreeFromFlat(moved);
    setTree(rebuilt);

    // reset drag state
    setActiveId(null);
    setDragDeltaX(0);
  };

  return (
    <SettingsSectionCard
      accent
      title="Menus da Plataforma"
      description="Arraste verticalmente para ordenar; arraste horizontalmente para promover/despromover níveis (estilo Linear/Notion). Duplo clique ou botão direito para editar."
      className="min-w-0"
    >
      {/* Barra superior (fora do scroll): sem espaço extra */}
      <div className="flex items-center justify-between mb-0 min-w-0">
        <div className="text-sm text-gray-500">Itens do menu</div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onAddItem}>
            <Plus className="w-4 h-4 mr-2" /> Novo Item
          </Button>
        </div>
      </div>

      {/* Lista com scroll, colada visualmente à barra (sem gap) */}
      <div className="min-h-0 max-h-[43vh] overflow-y-auto pr-1 -mt-1 min-w-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={flatVisible.map((n) => n.id)}>
            <div className="space-y-2">
              {flatVisible.map((node) => (
                <SortableRow
                  key={node.id}
                  node={node}
                  isEditing={editingId === node.id}
                  onToggleExpand={onToggleExpand}
                  onContextMenu={onContextMenu}
                  onDoubleClick={onDoubleClick}
                  onChange={onChangeField}
                  onRemove={onRemoveItem}
                  serviceRegistry={serviceRegistry}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drag overlay simples */}
          {createPortal(
            <DragOverlay>
              {activeId ? (
                <div className="opacity-80">
                  <div className="border rounded-md p-3 bg-white shadow-xl">
                    <div className="font-semibold text-gray-700">A mover…</div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </div>

      {isLoading && <p className="text-sm text-gray-500 mt-3">A carregar menus…</p>}
      {!isLoading && tree.length === 0 && <p className="text-sm text-gray-500 mt-3">Ainda não existem entradas no menu.</p>}

      {ctxOpen && ctxTargetId && (
        <ContextMenu
          x={ctxPos.x}
          y={ctxPos.y}
          onClose={() => setCtxOpen(false)}
          onAction={onContextAction}
        />
      )}
    </SettingsSectionCard>
  );
}