export interface CorrespondenceRegistry {

  id: string;
  companyId: string;

  direction: 'IN' | 'OUT';

  registryNumber?: string | null;

  channel: string;
  department?: string | null;

  subject?: string | null;
  description?: string | null;

  status:
    | 'PENDING'
    | 'ON_HOLD'
    | 'REJECTED'
    | 'ASSOCIATED'
    | 'DRAFT'
    | 'SENT'
    | 'CANCELLED';

  createdAt: string;
}

export type OutboundRegistryStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CANCELLED';

export interface OutboundRegistry {
  id: string;
  companyId: string;
  caseId?: string | null;

  direction: 'OUT';

  registryNumber?: string | null;
  numberingScheme?: string | null;
  sequenceNumber?: number | null;
  numberYear?: number | null;

  channel: string;
  department?: string | null;
  subject?: string | null;
  description?: string | null;

  status: OutboundRegistryStatus;

  comment?: string | null;

  attachmentsCount?: number;


destination?: {
  id: string;
  name: string;
} | null;

destinationId?: string | null;


  createdAt: string;
  createdByUserId: string;

  updatedAt?: string | null;
  updatedByUserId?: string | null;
}
