// src/services/api.ts (VERSÃO FINAL E CORRIGIDA)
import { RegistrationStatus, MyRegistrationData } from '../types/event';
import { EventData } from '../pages/ListEventsPage'; // 1. Importa a interface
import { FilePurpose } from '../types/file';

//const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

  // Criamos um "event dispatcher" para o evento de 401
  const onUnauthorized = new EventTarget();
  export const addUnauthorizedListener = (callback: () => void) => {
    onUnauthorized.addEventListener('unauthorized', callback);
  };

 let refreshingPromise: Promise<any> | null = null;

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Primeira tentativa
  let response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers, credentials: 'include' });

  if (response.status === 401 && endpoint !== '/auth/login') {
    // Se o pedido falhar com 401, tentamos o refresh
    if (!refreshingPromise) {
      // Inicia o processo de refresh apenas se ainda não estiver a decorrer
      refreshingPromise = fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
        .then(async (refreshResponse) => {
          if (!refreshResponse.ok) {
            // Se o refresh falhar, limpa a promessa e desloga
            refreshingPromise = null;
            onUnauthorized.dispatchEvent(new Event('unauthorized'));
            const errorData = await refreshResponse.json().catch(() => ({}));
            throw new Error(errorData.message || 'Sessão expirada.');
          }
          // Se o refresh for bem-sucedido, o novo accessToken já está no cookie.
          refreshingPromise = null;
          return; // A promessa resolve sem valor
        })
        .catch((error) => {
          refreshingPromise = null;
          onUnauthorized.dispatchEvent(new Event('unauthorized'));
          throw error;
        });
    }

    try {
      await refreshingPromise; // Espera que o refresh termine
      // Tenta novamente o pedido original. O navegador agora tem o novo cookie.
      response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers, credentials: 'include' });
    } catch (error) {
      throw error; // Se o refresh falhou, o erro será propagado
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || 'Ocorreu um erro.');
  }

  if (response.status === 204) return;
  return response.json();
}

