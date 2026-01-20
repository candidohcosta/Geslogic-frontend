// frontend/src/types/support.ts
import { UserData } from "./user";

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_RESPONSE = 'WAITING_RESPONSE',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum SupportTicketPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum SupportTicketTargetLevel {
  COMPANY = 'COMPANY',
  PLATFORM = 'PLATFORM'
}

export interface TicketAttachment {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
}

export interface SupportTicketMessage {
  id: string;
  message: string;
  isInternalNote: boolean;
  attachments?: TicketAttachment[];
  createdAt: string; 
  sender: UserData;
}

export interface SupportTicket {
  id: string;
  sequentialId: number;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  targetLevel: SupportTicketTargetLevel;
  isPublicInCompany: boolean;
  deviceContext?: {
    browser?: string;
    os?: string;
    url?: string;
    userAgent?: string;
    screenResolution?: string;
    viewport?: string;
    lastErrors?: string[];
    history?: string[];
    connection?: string;    
  };
  createdAt: string;
  updatedAt: string;
  creator: UserData;
  assignedTo?: UserData;

  company?: {
    id: string;
    name: string;
    slug: string;
  };  

  messages?: SupportTicketMessage[];
}