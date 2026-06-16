// src/lib/buildSidebar.ts
import type { MenuItem, PlatformSettings, Role, GrantKey } from '../types/platformSettings';

type BuildUser = {
  role?: Role | null;
  twoFAEnabled?: boolean;
  grants?: GrantKey[];
  isElectron?: boolean;
  isAuthenticated?: boolean;
};

function hasAllGrants(required: GrantKey[] | undefined, userGrants: GrantKey[] | undefined) {
  if (!required || required.length === 0) return true;
  if (!userGrants || userGrants.length === 0) return false;
  return required.every(g => userGrants.includes(g));
}

export function buildSidebar(settings: PlatformSettings, user: BuildUser): MenuItem[] {
  const flags = settings.featureFlags || {};
  const base = settings?.menus?.sidebar ?? [];

  const role = user.role ?? null;
  const usernameIsAuth = user.isAuthenticated || !!role;
  const twoFA = !!user.twoFAEnabled;
  const electron = !!user.isElectron;
  const grants = user.grants ?? [];

  const sortByOrder = (a: MenuItem, b: MenuItem) => (a.order ?? 9999) - (b.order ?? 9999);

  const canShow = (item: MenuItem): boolean => {
    if (item.requiresAuth !== false && !usernameIsAuth) return false;

    if (item.visibleForRoles && role && !item.visibleForRoles.includes(role)) return false;

    if (item.required2FA && !twoFA) return false;

    if (item.requiresFeature && flags[item.requiresFeature] !== true) return false;

    if (item.requiredGrants && !hasAllGrants(item.requiredGrants, grants)) return false;

    if (item.electronOnly && !electron) return false;

    return true;
  };

  const normalize = (items: MenuItem[]): MenuItem[] => {
    return items
      .filter(canShow)
      .map(i => ({
        ...i,
        children: i.children ? normalize(i.children) : [],
      }))
      .sort(sortByOrder);
  };

  return normalize(base);
}