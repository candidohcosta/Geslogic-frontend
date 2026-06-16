export interface CorrespondenceCase {
  id: string;
  number: string;
  documentType: string;
  status: string;
  confidentialityLevel: string;
  retentionPolicy: string;
  createdAt: string;
  metadata: Record<string, any>;
}