// AUTH
export const loginUser = (email: string, password: string) => {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const registerUser = (userData: any) => {
  return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
};

export const logoutUser = () => {
  return apiFetch('/auth/logout', {
    method: 'POST',
    // Não precisa de body, a autenticação é feita pelo token no header
  });
};

// USERS
export const fetchUserProfile = () => apiFetch('/auth/profile');
/* export const updateUserProfile = (profileData: any) => {
  return apiFetch('/users/profile', {
    method: 'PATCH', // Usar PATCH é geralmente melhor para atualizações parciais
    body: JSON.stringify(profileData),
  });
}; */
export const updateUserProfile = (profileData: any) => {
  return apiFetch('/auth/profile', { // <-- A ROTA CORRETA
    method: 'PATCH',
    body: JSON.stringify(profileData),
  });
};
export const changeUserPassword = (passwordData: any) => {
  return apiFetch('/auth/change-password', {
    method: 'PATCH', // Usar PATCH é mais correto para esta operação
    body: JSON.stringify(passwordData),
  });
};
export const forgotPassword = (email: string) => {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};
export const resetPassword = ({ token, newPassword }: { token: string, newPassword: string }) => {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
};
export const fetchUserById = (userId: string) => apiFetch(`/users/${userId}`);

// COMPANIES
export const fetchCompanies = async () => {
  const data = await apiFetch('/companies');
  return data.companies || data;
};
export const fetchCompanyDetails = async (companyId: string) => {
  const endpoint = companyId === 'my-company' ? '/companies/my-company' : `/companies/${companyId}`;
  const data = await apiFetch(endpoint);
  return data.company || data;
};
export const createCompany = (companyData: any) => {
  return apiFetch('/companies', { method: 'POST', body: JSON.stringify(companyData) });
};
export const updateCompany = ({ companyId, companyData }: { companyId: string, companyData: any }) => {
  return apiFetch(`/companies/${companyId}`, { method: 'PUT', body: JSON.stringify(companyData) });
};
export const deleteCompany = (companyId: string) => {
  return apiFetch(`/companies/${companyId}`, { method: 'DELETE' });
};
export const activateDeactivateCompany = ({ companyId, isActive }: { companyId: string, isActive: boolean }) => {
  return apiFetch(`/companies/${companyId}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) });
};
export const fetchPublicCompanyProfile = (slug: string) => {
  return apiFetch(`/companies/public/${slug}`);
};
export const fetchLocationByPostalCode = (code: string) => {
  return apiFetch(`/utils/postal-code/${code}`);
};

export const deleteFile = (fileId: string) => {
  return apiFetch(`/uploads/file/${fileId}`, { method: 'DELETE' });
};


// COMPANY ADMINS
export const fetchCompanyAdmins = (companyId?: string) => {
  const endpoint = companyId ? `/company-admin-users?companyId=${companyId}` : '/company-admin-users';
  return apiFetch(endpoint);
};
export const fetchCompanyAdminById = (adminId: string) => {
  return apiFetch(`/company-admin-users/${adminId}`);
};
export const createCompanyAdmin = (adminData: any) => {
  return apiFetch('/company-admin-users', { method: 'POST', body: JSON.stringify(adminData) });
};
export const updateCompanyAdmin = ({ adminId, adminData }: { adminId: string; adminData: any }) => {
  console.log("!!! ESTOU A USAR A FUNÇÃO updateCompanyAdmin CORRETA (com PATCH) !!!");
  return apiFetch(`/company-admin-users/${adminId}`, { method: 'PATCH', body: JSON.stringify(adminData) });
};
export const deleteCompanyAdmin = (adminId: string) => {
  return apiFetch(`/company-admin-users/${adminId}`, { method: 'DELETE' });
};
export const activateDeactivateAdmin = ({ adminId, isActive }: { adminId: string, isActive: boolean }) => {
  return apiFetch(`/company-admin-users/${adminId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
};

// EVENTS
export const fetchEvents = async (): Promise<EventData[]> => {
  const data = await apiFetch('/events') as any; 
  return data.events || data;
};
export const fetchEventById = (eventId: string) => apiFetch(`/events/${eventId}`);
export const createEvent = (eventData: any) => {
  return apiFetch('/events', { method: 'POST', body: JSON.stringify(eventData) });
};
export const updateEvent = ({ eventId, eventData }: { eventId: string, eventData: any }) => {
  return apiFetch(`/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(eventData) });
};
export const deleteEvent = (eventId: string) => {
  return apiFetch(`/events/${eventId}`, { method: 'DELETE' });
};
export const addEventField = ({ eventId, fieldData }: { eventId: string, fieldData: any }) => {
  return apiFetch(`/events/${eventId}/field-definitions`, {
    method: 'POST',
    body: JSON.stringify(fieldData),
  });
};
export const deleteEventField = ({ eventId, fieldId }: { eventId: string, fieldId: string }) => {
  return apiFetch(`/events/${eventId}/field-definitions/${fieldId}`, {
    method: 'DELETE',
  });
};
export const reorderEventFields = ({ eventId, orderPayload }: { eventId: string, orderPayload: any }) => {
  return apiFetch(`/events/${eventId}/field-definitions/reorder`, {
    method: 'PATCH',
    body: JSON.stringify(orderPayload),
  });
};
export const registerForEvent = ({ eventId, registrationData }: { eventId: string, registrationData: any }) => {
  return apiFetch(`/events/${eventId}/register`, {
    method: 'POST',
    body: JSON.stringify(registrationData),
  });
};

export const fetchEventRegistrations = (eventId: string, filters: any) => {
  const params = new URLSearchParams();
  // Constrói a query string a partir dos filtros
  Object.entries(filters).forEach(([key, value]) => {
    if (value) { // Adiciona apenas se houver valor
      params.append(key, String(value));
    }
  });
  return apiFetch(`/events/${eventId}/registrations?${params.toString()}`);
};

export const fetchRegistrationDetails = (registrationId: string) => {
  return apiFetch(`/events/registrations/${registrationId}/details`);
};

export const updateRegistrationStatus = ({ registrationId, status }: { registrationId: string, status: RegistrationStatus }) => {
  return apiFetch(`/events/registrations/${registrationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const updateFileDetails = ({ fileId, data }: { fileId: string, data: { displayName: string } }) => {
  return apiFetch(`/uploads/file/${fileId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};


// SMTP CONFIG
export const fetchSmtpConfig = async (companyId: string) => {
  const response = await apiFetch(`/companies/${companyId}/mail-config`);
  // Devolvemos apenas a propriedade 'config' da resposta
  return response.config; 
};

export const updateSmtpConfig = ({ companyId, smtpData }: { companyId: string, smtpData: any }) => {
  return apiFetch(`/companies/${companyId}/mail-config`, {
    method: 'PUT', // Ou POST/PATCH dependendo do teu backend
    body: JSON.stringify(smtpData),
  });
};

export const testSmtpConfig = ({ companyId, smtpData, recipientEmail }: { companyId: string, smtpData: any, recipientEmail: string }) => {
  return apiFetch(`/companies/${companyId}/mail-config/test`, {
    method: 'POST',
    body: JSON.stringify({
      config: smtpData,
      recipientEmail: recipientEmail,
    }),
  });
};

// LOGS
export const fetchLogs = (filters: { 
  page?: number; 
  limit?: number; 
  level?: string; 
  action?: string; 
  userId?: string;
  startDate?: string;
  endDate?: string;
  messageQuery?: string;
  userQuery?: string;
  sortBy?: string; // <-- Garante que o tipo aceita
  sortOrder?: 'ASC' | 'DESC'; // <-- Garante que o tipo aceita
}) => {
  // Usamos URLSearchParams para construir a query string de forma segura
  const params = new URLSearchParams();
  
  // Adiciona cada filtro à query string apenas se ele tiver um valor
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.level) params.append('level', filters.level);
  if (filters.action) params.append('action', filters.action);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.messageQuery) params.append('messageQuery', filters.messageQuery);
  if (filters.userQuery) params.append('userQuery', filters.userQuery);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  
  return apiFetch(`/logs?${params.toString()}`);
};
export const fetchLogActions = () => apiFetch('/logs/actions');
export const fetchLogLevels = () => apiFetch('/logs/levels');

export const fetchAllLogsForExport = (filters: any) => {
  // ... (constrói os params da mesma forma que o fetchLogs)
  const params = new URLSearchParams();
  // ...
  return apiFetch(`/logs/export?${params.toString()}`);
};


//MAILS
export const sendCustomEmail = ({ registrationId, emailData }: { registrationId: string, emailData: { subject: string, body: string, cc?: string } }) => {
  return apiFetch(`/events/registrations/${registrationId}/send-email`, {
    method: 'POST',
    body: JSON.stringify(emailData),
  });
};

// --- EMAIL TEMPLATES ---

export const fetchEmailTemplates = (filters: any) => {
  const params = new URLSearchParams();

  // A LÓGICA DE LIMPEZA
  for (const key in filters) {
    if (filters[key]) { // Só adiciona ao URL se o valor não for vazio, nulo ou undefined
      params.append(key, filters[key]);
    }
  }
  
  return apiFetch(`/email-templates?${params.toString()}`);
};

export const fetchEmailTemplateById = (id: string) => apiFetch(`/email-templates/${id}`);

export const createEmailTemplate = (templateData: any) => {
  return apiFetch('/email-templates', {
    method: 'POST',
    body: JSON.stringify(templateData),
  });
};

export const updateEmailTemplate = ({ id, templateData }: { id: string, templateData: any }) => {
  return apiFetch(`/email-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(templateData),
  });
};

export const deleteEmailTemplate = (id: string) => {
  return apiFetch(`/email-templates/${id}`, {
    method: 'DELETE',
  });
};

export const fetchTemplatePlaceholders = (type: string) => {
  return apiFetch(`/email-templates/placeholders/${type}`);
};

export const fetchSentEmails = (filters: any) => {
  const params = new URLSearchParams();
  for (const key in filters) {
    if (filters[key]) { // Só adiciona se o valor não for vazio
      params.append(key, filters[key]);
    }
  }
  return apiFetch(`/sent-emails?${params.toString()}`);
};

export const fetchSentEmailLogDetails = (id: string) => apiFetch(`/sent-emails/${id}`);

export const fetchPubliclyListedEvents = () => apiFetch('/events/public/listed');

export const uploadFile = (data: {
  file: File;
  ownerType: string;
  ownerId: string;
  purpose: FilePurpose;
  displayName?: string;
}) => {
  // 1. Construímos o FormData aqui dentro
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('ownerType', data.ownerType);
  formData.append('ownerId', data.ownerId);
  if (data.displayName) {
    formData.append('displayName', data.displayName);
  }

  // 2. Usamos a nossa função 'apiFetch' para consistência,
  // mas com uma pequena adaptação para ficheiros.
  return apiFetch(
    `/uploads/file/${data.purpose}`, // O endpoint correto
    {
      method: 'POST',
      body: formData,
      // 3. O "truque" para o 'apiFetch' funcionar com FormData
/*       headers: {
        // Ao remover o 'Content-Type', o navegador irá defini-lo
        // automaticamente para 'multipart/form-data' com o 'boundary' correto.
        'Content-Type': undefined as any, 
      },*/
    }
  );

};



// --- PARTICIPANTS ---

export const fetchMyRegistrations = (filter?: 'upcoming' | 'past' | 'all') => {
  // Se o filtro for 'all' ou não for definido, não adicionamos o parâmetro
  const endpoint = (filter && filter !== 'all') ? `/participants/my-registrations?filter=${filter}` : '/participants/my-registrations';
  return apiFetch(endpoint);
};

export const fetchUpcomingRegistrations = () => apiFetch('/participants/my-registrations?filter=upcoming');

export const fetchSuggestedEvents = () => apiFetch('/participants/suggested-events');

export const addFavoriteCompany = (companyId: string) => {
  return apiFetch(`/favorites/company/${companyId}`, { method: 'POST' });
};

export const removeFavoriteCompany = (companyId: string) => {
  return apiFetch(`/favorites/company/${companyId}`, { method: 'DELETE' });
};

export const fetchMyFavoriteCompanies = () => apiFetch('/favorites/my-companies');

// --- DASHBOARD ---
export const fetchPlatformStats = () => apiFetch('/dashboard/platform-stats');


// --- SYSTEM HEALTH ---

export const checkFileSystemConsistency = () => apiFetch('/system-health/check-consistency');

export const cleanOrphanFiles = () => apiFetch('/system-health/clean-orphan-files', { method: 'DELETE' });

export const cleanOrphanRecords = () => apiFetch('/system-health/clean-orphan-records', { method: 'DELETE' });

export const cleanFunctionallyOrphanRecords = () => {
  return apiFetch('/system-health/clean-functional-orphans', { method: 'DELETE' });
};

// --- POLICY DOCUMENTS ---
export const fetchPolicies = () => apiFetch('/policy-documents');

export const fetchPolicyById = (id: string) => apiFetch(`/policy-documents/${id}`);

export const createPolicy = (data: any) => {
  return apiFetch('/policy-documents', { method: 'POST', body: JSON.stringify(data) });
};

export const updatePolicy = ({ policyId, data }: { policyId: string, data: any }) => {
  return apiFetch(`/policy-documents/${policyId}`, { method: 'PATCH', body: JSON.stringify(data) });
};

export const deletePolicy = (id: string) => {
  return apiFetch(`/policy-documents/${id}`, { method: 'DELETE' });
};