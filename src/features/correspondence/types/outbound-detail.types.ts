// frontend/src/features/correspondence/types/outbound-detail.types.ts

export interface OutboundRegistryDetail {
  id: string;
  registryNumber: string;
  channel: string | null;
  department: string | null;
  createdAt: string;
}

export interface OutboundDocument {
  id: string;
  originalFileName: string;
  mimeType: string;
  createdAt: string;
}