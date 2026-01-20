// frontend/src/types/user.d.ts

export enum UserRole {
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  COMPANY_ADMIN = "COMPANY_ADMIN",
  PARTICIPANT = "PARTICIPANT",
  OPERATOR = "OPERATOR",
  EVENT_STAFF = 'EVENT_STAFF',
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

/* export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole; // Alterado para UserRole enum
  companyId?: string;
  companyName?: string;
  companySlug?: string;
  subscribedServices?: string[];
  createdAt: string;
  updatedAt: string;
  expiresIn?: string; // NOVO: Duração da validade do token (ex: "60m", "12h")
} */

export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
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
