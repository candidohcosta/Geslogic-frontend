// frontend/src/types/event.ts

export enum RegistrationStatus {
  PENDING = "PENDING",
  AWAITING_PAYMENT = "AWAITING_PAYMENT",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  IN_WAITING_LIST = "IN_WAITING_LIST",
}

export enum EventFieldType {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  DATE = "DATE",
  CHECKBOX = "CHECKBOX",
  EMAIL = "EMAIL",
  PHONE = "PHONE",
  FILE = "FILE",
  DROPDOWN = "DROPDOWN",
  TEXTAREA = "TEXTAREA",
}

export enum CertificateSendingMode {
  MANUAL = 'MANUAL',
  ON_CHECKIN = 'ON_CHECKIN',
  AFTER_EVENT_END = 'AFTER_EVENT_END'
}

export interface EventFieldDefinitionData {
  id: string;
  fieldName: string;
  fieldType: EventFieldType;
  isRequired: boolean;
  order: number;
  placeholder?: string;
  isGroupingField: boolean;
  options?: string[];
  dependsOnFieldDefinitionId?: string; 
}

// --- NOVO: Interface para a Tarifa ---
export interface EventPricingTier {
  id?: string; // Opcional na criação
  name: string;
  price: number;
  multiRegistrationPrice?: number; 
  description?: string;
  requiredFieldDefinitionId?: string;
}

export interface CertificateConfig {
  enabled: boolean;
  backgroundFileId?: string;
  backgroundUrl?: string;
  textX: number;
  textY: number;
  fontSize: number;
  fontColor: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  maxWidth?: number; 
}

export interface EventData {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location: string;
  maxParticipants: number;
  waitingListMargin?: string; // Pode ser "10" ou "5%"
  isActive: boolean;
  isPublic: boolean;
  enableCheckIn: boolean;
  certificateSendingMode?: CertificateSendingMode;
  certificateConfig?: CertificateConfig;
  
  // REMOVIDOS: baseCost, costType1, costType2, costType3
  // SUBSTITUÍDO POR:
  pricingTiers: EventPricingTier[]; 
  baseCost?: number; 

  company: {
    id: string;
    name: string;
    slug: string;
  };
  fieldDefinitions: EventFieldDefinitionData[];
  banner?: {
    id: string;
    url: string;
  } | null;
  documents: {
    id: string;
    url: string;
    displayName: string;
  }[];
}

export interface MyRegistrationData {
  id: string;
  status: RegistrationStatus;
  registrationDate: Date;
  event: {
    id: string;
    name: string;
    company: {
      name: string;
    };
  };
}