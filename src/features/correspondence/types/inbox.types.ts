// frontend/src/correspondence/types/inbox.types.ts


export type InboxStatus =
  | 'PENDING'
  | 'ON_HOLD'
  | 'ASSOCIATED'
  | 'REJECTED';

export interface InboxComment {
  id: string;
  status: 'ON_HOLD' | 'REJECTED';
  comment: string;
  createdAt: string;
  createdBy: {
    id: string;
    label: string;
  };

}

export interface InboxEntry {
  id: string;
  channel: string;
  createdAt: string;
  receivedAt?: string;
  
  subject?: string | null;
  description?: string | null;
  department?: string | null;

  origin?: {
    id: string;
    name: string;
  } | null;

  attachmentsCount: number;

  commentsCount: number;

  companyId: string;

  status: InboxStatus;

  comment?: string | null;
  updatedAt?: string | null;

  caseId?: string | null;
  caseNumber?: string | null;

}