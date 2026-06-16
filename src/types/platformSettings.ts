// src/types/platformSettings.ts

export type Role =
  | 'PLATFORM_ADMIN'
  | 'COMPANY_ADMIN'
  | 'SUPPORT_L2'
  | 'OPERATOR'
  | 'USER';

export type GrantKey = string;

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  externalUrl?: string;
  newWindow?: boolean;
  order?: number;
  children?: MenuItem[];

  visibleForRoles?: Role[];
  requiresAuth?: boolean;
  required2FA?: boolean;
  requiredGrants?: GrantKey[];
  requiresFeature?: string;

  badgeText?: string;
  badgeColor?: 'blue'|'green'|'red'|'amber'|'gray';

  electronOnly?: boolean;
}

export interface PlatformMenus {
  sidebar: MenuItem[];
}

export interface PlatformSettings {
  featureFlags?: Record<string, boolean>;
  menus?: PlatformMenus;
}