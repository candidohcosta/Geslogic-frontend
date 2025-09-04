// frontend/src/types/user.d.ts

export enum UserRole {
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  COMPANY_ADMIN = "COMPANY_ADMIN",
  PARTICIPANT = "PARTICIPANT",
}

export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole; // Alterado para UserRole enum
  companyId?: string;
  companyName?: string;
  companySlug?: string;
  createdAt: string;
  updatedAt: string;
  expiresIn?: string; // NOVO: Duração da validade do token (ex: "60m", "12h")
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
