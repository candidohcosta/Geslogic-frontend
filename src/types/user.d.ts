// frontend/src/types/user.d.ts
export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: string;
  companyName?: string;
  companySlug?: string; // NOVO: Adicionado companySlug
  createdAt: string;
  updatedAt: string;
}