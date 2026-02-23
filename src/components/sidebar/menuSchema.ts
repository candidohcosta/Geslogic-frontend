// src/components/sidebar/menuSchema.ts
import {
  Activity, Settings, ShieldUser, BriefcaseBusiness, Send, FileSliders,
  HeartPulse, DatabaseBackup, Files, Database, ClipboardList, Users,
  SquarePlus, List, Star, Ticket, Contact, OctagonMinus, Blocks,
  Computer, Tablet, Tv, UserCog, MonitorCheck, Activity as ActivityIcon,
  ChartBarStacked, Mails, CalendarDays, CalendarRange,
} from 'lucide-react';
import type { FeatureKey } from '../../lib/authz';

export interface MenuItem {
  label: string;
  to: string;
  icon: any;
  features?: FeatureKey[];     // Autorizações necessárias para o item
}

export interface MenuGroup {
  id: string;
  title: string;
  icon: any;
  // Nota: não obrigamos features no grupo; filtramos pelos itens
  items: MenuItem[];
  direct?: boolean; // indica que deve ser renderizado como link direto quando tiver 1 item
}

export const menuSchema: MenuGroup[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',  // sem titulo = não aparece como grupo, mas simplesmente como item isolado
    icon: Activity,
    direct: true,
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: Activity },
    ],
  },

  {
    id: 'platform',
    title: 'Gestão da Plataforma',
    icon: Settings,
    items: [
      { label: 'Administradores', to: '/platform-admins', icon: ShieldUser, features: ['platform:admins.manage'] },
      { label: 'Empresas', to: '/companies/list', icon: BriefcaseBusiness, features: ['companies:access'] },
      { label: 'Logs de Emails', to: '/sent-emails-log', icon: Send, features: ['platform:access'] },
      { label: 'Logs do Sistema', to: '/logs', icon: FileSliders, features: ['system:logs'] },
      { label: 'Saúde do Sistema', to: '/system-health', icon: HeartPulse, features: ['system:health'] },
      { label: 'Backups', to: '/backups', icon: DatabaseBackup, features: ['system:backups.view'] },
      { label: 'Gestão de Ficheiros', to: '/admin/file-manager', icon: Files, features: ['system:file-manager'] },
      { label: 'Gestão de BD', to: '/admin/db-console', icon: Database, features: ['system:db-console'] },
      { label: 'Configurações', to: '/admin/platform-email-signature', icon: Settings, features: ['platform:settings'] },
      // (quando existir)
      // { label: 'Billing & Subscrições', to: '/platform/billing-center', icon: CreditCard, features: ['billing:center'] },
    ],
  },

  {
    id: 'events',
    title: 'Gestão de Eventos',
    icon: ClipboardList,
    items: [
      { label: 'Operadores / Staff', to: '/event-staff', icon: Users, features: ['events:staff.manage'] },
      { label: 'Criar Evento', to: '/events/create', icon: SquarePlus, features: ['events:create'] },
      { label: 'Listar Eventos', to: '/events/list', icon: List, features: ['events:access'] },
      { label: 'Auditoria de Satisfação', to: '/events/feedback', icon: Star, features: ['events:access'] },
    ],
  },

  {
    id: 'queues',
    title: 'Gestão de senhas',
    icon: Ticket,
    items: [
      { label: 'Operadores', to: '/operators', icon: Users, features: ['queues:admin'] },
      { label: 'Tipos de Utente', to: '/user-types', icon: Contact, features: ['queues:admin'] },
      { label: 'Regras de Prioridade', to: '/schedules', icon: OctagonMinus, features: ['queues:admin'] },
      { label: 'Serviços de Atendimento', to: '/services', icon: Blocks, features: ['queues:admin'] },
      { label: 'Balcões de Atendimento', to: '/counters', icon: Computer, features: ['queues:admin'] },
      { label: 'Quiosques', to: '/kiosks', icon: Tablet, features: ['queues:admin'] },
      { label: 'Displays', to: '/displays', icon: Tv, features: ['queues:admin'] },

      { label: 'Iniciar sessão', to: '/operator/setup', icon: UserCog, features: ['operator:session'] },
      { label: 'Sessões Ativas', to: '/operator-sessions', icon: MonitorCheck, features: ['queues:access'] },
      { label: 'Monitorização de dispositivos', to: '/devices-monitor', icon: ActivityIcon, features: ['queues:access'] },
      { label: 'Estatísticas', to: '/dashboard/queues', icon: ChartBarStacked, features: ['queues:stats'] },
      { label: 'Auditoria de Satisfação', to: '/feedback-auditory', icon: Star, features: ['queues:access'] },
    ],
  },

  {
    id: 'scheduling',
    title: 'Agendamentos',
    icon: CalendarDays,
    items: [
      { label: 'Calendário Visual', to: '/scheduling/calendar', icon: CalendarRange, features: ['scheduling:calendar'] },
      { label: 'Lista Diária', to: '/scheduling/appointments', icon: List, features: ['scheduling:appointments'] },
      { label: 'Recursos', to: '/scheduling/resources', icon: Users, features: ['scheduling:resources'] },
      { label: 'Perfis de Serviço', to: '/scheduling/profiles', icon: Settings, features: ['scheduling:profiles'] },
    ],
  },

  {
    id: 'general',
    title: 'Gerais',
    icon: Mails,
    items: [
      { label: 'Templates de Email', to: '/email-templates', icon: Mails, features: ['general:email-templates'] },
      { label: 'Política de Privacidade', to: '/policy-documents', icon: ShieldUser, features: ['general:policy-documents'] },
    ],
  },

  {
    id: 'participant',
    title: 'Participante',
    icon: ActivityIcon,
    items: [
      { label: 'Meus Eventos', to: '/events/list', icon: ActivityIcon, features: ['participant:events'] },
    ],
  },

  {
    id: 'operator',
    title: 'Operador',
    icon: Computer,
    items: [
      { label: 'Iniciar Sessão de Atendimento', to: '/operator/setup', icon: Computer, features: ['operator:session'] },
    ],
  },
];