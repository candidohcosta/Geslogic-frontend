// src/services/api.ts (VERSÃO FINAL E CORRIGIDA)
import { RegistrationStatus, MyRegistrationData } from '../types/event';
import { EventData } from '../pages/ListEventsPage'; // 1. Importa a interface
import { FilePurpose } from '../types/file';
import { TicketStatus } from '../types/queue';
import { tError, ErrorKey } from '../lib/translations';
import { SupportTicketStatus, SupportTicketPriority } from '../types/support';
import { ResourceType } from '../types/scheduling';

//const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const BASE_URL = process.env.REACT_APP_API_BASE_URL;// || '/api';

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
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      throw new Error(tError(ErrorKey.NETWORK_ERROR));
    }

    // O NestJS costuma colocar o objeto enviado no campo 'message' 
    // ou diretamente na raiz do erro.
    const errorCode = errorData.code || (typeof errorData.message === 'object' ? errorData.message.code : errorData.message);

    // Tentamos traduzir. Se não houver tradução para aquele código, usamos a mensagem original do backend.
    const translatedMessage = tError(errorCode as ErrorKey);
    
    // Se tError devolveu a chave formatada [ERRO: ...], significa que não encontrou tradução
    const finalMessage = translatedMessage.startsWith('[ERRO:') ? (errorData.message || translatedMessage) : translatedMessage;

    throw new Error(finalMessage);
  }

  if (response.status === 204) return;
  return response.json();
}

// Função específica para chamadas públicas (sem cookies/auth)
async function publicApiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Nota: credentials: 'omit' garante que não enviamos cookies "estragados"
  const response = await fetch(`${BASE_URL}${endpoint}`, { 
      ...options, 
      headers, 
      credentials: 'omit' 
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erro na comunicação pública.');
  }

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

export const verify2FA = (code: string, tempToken: string, isTrustedDevice: boolean) => {
  return apiFetch('/auth/2fa/authenticate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tempToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, isTrustedDevice }) 
  });
};

export const adminReset2FA = (userId: string) => apiFetch(`/users/${userId}/reset-2fa`, { method: 'PATCH' });

// Gera o segredo e o QR Code
export const generate2FASecret = () => apiFetch('/auth/2fa/generate', { method: 'POST' });

// Confirma o código e ativa
export const enable2FA = (code: string) => apiFetch('/auth/2fa/enable', { 
  method: 'POST', 
  body: JSON.stringify({ code }) 
});

export const startEmail2FASetup = () => apiFetch('/auth/2fa/email/start', { method: 'POST' });

export const completeEmail2FASetup = (code: string) => apiFetch('/auth/2fa/email/complete', { 
  method: 'POST', 
  body: JSON.stringify({ code }) 
});

