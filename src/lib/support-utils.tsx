// frontend/src/lib/support-utils.tsx
import React from 'react';
import { SupportTicketStatus, SupportTicketPriority, SupportTicketTargetLevel } from '../types/support';
import { Badge } from '../components/ui/Badge'; // Assumo que tens este componente, ou usa spans com classes

export const getStatusLabel = (status: SupportTicketStatus) => {
  switch (status) {
    case SupportTicketStatus.OPEN: return 'Aberto';
    case SupportTicketStatus.IN_PROGRESS: return 'Em Análise';
    case SupportTicketStatus.WAITING_RESPONSE: return 'Aguarda Resposta';
    case SupportTicketStatus.ESCALATED: return 'Escalonado (Plataforma)';
    case SupportTicketStatus.RESOLVED: return 'Resolvido';
    case SupportTicketStatus.CLOSED: return 'Fechado';
    default: return status;
  }
};

export const getStatusBadgeColor = (status: SupportTicketStatus) => {
  switch (status) {
    case SupportTicketStatus.OPEN: return 'bg-blue-100 text-blue-800 border-blue-200';
    case SupportTicketStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case SupportTicketStatus.WAITING_RESPONSE: return 'bg-purple-100 text-purple-800 border-purple-200';
    case SupportTicketStatus.ESCALATED: return 'bg-orange-100 text-orange-800 border-orange-200';
    case SupportTicketStatus.RESOLVED: return 'bg-green-100 text-green-800 border-green-200';
    case SupportTicketStatus.CLOSED: return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getPriorityLabel = (priority: SupportTicketPriority) => {
  switch (priority) {
    case SupportTicketPriority.LOW: return 'Baixa';
    case SupportTicketPriority.NORMAL: return 'Normal';
    case SupportTicketPriority.HIGH: return 'Alta';
    case SupportTicketPriority.CRITICAL: return 'Crítica';
    default: return priority;
  }
};

export const getPriorityBadgeColor = (priority: SupportTicketPriority) => {
  switch (priority) {
    case SupportTicketPriority.LOW: return 'bg-slate-100 text-slate-600';
    case SupportTicketPriority.NORMAL: return 'bg-blue-50 text-blue-600';
    case SupportTicketPriority.HIGH: return 'bg-orange-50 text-orange-600 font-medium';
    case SupportTicketPriority.CRITICAL: return 'bg-red-100 text-red-700 font-bold border-red-200';
    default: return 'bg-gray-100';
  }
};

export const StatusBadge = ({ status }: { status: SupportTicketStatus }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(status)}`}>
    {getStatusLabel(status)}
  </span>
);

export const PriorityBadge = ({ priority }: { priority: SupportTicketPriority }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border border-transparent ${getPriorityBadgeColor(priority)}`}>
    {getPriorityLabel(priority)}
  </span>
);