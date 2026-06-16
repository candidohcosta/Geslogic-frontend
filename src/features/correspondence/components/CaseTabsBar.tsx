// frontend/src/features/correspondence/components/CaseTabsBar.tsx

import { FileText, Inbox, Paperclip, Send, Clock } from 'lucide-react';

export type CaseTab =
  | 'overview'
  | 'inbound'
  | 'documents'
  | 'outbound'
  | 'history';

export function CaseTabsBar({
  active,
  onChange,
}: {
  active: CaseTab;
  onChange: (t: CaseTab) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Tab id="overview" icon={FileText} label="Visão Geral" {...{ active, onChange }} />
      <Tab id="inbound" icon={Inbox} label="Entradas" {...{ active, onChange }} />
      <Tab id="documents" icon={Paperclip} label="Documentos" {...{ active, onChange }} />
      <Tab id="outbound" icon={Send} label="Saídas" {...{ active, onChange }} />
      <Tab id="history" icon={Clock} label="Histórico" {...{ active, onChange }} />
    </div>
  );
}

function Tab({ id, label, icon: Icon, active, onChange }: any) {
  return (
    <button
      onClick={() => onChange(id)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
        active === id
          ? 'bg-brand-50 text-brand-700'
          : 'text-gray-600'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}