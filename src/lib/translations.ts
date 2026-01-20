// src/lib/translations.ts

import { EmailTemplateType } from '../types/email';
import { SubscribedService } from '../types/company'; // Importa o enum de serviços subscritos
import { PriorityRuleType } from '../types/schedules'; // Importa o enum de regras de prioridade

// Criamos um "dicionário" que mapeia cada valor do enum para a sua tradução
export const serviceTranslations: Record<SubscribedService, string> = {
  [SubscribedService.EVENTS]: 'Gestão de Eventos',
  [SubscribedService.QUEUES]: 'Gestão de Filas',
  [SubscribedService.SCHEDULING]: 'Agendamentos',
};

// Uma função "ajudante" que devolve a tradução ou o nome original
export const translateServiceName = (service: SubscribedService): string => {
  return serviceTranslations[service] || service;
};

// --- TRADUÇÕES PARA O TIPO DE REGRA DE PRIORIDADE ---

const priorityRuleTypeTranslations: Record<PriorityRuleType, string> = {
  [PriorityRuleType.ALWAYS_ACTIVE]: 'Sempre Ativa',
  [PriorityRuleType.SCHEDULED]: 'Agendada por Horário',
};

export const translatePriorityRuleType = (ruleType: PriorityRuleType): string => {
  return priorityRuleTypeTranslations[ruleType] || ruleType;
};

// --- TRADUÇÕES PARA MENSAGENS DE ERRO ---

// Definimos as CHAVES DE ERRO (IDs únicos e fáceis de usar no código)
export enum ErrorKey {
    // Erros de Sistema
    CONTEXT_NOT_FOUND = 'CONTEXT_NOT_FOUND',
    ACCESS_DENIED = 'ACCESS_DENIED',
    SAVE_FAILED = 'SAVE_FAILED',
    NETWORK_ERROR = 'NETWORK_ERROR',
    
    // Erros de Filas
    QUEUE_NO_SERVICES = 'QUEUE_NO_SERVICES',
    QUEUE_DAILY_LIMIT = 'QUEUE_DAILY_LIMIT',
    QUEUE_SUSPENDED = 'QUEUE_SUSPENDED',
    QUEUE_ALREADY_ACTIVE = 'QUEUE_ALREADY_ACTIVE',
    QUEUE_OLD_TICKET = 'QUEUE_OLD_TICKET',
    
    FEEDBACK_ALREADY_SUBMITTED = 'FEEDBACK_ALREADY_SUBMITTED',

    // Erros de Dispositivo
    DEVICE_QR_FAIL = 'DEVICE_QR_FAIL',
    DEVICE_QZ_ERROR = 'DEVICE_QZ_ERROR',
    DEVICE_NO_PRINTER = 'DEVICE_NO_PRINTER',
    
    // Erros Genéricos de UI
    CONFIRM_DELETE = 'CONFIRM_DELETE',

    // Erros nas Senhas
    TICKET_DAILY_LIMIT = 'TICKET_DAILY_LIMIT',

    SERVICE_DELETE_IN_USE_COUNTER = 'SERVICE_DELETE_IN_USE_COUNTER',
    SERVICE_DELETE_IN_USE_KIOSK = 'SERVICE_DELETE_IN_USE_KIOSK',
    SESSION_EXPIRED = 'SESSION_EXPIRED'
}

// O Dicionário de Traduções (Apenas PT-PT por agora)
const ptMessages: Record<ErrorKey, string> = {
    CONTEXT_NOT_FOUND: 'O contexto de utilizador não foi encontrado. Por favor, volte a iniciar sessão.',
    ACCESS_DENIED: 'Acesso negado. Não tem permissão para realizar esta ação.',
    SAVE_FAILED: 'Falha ao guardar os dados. Verifique a sua conexão.',
    NETWORK_ERROR: 'Ocorreu um erro de rede. Por favor, tente novamente mais tarde.',
    
    QUEUE_NO_SERVICES: 'Por favor, selecione um balcão e pelo menos um serviço.',
    QUEUE_DAILY_LIMIT: 'O limite diário de senhas foi atingido para este serviço.',
    QUEUE_SUSPENDED: 'A emissão de senhas está suspensa para este serviço.',
    QUEUE_ALREADY_ACTIVE: 'Já existe uma sessão de trabalho ativa.',
    QUEUE_OLD_TICKET: 'Não é possível re-chamar senhas de dias anteriores.',

    FEEDBACK_ALREADY_SUBMITTED: 'Esta senha já foi avaliada. Obrigado!',
    
    DEVICE_QR_FAIL: 'Erro ao exportar imagem. Verifique a consola.',
    DEVICE_QZ_ERROR: 'Não foi possível comunicar com o QZ Tray. Verifique se o software está a correr.',
    DEVICE_NO_PRINTER: 'A impressora não está configurada neste quiosque.',

    CONFIRM_DELETE: 'Tem a certeza que deseja eliminar este item? Esta ação é irreversível.',

    TICKET_DAILY_LIMIT: 'Foi atigindo o limite diário de senhas para este serviço.',

    SERVICE_DELETE_IN_USE_COUNTER: 'Este serviço não pode ser apagado porque está a ser usado por balcões de atendimento.',
    SERVICE_DELETE_IN_USE_KIOSK: 'Este serviço não pode ser apagado porque está configurado em quiosques ativos.',
    SESSION_EXPIRED: 'A sua sessão expirou. Por favor, volte a entrar.'    
  
};

// --- Função de Tradução ---
export const tError = (key: ErrorKey): string => {
    // Simples: Devolve a tradução ou a chave (se a tradução faltar)
    return ptMessages[key] || `[ERRO: ${key}]`;
};

export const translateTemplateType = (type: string | EmailTemplateType): string => {
  switch (type) {
    // ... (os teus casos existentes) ...

    // ADICIONA ESTES:
    case EmailTemplateType.SUPPORT_TICKET_CREATED:
      return 'Suporte: Novo Pedido (Confirmação ao Utilizador)';
    
    case EmailTemplateType.SUPPORT_NEW_REPLY:
      return 'Suporte: Nova Resposta (Notificação)';
    
    case EmailTemplateType.SUPPORT_TICKET_CLOSED:
      return 'Suporte: Pedido Concluído';

    case EmailTemplateType.SCHEDULING_CONFIRMATION:
      return 'Agendamentos: Confirmação de Marcação';

    case EmailTemplateType.SCHEDULING_CANCELLATION:
      return 'Agendamentos: Aviso de Cancelamento';

    case EmailTemplateType.SCHEDULING_REMINDER:
      return 'Agendamentos: Lembrete Automático (24h)';

    case EmailTemplateType.EVENT_REGISTRATION_APPROVED:
      return 'Eventos: Inscrição Aprovada (Envio de Bilhete)';

    case EmailTemplateType.EVENT_REMINDER_24H:
      return 'Eventos: Lembrete Automático (24h antes)';

    case EmailTemplateType.EVENT_FEEDBACK_REQUEST:
      return 'Eventos: Pedido de Feedback (Pós-evento)';     

    default:
      return type;
  }
};