export const disable2FA = () => apiFetch('/auth/2fa/disable', { method: 'POST' });

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
export const fetchEvents = async (companyId?: string): Promise<EventData[]> => {
  const query = companyId ? `?companyId=${companyId}` : '';
  const data = await apiFetch(`/events${query}`) as any; 
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

// --- GESTÃO PÚBLICA DE INSCRIÇÃO (PAGAMENTOS / STATUS) ---

export const fetchPublicRegistrationStatus = (id: string, token: string) => {
  // Chamamos o endpoint público enviando o token de segurança na Query String
  // Usamos 'publicApiFetch' se o tiveres definido, caso contrário usa 'apiFetch'
  // Como a rota é @Public no backend, não há conflito de cookies.
  return apiFetch(`/events/public/registrations/${id}?token=${token}`);
};

export const submitPublicPaymentProof = (id: string, token: string, fileId: string) => {
  return apiFetch(`/events/public/registrations/${id}/proof?token=${token}`, {
    method: 'POST',
    body: JSON.stringify({ fileId })
  });
};

export const fetchPaymentConfig = (companyId: string) => apiFetch(`/companies/${companyId}/payment-config`);

export const updatePaymentConfig = ({ companyId, data }: { companyId: string, data: any }) => {
  return apiFetch(`/companies/${companyId}/payment-config`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const submitPublicFeedback = (registrationId: string, token: string, data: { rating: number, comment?: string }) => {
  // Usamos publicApiFetch para não enviar cookies de sessão que possam estar inválidos
  return publicApiFetch(`/events/public/registrations/${registrationId}/feedback?token=${token}`, {
    method: 'POST',
    body: JSON.stringify(data)
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

export const fetchMyOperatorStats = (filters: { startDate: string, endDate: string }) => {
  const params = new URLSearchParams(filters);
  return apiFetch(`/stats/operator/my-performance?${params.toString()}`);
};


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


// --- QUEUE SERVICES ---

export const fetchServices = (companyId?: string) => {
  // Se um companyId for fornecido, adiciona-o como um parâmetro de query
  const endpoint = companyId ? `/services?companyId=${companyId}` : '/services';
  return apiFetch(endpoint);
};

export const createService = (serviceData: any) => {
  return apiFetch('/services', { method: 'POST', body: JSON.stringify(serviceData) });
};

export const updateService = ({ id, serviceData }: { id: string, serviceData: any }) => {
  return apiFetch(`/services/${id}`, { method: 'PUT', body: JSON.stringify(serviceData) });
};

export const deleteService = (id: string) => {
  return apiFetch(`/services/${id}`, { method: 'DELETE' });
};

export const fetchServiceById = (id: string) => apiFetch(`/services/${id}`);


// --- QUEUE COUNTERS ---

export const fetchCounters = (companyId?: string) => {
  const endpoint = companyId ? `/counters?companyId=${companyId}` : '/counters';
  return apiFetch(endpoint);
};

export const fetchCounterById = (id: string) => apiFetch(`/counters/${id}`);

export const createCounter = (counterData: any) => {
  return apiFetch('/counters', { method: 'POST', body: JSON.stringify(counterData) });
};

export const updateCounter = ({ id, counterData }: { id: string, counterData: any }) => {
  return apiFetch(`/counters/${id}`, { method: 'PUT', body: JSON.stringify(counterData) });
};

export const deleteCounter = (id: string) => {
  return apiFetch(`/counters/${id}`, { method: 'DELETE' });
};


// --- QUEUE KIOSKS ---

export const fetchKiosks = (companyId?: string) => {
  const endpoint = companyId ? `/kiosks?companyId=${companyId}` : '/kiosks';
  return apiFetch(endpoint);
};

export const fetchKioskById = (id: string) => apiFetch(`/kiosks/${id}`);

export const createKiosk = (kioskData: any) => {
  return apiFetch('/kiosks', { method: 'POST', body: JSON.stringify(kioskData) });
};

export const updateKiosk = ({ id, kioskData }: { id: string, kioskData: any }) => {
  return apiFetch(`/kiosks/${id}`, { method: 'PUT', body: JSON.stringify(kioskData) });
};

export const deleteKiosk = (id: string) => {
  return apiFetch(`/kiosks/${id}`, { method: 'DELETE' });
};

export const fetchKioskConfig = (deviceSecret: string) => {
  return apiFetch(`/kiosks/config/${deviceSecret}`);
};

export const createTicket = (data: { serviceId: string, isPriority: boolean; customUserDataId?: string; }, deviceSecret: string) => {
  return apiFetch('/tickets/kiosk', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'X-Device-Secret': deviceSecret, // Envia o segredo no cabeçalho
    },
  });
};

export const performKioskCheckIn = (deviceSecret: string, code: string) => {
  return apiFetch('/scheduling/check-in', {
    method: 'POST',
    headers: { 'X-Device-Secret': deviceSecret },
    body: JSON.stringify({ code })
  });
};


// --- QUEUE DISPLAYS ---

export const fetchDisplays = (companyId?: string) => {
  const endpoint = companyId ? `/displays?companyId=${companyId}` : '/displays';
  return apiFetch(endpoint);
};
export const fetchDisplayById = (id: string) => apiFetch(`/displays/${id}`);
export const createDisplay = (displayData: any) => apiFetch('/displays', { method: 'POST', body: JSON.stringify(displayData) });
export const updateDisplay = ({ id, displayData }: { id: string, displayData: any }) => apiFetch(`/displays/${id}`, { method: 'PUT', body: JSON.stringify(displayData) });
export const deleteDisplay = (id: string) => apiFetch(`/displays/${id}`, { method: 'DELETE' });

export const fetchDisplayState = (deviceSecret: string) => {
  return apiFetch(`/displays/state/${deviceSecret}`);
};


// --- OPERATOR SESSIONS ---

export const startOperatorSession = (sessionData: { 
  counterId: string,
  stationId: string,
  attendedServiceIds: string[] }) => {
  return apiFetch('/operator-sessions/start', {
    method: 'POST',
    body: JSON.stringify(sessionData),
  });
};

export const callNextTicket = (sessionId: string) => {
  return apiFetch(`/operator-sessions/${sessionId}/call-next`, { method: 'POST' });
};

export const endOperatorSession = (sessionId: string) => {
  return apiFetch(`/operator-sessions/${sessionId}/end`, { method: 'PATCH' });
};

export const fetchDisplayConfig = (deviceSecret: string) => {
  return apiFetch(`/displays/config/${deviceSecret}`);
};

export const updateTicketStatus = ({ ticketId, status }: { ticketId: string, status: TicketStatus }) => {
  return apiFetch(`/tickets/${ticketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const fetchOperatorSession = (sessionId: string) => {
  return apiFetch(`/operator-sessions/${sessionId}`);
};

export const transferTicket = ({ ticketId, newServiceId, keepPriority }: { ticketId: string, newServiceId: string, keepPriority: boolean }) => {
  return apiFetch(`/tickets/${ticketId}/transfer`, {
    method: 'PATCH',
    body: JSON.stringify({ newServiceId, keepPriority }),
  });
};

export const searchTickets = (ticketNumber: string) => {
  return apiFetch(`/tickets/search?ticketNumber=${ticketNumber}`);
};

export const recallTicket = (ticketId: string) => {
  return apiFetch(`/tickets/${ticketId}/recall`, { method: 'PATCH' });
};

export const fetchMyActiveSession = () => apiFetch('/operator-sessions/my-active-session');

// --- QUEUE STATIONS ---

export const fetchStationsByCounter = (counterId: string) => {
  return apiFetch(`/stations/by-counter/${counterId}`);
};

export const bulkUpdateStations = (counterId: string, stations: { id?: string, name: string }[]) => {
  return apiFetch(`/stations/by-counter/${counterId}`, {
    method: 'PUT',
    body: JSON.stringify({ stations }),
  });
};

export const fetchDashboardStats = (filters: { 
  startDate: string, 
  endDate: string, 
  companyId?: string, 
  serviceId?: string, 
  operatorId?: string 
}) => {
  const params = new URLSearchParams();
  
  params.append('startDate', filters.startDate);
  params.append('endDate', filters.endDate);
  
  // Adiciona os filtros opcionais apenas se eles tiverem um valor
  if (filters.companyId) params.append('companyId', filters.companyId);
  if (filters.serviceId) params.append('serviceId', filters.serviceId);
  if (filters.operatorId) params.append('operatorId', filters.operatorId);
  
  return apiFetch(`/stats/dashboard?${params.toString()}`);
};

// --- QUEUE OPERATORS ---

export const fetchOperators = (companyId?: string) => {
  const endpoint = companyId ? `/users/operators?companyId=${companyId}` : '/users/operators';
  return apiFetch(endpoint);
};

export const fetchOperatorById = (id: string) => apiFetch(`/users/operators/${id}`);

export const createOperator = (operatorData: any) => {
  return apiFetch('/users/operators', { method: 'POST', body: JSON.stringify(operatorData) });
};

export const updateOperator = ({ id, operatorData }: { id: string, operatorData: any }) => {
  return apiFetch(`/users/operators/${id}`, { method: 'PUT', body: JSON.stringify(operatorData) });
};

export const deleteOperator = (id: string) => {
  return apiFetch(`/users/operators/${id}`, { method: 'DELETE' });
};

export const forceCloseMySessions = () => {
  return apiFetch('/operator-sessions/force-close-mine', { method: 'POST' });
};

export const fetchActiveSessions = (companyId?: string) => {
  const endpoint = companyId 
    ? `/operator-sessions/active-list?companyId=${companyId}` 
    : '/operator-sessions/active-list';
  return apiFetch(endpoint);
};

export const adminForceCloseSession = (sessionId: string) => {
  return apiFetch(`/operator-sessions/${sessionId}/force-close`, { method: 'PATCH' });
};

export const fetchOperatorSessionStats = (sessionId: string) => {
  return apiFetch(`/stats/operator-session/${sessionId}`);
};

// --- PRIORITY SCHEDULES ---

export const fetchSchedules = (companyId?: string) => {
  const endpoint = companyId ? `/priority-schedules?companyId=${companyId}` : '/priority-schedules';
  return apiFetch(endpoint);
};

export const fetchScheduleById = (id: string) => apiFetch(`/priority-schedules/${id}`);

export const createSchedule = (scheduleData: any) => {
  return apiFetch('/priority-schedules', { method: 'POST', body: JSON.stringify(scheduleData) });
};

export const updateSchedule = ({ id, scheduleData }: { id: string, scheduleData: any }) => {
  return apiFetch(`/priority-schedules/${id}`, { method: 'PUT', body: JSON.stringify(scheduleData) });
};

export const deleteSchedule = (id: string) => {
  return apiFetch(`/priority-schedules/${id}`, { method: 'DELETE' });
};

// --- USER GROUPS ---

/* export const fetchUserGroups = (companyId?: string) => {
  const endpoint = companyId ? `/user-groups?companyId=${companyId}` : '/user-groups';
  return apiFetch(endpoint);
};

export const fetchUserGroupById = (id: string) => apiFetch(`/user-groups/${id}`);

export const createUserGroup = (groupData: any) => {
  return apiFetch('/user-groups', { method: 'POST', body: JSON.stringify(groupData) });
};

export const updateUserGroup = ({ id, groupData }: { id: string, groupData: any }) => {
  return apiFetch(`/user-groups/${id}`, { method: 'PUT', body: JSON.stringify(groupData) });
};

export const deleteUserGroup = (id: string) => {
  return apiFetch(`/user-groups/${id}`, { method: 'DELETE' });
};

export const fetchUsersByCompany = (companyId: string) => apiFetch(`/users/by-company/${companyId}`);

export const addUserGroupMembersFromCsv = (groupId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiFetch(`/user-groups/${groupId}/add-members-from-csv`, {
    method: 'POST',
    body: formData,
  });
}; */

// --- CUSTOM USER TYPES ---

export const fetchUserTypes = (companyId?: string) => {
  const endpoint = companyId ? `/custom-user-types?companyId=${companyId}` : '/custom-user-types';
  return apiFetch(endpoint);
};

export const fetchUserTypeById = (id: string) => apiFetch(`/custom-user-types/${id}`);

export const createUserType = (data: any) => {
  return apiFetch('/custom-user-types', { method: 'POST', body: JSON.stringify(data) });
};

export const updateUserType = ({ id, data }: { id: string, data: any }) => {
  return apiFetch(`/custom-user-types/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteUserType = (id: string) => {
  return apiFetch(`/custom-user-types/${id}`, { method: 'DELETE' });
};

// --- CUSTOM FIELD DEFINITIONS ---

export const addCustomField = (data: any) => {
  return apiFetch('/custom-field-definitions', { method: 'POST', body: JSON.stringify(data) });
};

export const updateCustomField = ({ id, data }: { id: string, data: any }) => {
  return apiFetch(`/custom-field-definitions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteCustomField = (id: string) => {
  return apiFetch(`/custom-field-definitions/${id}`, { method: 'DELETE' });
};

export const reorderCustomFields = ({ userTypeId, orderedIds }: { userTypeId: string, orderedIds: string[] }) => {
  return apiFetch(`/custom-field-definitions/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ userTypeId, orderedIds }),
  });
};

// --- CUSTOM USER DATA ---

export const fetchUserData = (userTypeId: string) => {
  return apiFetch(`/custom-user-data?userTypeId=${userTypeId}`);
};

export const uploadUserDataCsv = (userTypeId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(`/custom-user-data/upload-csv?userTypeId=${userTypeId}`, {
    method: 'POST',
    body: formData,
  });
};

export const setIdentifierField = (fieldId: string) => {
  return apiFetch(`/custom-field-definitions/${fieldId}/set-identifier`, { method: 'PATCH' });
};

export const fetchUserDataById = (id: string) => {
  return apiFetch(`/custom-user-data/${id}`);
};

export const createUserData = (data: any) => {
  return apiFetch('/custom-user-data', { method: 'POST', body: JSON.stringify(data) });
};

export const updateUserData = ({ id, data }: { id: string, data: any }) => {
  return apiFetch(`/custom-user-data/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteUserData = (id: string) => {
  return apiFetch(`/custom-user-data/${id}`, { method: 'DELETE' });
};

// --- PUBLIC KIOSK API ---

export const findKioskUser = (data: { serviceId: string, searchFields: Record<string, string> }, deviceSecret: string) => {
  return apiFetch('/kiosk-api/find-user', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'X-Device-Secret': deviceSecret },
  });
};

export const setDisplayNameField = (fieldId: string) => {
  return apiFetch(`/custom-field-definitions/${fieldId}/set-display-name`, { method: 'PATCH' });
};

export const fetchTestKioskHours = (kioskId: string) => {
    return apiFetch(`/kiosks/check-hours/${kioskId}`);
}

// --- QZ TRAY PRINTING ---

export const fetchPrintSignature = (toSign: string) => {
  // ADICIONAR encodeURIComponent para proteger caracteres especiais (+, &, =, etc.)
  return apiFetch(`/kiosks/sign-print-request?request=${encodeURIComponent(toSign)}`);
};

export const fetchPrintCertificate = () => {
  return apiFetch(`/kiosks/print-certificate`);
};

// --- MONITORIZAÇÃO DE DISPOSITIVOS ---

export const fetchDevicesStatus = (companyId?: string) => {
  const endpoint = companyId 
    ? `/devices-monitor/status?companyId=${companyId}` 
    : '/devices-monitor/status';
  return apiFetch(endpoint);
};

export const reloadDevice = (type: string, id: string) => {
  return apiFetch(`/devices-monitor/reload/${type}/${id}`, { method: 'POST' });
};

// --- PUBLIC MOBILE QUEUE ---

export const fetchPublicServices = (slug: string) => {
  return apiFetch(`/public-queues/${slug}`);
};

export const createMobileTicket = (slug: string, serviceId: string) => {
  return apiFetch(`/public-queues/${slug}/tickets`, {
    method: 'POST',
    body: JSON.stringify({ serviceId })
  });
};

export const fetchPublicTicketStatus = (ticketId: string) => {
  return apiFetch(`/public-queues/tickets/${ticketId}`);
};

export const fetchPushPublicKey = () => apiFetch('/public-queues/push/public-key');

export const subscribeToPush = (ticketId: string, subscription: any) => {
  return apiFetch(`/public-queues/tickets/${ticketId}/subscribe-push`, {
    method: 'POST',
    body: JSON.stringify(subscription)
  });
};

// --- SISTEMA DE NOTIFICAÇÕES ---

export const fetchNotifications = () => {
  return apiFetch('/notifications');
};

export const markNotificationAsRead = (id: string) => {
  return apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
};

export const markAllNotificationsAsRead = () => {
  return apiFetch('/notifications/read-all', { method: 'POST' });
};

// --- MONITORIZAÇÃO DE EMPRESAS (PLATFORM ADMIN) ---

export const toggleCompanyMonitoring = (companyId: string) => {
  return apiFetch(`/companies/${companyId}/toggle-monitoring`, { method: 'POST' });
};

export const checkCompanyMonitoring = (companyId: string) => {
  return apiFetch(`/companies/${companyId}/is-monitored`);
};

export const fetchAggregatedUptime = (companyId: string, days: number = 7) => {
  return apiFetch(`/devices-monitor/uptime-aggregated?companyId=${companyId}&days=${days}`);
};

export const fetchAggregatedUptimeDetailed = (companyId?: string, days: number = 7) => {
  return apiFetch(`/devices-monitor/uptime-detailed-aggregated?companyId=${companyId}&days=${days}`);
};

export const submitTicketFeedback = (ticketId: string, rating: number, comment?: string) => {
  return apiFetch(`/public-queues/tickets/${ticketId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment })
  });
};

export const fetchDetailedFeedback = (params: any) => apiFetch(`/stats/feedback/detailed?${new URLSearchParams(params)}`);

export const fetchOperatorProfile = (id: string, start: string, end: string) => 
    apiFetch(`/stats/operator/${id}/profile?startDate=${start}&endDate=${end}`);


// --- SUPPORT MODULE (HELPDESK) ---

export const fetchSupportTickets = (filters: { 
    status?: SupportTicketStatus, 
    priority?: SupportTicketPriority, 
    viewAll?: boolean,
    page?: number,
    search?: string
}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.viewAll) params.append('viewAll', 'true');
  if (filters.page) params.append('page', filters.page?.toString() || '1');
  if (filters.search) params.append('search', filters.search);
  
  return apiFetch(`/support?${params.toString()}`);
};

