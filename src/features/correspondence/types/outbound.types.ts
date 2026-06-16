// frontend/src/features/correspondence/types/outbound.types.ts

export interface CreateOutboundInput {
  channel: string;
  department?: string;
}

export interface OutboundRegistry {
  id: string;
  companyId: string;

  registryNumber: string;
  status: 'DRAFT' | 'SENT' | 'CANCELLED';

  channel: string;
  department?: string | null;

  subject?: string | null;
  description?: string | null;

  createdAt: string;
}