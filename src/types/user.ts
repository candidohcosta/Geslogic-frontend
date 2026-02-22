// frontend/src/types/user.ts

export enum UserRole {
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  COMPANY_ADMIN = "COMPANY_ADMIN",
  PARTICIPANT = "PARTICIPANT",
  OPERATOR = "OPERATOR",
  EVENT_STAFF = 'EVENT_STAFF',
}

// Enum de tipos de Admin da Plataforma
export enum PlatformAdminType {
  SUPER_ADMIN = "SUPER_ADMIN",
  SUPPORT_L2 = "SUPPORT_L2",
  AUDITOR = "AUDITOR",
  FINANCE = "FINANCE",
}

export enum EventStaffRole {
  CHECKIN = 'CHECKIN',
  MANAGEMENT = 'MANAGEMENT'
}

export interface EventStaffDetailsData {
  id: string;
  staffRole: EventStaffRole;
  company?: {
    id: string;
    name: string;
  };
  assignedEvent?: {
    id: string;
    name: string;
  };
}

export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;

  platformAdminDetails?: {
    id: string;
    adminType: PlatformAdminType;
  } | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isTwoFactorEnabled?: boolean;
  twoFactorMethod?: 'TOTP' | 'EMAIL';
  is2FASetupRequired?: boolean;
  // A 'company' é um objeto aninhado que contém toda a informação da empresa.
  // É opcional, pois um PlatformAdmin não a terá.
  company?: {
    id: string;
    name: string;
    slug: string;
    subscribedServices: string[];
  } | null;

  // 'operatorDetails' só existirá para utilizadores com 'role: OPERATOR'.
  operatorDetails?: {
    id: string;
    allowedServiceIds: string[];
  } | null;
  // Opcional: token de atualização para lógica interna, se necessário
  //refreshToken?: string; 
  eventStaffDetails?: EventStaffDetailsData;
  grants?: string[]; // lista de FeatureKey atribuídas pelo backend
}

// Interface para os detalhes do participante no registo
export interface ParticipantDetailsFormData {
  phone: string;
  taxNumber: string;
  dateOfBirth: string; // Formato YYYY-MM-DD
  citizenCardNumber: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressPostalCode: string;
  addressCity: string;
  addressCountry: string;
}