export const fetchSupportTicketById = (id: string) => {
  return apiFetch(`/support/${id}`);
};

// RENOMEADO de createTicket para createSupportTicket
export const createSupportTicket = (data: {
  subject: string;
  message: string;
  priority: SupportTicketPriority;
  isPublicInCompany: boolean;
  deviceContext: any;
  attachments?: any[];
}) => {
  return apiFetch('/support', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const replyToSupportTicket = (ticketId: string, data: {
  message: string;
  attachments?: any[];
  isInternalNote?: boolean;
}) => {
  return apiFetch(`/support/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const escalateSupportTicket = (ticketId: string) => {
  return apiFetch(`/support/${ticketId}/escalate`, { method: 'PATCH' });
};

// RENOMEADO de updateTicketStatus para updateSupportTicketStatus
export const updateSupportTicketStatus = (ticketId: string, status: SupportTicketStatus) => {
  return apiFetch(`/support/${ticketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
};

export const checkSupportAttention = async () => {
  // Retorna boolean direto
  const res = await apiFetch('/support/check-attention');
  return res; 
};

// --- SCHEDULING MODULE ---
// RECURSOS
// Aceita companyId opcional
export const fetchSchedulingResources = (companyId?: string) => {
  const query = companyId ? `?companyId=${companyId}` : '';
  return apiFetch(`/scheduling/resources${query}`);
};

// Aceita companyId no body
export const createSchedulingResource = (data: {
  name: string;
  type: ResourceType;
  timezone: string;
  workingHours: any;
  companyId?: string;
  locationName?: string;
  address?: string;
}) => {
  return apiFetch('/scheduling/resources', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// PERFIS
// CORREÇÃO: Aceitar companyId opcional
export const fetchSchedulingProfiles = (companyId?: string) => {
  const query = companyId ? `?companyId=${companyId}` : '';
  return apiFetch(`/scheduling/profiles${query}`);
};

export const createSchedulingProfile = (data: any) => {
  return apiFetch('/scheduling/profiles', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// --- AGENDAMENTOS (Public/Private) ---

export const fetchAvailableSlots = (profileId: string, date: string, location?: string) => {
  const params = new URLSearchParams({ profileId, date });
  
  // Adiciona location se existir
  if (location) params.append('location', location);
  
  return publicApiFetch(`/scheduling/availability?${params.toString()}`);
};

export const createAppointment = (data: {
  profileId: string;
  startTime: string; // ISO String completa
  // dados do cliente, etc... (adicionaremos depois)
}) => {
  return apiFetch('/scheduling/appointments', { // Criaremos este endpoint a seguir
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const rescheduleAppointment = (id: string, newStartTime: string) => {
  return apiFetch(`/scheduling/appointments/${id}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify({ newStartTime })
  });
};

// --- AGENDAMENTO PÚBLICO ---

export const fetchPublicProfile = (slug: string) => {
  return publicApiFetch(`/scheduling/public/profile/${slug}`);
};

export const createPublicAppointment = (data: any) => {
  return publicApiFetch('/scheduling/public/appointments', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const fetchAppointments = (filters: { 
  startDate?: string, 
  endDate?: string, 
  resourceId?: string,
  companyId?: string 
}) => {
  const params = new URLSearchParams();

  // Só adicionamos ao URL se o valor existir e não for 'undefined'
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.companyId) params.append('companyId', filters.companyId);
  
  // Tratamento especial para o resourceId
  if (filters.resourceId && filters.resourceId !== 'undefined' && filters.resourceId !== 'ALL') {
      params.append('resourceId', filters.resourceId);
  }

  return apiFetch(`/scheduling/appointments?${params.toString()}`);
};

// Cancelamento pelo Admin (Usa apiFetch autenticado)
export const cancelAppointmentAsAdmin = (appointmentId: string) => {
  return apiFetch(`/scheduling/appointments/${appointmentId}/cancel`, {
    method: 'PATCH'
  });
};

// Cancelamento Público (Usa publicApiFetch sem cookies)
export const cancelAppointmentPublic = (appointmentId: string, cancellationToken: string) => {
  return publicApiFetch('/scheduling/public/appointments/cancel', {
    method: 'POST',
    body: JSON.stringify({ appointmentId, cancellationToken })
  });
};

export const fetchEventFeedbackStats = (filters: { eventId?: string }) => {
  const params = new URLSearchParams();
  
  // Só adiciona o parametro se for definido e diferente de ALL
  if (filters.eventId && filters.eventId !== 'ALL') {
    params.append('eventId', filters.eventId);
  }
  
  return apiFetch(`/events/stats/feedback?${params.toString()}`);
};

// --- GESTÃO DE EVENT STAFF (PORTEIROS) ---

export const fetchEventStaff = (companyId: string) => {
  return apiFetch(`/users/event-staff?companyId=${companyId}`);
};

export const createEventStaff = (data: any) => {
  return apiFetch('/users/event-staff', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateEventStaff = (id: string, data: any) => {
  return apiFetch(`/users/event-staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

// Reutilizamos o deleteUser ou criamos deleteEventStaff se preferires isolar
export const deleteEventStaff = (id: string) => {
  return apiFetch(`/users/${id}`, { method: 'DELETE' });
};

// --- EVENT CHECK-IN ---
export const performEventCheckIn = (registrationId: string) => {
  return apiFetch('/events/check-in', {
    method: 'POST',
    body: JSON.stringify({ registrationId })
  });
};

// Função especial para download de ficheiros
export const downloadEventExport = async (eventId: string) => {
  // Nota: Usamos apiFetch mas precisamos de processar como BLOB
  const response = await fetch(`${BASE_URL}/events/${eventId}/export`, {
    method: 'GET',
    headers: {
        // Se usares cookies, 'credentials: include' é tratado pelo browser
        // Se usares Bearer token, tens de o adicionar aqui se o tiveres acessível
        // Assumindo Cookie Auth:
    },
    credentials: 'include'
  });

  if (!response.ok) throw new Error("Erro ao exportar ficheiro.");

  // Converter para Blob e forçar download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inscricoes-evento-${eventId}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// --- EVENT CAPACITY & INTEREST ---

export const cancelPublicRegistration = (id: string, token: string) => {
  return publicApiFetch(`/events/public/registrations/${id}/cancel?token=${token}`, { method: 'POST' });
};

export const fetchEventCapacity = (eventId: string) => {
  return publicApiFetch(`/events/public/${eventId}/capacity`);
};

export const registerEventInterest = (eventId: string, email: string, name?: string) => {
  return publicApiFetch(`/events/public/${eventId}/interest`, {
    method: 'POST',
    body: JSON.stringify({ email, name })
  });
};

// --- EVENT CLONING ---

export const cloneEvent = (eventId: string) => {
  return apiFetch(`/events/${eventId}/clone`, { method: 'POST' });
};