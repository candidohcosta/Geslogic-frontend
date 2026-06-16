// src/lib/transformMenuForClassicSidebar.ts
import type { MenuItem as DynamicItem } from '../types/platformSettings';
import type { MenuGroup } from '../components/sidebar/menuSchema';

/**
 * Converte o menu dinâmico (tree) para o formato do menu clássico:
 * MenuGroup[] -> { id, title, icon, direct?, items[] }
 */
export function transformMenuForClassicSidebar(
  dynamicMenu: DynamicItem[]
): MenuGroup[] {

  const groups: MenuGroup[] = dynamicMenu.map((group) => {
    // children -> items
    const items = (group.children ?? []).map((child) => ({
      label: child.label,
      to: child.path || child.externalUrl || '#',
      icon: child.icon ?? null,
      features: [], // ignoramos aqui, o builder já fez RBAC
    }));

    // direct group (grupo sem children)
    const isDirect = (!group.children || group.children.length === 0) &&
                     (group.path || group.externalUrl);

    if (isDirect) {
      return {
        id: group.id,
        title: group.label,
        icon: group.icon ?? null,
        direct: true,
        items: [
          {
            label: group.label,
            to: group.path || group.externalUrl || '#',
            icon: group.icon ?? null,
            features: [],
          },
        ],
      };
    }

    return {
      id: group.id,
      title: group.label,
      icon: group.icon ?? null,
      direct: false,
      items,
    };
  });

  // Fallback se não houver nada
  if (groups.length === 0) {
    return [
      {
        id: 'fallback',
        title: 'Menu',
        icon: null,
        direct: true,
        items: [
          { label: 'Dashboard', to: '/dashboard', icon: null },
          { label: 'Configurações', to: '/platform/settings', icon: null },
        ],
      },
    ];
  }

  return groups;
}