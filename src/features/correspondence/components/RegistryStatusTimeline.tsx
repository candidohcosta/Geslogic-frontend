// frontend/srv/features/correspondence/components/RegistryStatusTimeline.tsx

import {
  CheckCircle,
  XCircle,
  PauseCircle,
  Send,
  FilePlus,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, any> = {
  PENDING: { name: 'Pendente', icon: FilePlus, color: 'text-gray-500', bg: 'bg-gray-100' },
  ON_HOLD: { name: 'Em Espera', icon: PauseCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
  REJECTED: { name: 'Rejeitado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  ASSOCIATED: { name: 'Associado a expediente', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },

  DRAFT: { name: 'Rascunho', icon: FilePlus, color: 'text-gray-500', bg: 'bg-gray-100' },
  SENT: { name: 'Enviado', icon: Send, color: 'text-blue-600', bg: 'bg-blue-100' },
  CANCELLED: { name: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
};

// ✅ helper badge
function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {};
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded font-medium ${config.bg} ${config.color}`}
    >
      {config.name || status}
    </span>
  );
}

function formatRelative(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;

  if (hours < 48) return `há 1 dias e ${hours-24}h`;
  if (hours < 72) return `há 2 dias e ${hours-48}h`;
  if (hours < 96) return `há 3 dias e ${hours-72}h`;

  return new Date(date).toLocaleDateString();
}

function getDayGroup(date: string) {
  const d = new Date(date);
  const today = new Date();

  const diffDays = Math.floor(
    (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';

  return d.toLocaleDateString();
}

export default function RegistryStatusTimeline({ items }: any) {

const grouped = items.reduce((acc: any, item: any) => {
  const group = getDayGroup(item.changedAt);

  if (!acc[group]) acc[group] = [];
  acc[group].push(item);

  return acc;
}, {});


  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <span className="text-sm">
          Ainda não há histórico
        </span>
      </div>
    );
  }

return (
  <div className="space-y-4">

    {Object.entries(grouped).map(([group, groupItems]: any) => (

      <div key={group} className="space-y-3">

        {/* ✅ título do grupo */}
        <div className="text-xs text-gray-500 font-semibold mt-4 mb-2">
          {group.toUpperCase()}
        </div>

        {/* ✅ itens do grupo */}
        {groupItems.map((h: any, idx: number) => {
          const config = STATUS_CONFIG[h.toStatus] || {};
          const Icon = config.icon || FilePlus;

          return (
            <div
              key={idx}
              className="flex gap-3 opacity-0 animate-fadeIn"
              style={{
                animationDelay: `${idx * 40}ms`,
                animationFillMode: 'forwards',
              }}
            >
              {/* linha */}
              <div className="flex flex-col items-center">
                <Icon className={`w-5 h-5 ${config.color}`} />

                {idx !== groupItems.length - 1 && (
                  <div className="w-px h-full bg-gray-300" />
                )}
              </div>

              {/* conteúdo */}
              <div className="flex-1 space-y-0.5">

                {/* linha principal */}
                <div className="text-sm font-medium text-gray-800 flex items-center gap-2 flex-wrap mt-0.5">

                  {h.fromStatus ? (
                    <>
                      <StatusBadge status={h.fromStatus} />
                      <span className="text-gray-400">→</span>
                      <StatusBadge status={h.toStatus} />
                    </>
                  ) : (
                    <StatusBadge status={h.toStatus} />
                  )}

                  {/* ✅ última ação (só no primeiro item GLOBAL) */}
                  {group === Object.keys(grouped)[0] && idx === 0 && (
                    <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      última ação
                    </span>
                  )}

                </div>

                {/* comentário */}
                {h.comment && (
                  <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                    {h.comment}
                  </div>
                )}

                {/* metadados */}
                <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">

                  {h.changedByUserName && (
                    <span>
                      por{' '}
                      <span className="font-medium text-gray-600">
                        {h.changedByUserName}
                      </span>
                    </span>
                  )}

                  <span>•</span>

                  <span>
                    {formatRelative(h.changedAt)}
                  </span>

                </div>

              </div>
            </div>
          );
        })}

      </div>
    ))}

  </div>
);
}