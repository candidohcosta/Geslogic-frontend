// frontend/src/features/correspondence/types/document-detail.types.ts

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  originalFileName: string;
  mimeType: string;
  createdAt: string;
  locked: boolean;
}

export interface DocumentDetail {
  document: {
    id: string;
    hasContent: boolean;
    contentLocked: boolean;
  };
  versions: DocumentVersion[];
}