// src/lib/authz.ts
import { UserRole, EventStaffRole, UserData } from '../types/user';

export type SubscribedService = 'EVENTS' | 'QUEUES' | 'SCHEDULING';

// 🔑 Mesmo conjunto de chaves do backend (mantém sincronizado)
export type FeatureKey =
  // Plataforma / Empresas / Billing
  | 'platform:access'
  | 'platform:admins.manage'
  | 'platform:settings'
  | 'companies:access'
  | 'companies:create'
  | 'companies:edit'
  | 'companies:finance'
  | 'billing:center'
  // Sistema / Ficheiros / Backups / DB
  | 'system:logs'
  | 'system:health'
  | 'system:backups.view'
  | 'system:backups.restore'
  | 'system:backups.upload'
  | 'system:db-console'
  | 'system:file-manager'
  | 'file-manager:delete-backup-files'
  | 'file-manager:delete-orphan-uploads'
  // Eventos
  | 'events:access'
  | 'events:list'
  | 'events:feedback'
  | 'events:staff.manage'
  | 'events:create'
  | 'event:checkin'
  // Filas/Queues
  | 'queues:access'
  | 'queues:admin'
  | 'queues:stats'
  | 'queues:monitor'
  // Agendamentos
  | 'scheduling:access'
  | 'scheduling:calendar'
  | 'scheduling:appointments'
  | 'scheduling:resources'
  | 'scheduling:profiles'
  // Gerais
  | 'general:email-templates'
  | 'general:policy-documents'
  // Outros perfis
  | 'participant:events'
  | 'operator:session';

type MinimalUser = UserData;

const hasModule = (user: MinimalUser | null | undefined, module: SubscribedService) =>
  !!user?.company?.subscribedServices?.includes(module);

// ⚠️ PREFERIR grants do backend
export function can(user: MinimalUser | null | undefined, feature: FeatureKey): boolean {
  if (!user) return false;

  // 1) Preferir grants vindos do backend
  if (Array.isArray(user.grants) && user.grants.includes(feature)) {
    return true;
  }

  // 2) Fallback (compatibilidade): derivar localmente (mantém UX caso grants ainda não estejam no perfil)
  switch (feature) {
    // Plataforma — por omissão reservar a SUPER (derivado simplificado)
    case 'platform:access':
    case 'platform:admins.manage':
    case 'companies:access':
    case 'companies:create':
    case 'companies:edit':
    case 'companies:finance':
    case 'billing:center':
    case 'system:logs':
    case 'system:health':
    case 'system:backups.view':
    case 'system:backups.restore':
    case 'system:backups.upload':
    case 'system:db-console':
    case 'system:file-manager':
    case 'file-manager:delete-backup-files':
    case 'file-manager:delete-orphan-uploads':
      return user.role === UserRole.PLATFORM_ADMIN;

    // Eventos
    case 'events:access':
    case 'events:list':
    case 'events:feedback':
    case 'events:staff.manage':
    case 'events:create':
      return (
        user.role === UserRole.PLATFORM_ADMIN ||
        (user.role === UserRole.COMPANY_ADMIN && hasModule(user, 'EVENTS'))
      );

    case 'event:checkin':
      return user.role === UserRole.EVENT_STAFF;

    // Filas
    case 'queues:access':
    case 'queues:stats':
    case 'queues:monitor':
    case 'queues:admin':
      return (
        user.role === UserRole.PLATFORM_ADMIN ||
        (user.role === UserRole.COMPANY_ADMIN && hasModule(user, 'QUEUES'))
      );

    // Agendamentos
    case 'scheduling:access':
    case 'scheduling:calendar':
    case 'scheduling:appointments':
    case 'scheduling:resources':
    case 'scheduling:profiles':
      return (
        user.role === UserRole.PLATFORM_ADMIN ||
        (user.role === UserRole.COMPANY_ADMIN && hasModule(user, 'SCHEDULING'))
      );

    // Gerais
    case 'general:email-templates':
    case 'general:policy-documents':
      return user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.COMPANY_ADMIN;

    // Outros
    case 'participant:events':
      return user.role === UserRole.PARTICIPANT;

    case 'operator:session':
      return user.role === UserRole.OPERATOR;

    default:
      return false;
  }
}

// Helpers semânticos (opcionais)
export const canAny = (u: MinimalUser | null | undefined, features: FeatureKey[]) => features.some(f => can(u, f));
export const canAll = (u: MinimalUser | null | undefined, features: FeatureKey[]) => features.every(f => can(u, f));