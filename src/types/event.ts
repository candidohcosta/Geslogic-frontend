// src/types/event.ts

export enum RegistrationStatus {
  PENDING = "PENDING",
  AWAITING_PAYMENT = "AWAITING_PAYMENT",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
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

export interface EventFieldDefinitionData {
  id: string;
  fieldName: string;
  fieldType: EventFieldType;
  isRequired: boolean;
  order: number;
  placeholder?: string;
  options?: string[];
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
  isActive: boolean;
  isPublic: boolean;
  baseCost: number;
  costType1?: number;
  costType2?: number;
  costType3?: number;
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