export interface DocumentVersion {
  id: string;
  versionNumber: number;
  originalFileName: string;
  mimeType: string;
  createdAt: string;
  locked: boolean;
}

export interface CaseDocument {
  document: {
    id: string;
    hasContent: boolean;
    contentLocked: boolean;
  };
  versions: DocumentVersion[];
}