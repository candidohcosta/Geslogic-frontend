// frontend/src/features/correspondence/types/case-list.types.ts

export interface CorrespondenceCaseListItem {
  id: string;
  number: string;
  documentType: string;
  status: string;
  createdAt: string;
}

export interface CorrespondenceCaseListResponse {
  items: CorrespondenceCaseListItem[];
  total: number;
  page: number;
  pageSize: number;
}